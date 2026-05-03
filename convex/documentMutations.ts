import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const documentCategory = v.union(
  v.literal("finance"),
  v.literal("tax"),
  v.literal("utilities"),
  v.literal("legal"),
  v.literal("insurance"),
  v.literal("fines"),
  v.literal("people"),
  v.literal("operations"),
  v.literal("other"),
);

const ingestionSource = v.union(
  v.literal("camera"),
  v.literal("upload"),
  v.literal("email"),
  v.literal("whatsapp"),
  v.literal("drive"),
);

const extractedValue = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_MS = 7 * DAY_MS;

function parseIsoDate(date: string | undefined) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const [year, month, day] = date.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day, 12);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function statusForDueDate(
  needsReview: boolean,
  dueAt: number | undefined,
  now: number,
): "needs_review" | "overdue" | "due_soon" | "scheduled" {
  if (needsReview) return "needs_review";
  if (!dueAt) return "scheduled";
  if (dueAt < now) return "overdue";
  if (dueAt <= now + DUE_SOON_MS) return "due_soon";
  return "scheduled";
}

function eventKindFor(category: string, documentType: string): "renewal" | "deadline" {
  const text = `${category} ${documentType}`.toLowerCase();
  if (text.includes("renewal") || text.includes("mot") || text.includes("insurance")) {
    return "renewal";
  }
  return "deadline";
}

/**
 * Creates a document from AI extraction results.
 */
export const createFromExtraction = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    captureSessionId: v.optional(v.id("captureSessions")),
    source: ingestionSource,
    createdBy: v.id("users"),
    // Extraction result fields
    title: v.string(),
    category: documentCategory,
    documentType: v.string(),
    issuer: v.optional(v.string()),
    reference: v.optional(v.string()),
    summary: v.optional(v.string()),
    entityId: v.optional(v.id("entities")),
    confidence: v.optional(v.number()),
    needsReview: v.boolean(),
    needsReviewReason: v.optional(v.string()),
    amountMinor: v.optional(v.number()),
    currency: v.optional(v.string()),
    issuedDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    extractedFields: v.record(v.string(), extractedValue),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const amount =
      args.amountMinor != null
        ? { amountMinor: args.amountMinor, currency: args.currency ?? "GBP" }
        : undefined;

    const issuedAt = parseIsoDate(args.issuedDate);
    const dueAt = parseIsoDate(args.dueDate);
    const status = statusForDueDate(args.needsReview, dueAt, now);

    const documentId = await ctx.db.insert("documents", {
      workspaceId: args.workspaceId,
      entityId: args.entityId,
      captureSessionId: args.captureSessionId,
      source: args.source,
      status,
      category: args.category,
      documentType: args.documentType,
      title: args.title,
      issuer: args.issuer,
      reference: args.reference,
      summary: args.summary,
      amount,
      issuedAt,
      dueAt,
      confidence: args.confidence,
      needsReviewReason: args.needsReviewReason,
      extractedFields: args.extractedFields,
      tags: args.tags,
      capturedAt: now,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    let eventId;
    if (dueAt) {
      eventId = await ctx.db.insert("events", {
        workspaceId: args.workspaceId,
        entityId: args.entityId,
        documentId,
        kind: eventKindFor(args.category, args.documentType),
        status: "scheduled",
        title: args.title,
        notes: args.summary,
        startAt: dueAt,
        allDay: true,
        createdBy: args.createdBy,
        createdAt: now,
        updatedAt: now,
      });

      const reminderAt = Math.max(now, dueAt - 2 * DAY_MS);
      await ctx.db.insert("reminders", {
        workspaceId: args.workspaceId,
        entityId: args.entityId,
        documentId,
        eventId,
        channel: "in_app",
        status: "pending",
        remindAt: reminderAt,
        title: args.title,
        body: args.summary ?? `Deadline for ${args.title}`,
        createdBy: args.createdBy,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (args.captureSessionId) {
      const sessionPatch: Record<string, unknown> = {
        status: args.needsReview ? "needs_review" : "filed",
        updatedAt: now,
      };
      if (!args.needsReview) {
        sessionPatch.completedAt = now;
      }
      await ctx.db.patch(args.captureSessionId, sessionPatch);
    }

    await ctx.db.insert("usageEvents", {
      workspaceId: args.workspaceId,
      userId: args.createdBy,
      entityId: args.entityId,
      documentId,
      feature: "document_processed",
      quantity: 1,
      unit: "count",
      metadata: {
        category: args.category,
        documentType: args.documentType,
        needsReview: args.needsReview,
      },
      occurredAt: now,
      createdAt: now,
    });

    return documentId;
  },
});

/**
 * Links a document file to a document.
 */
export const linkFileToDocument = internalMutation({
  args: {
    fileId: v.id("documentFiles"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      documentId: args.documentId,
    });
  },
});

/**
 * Stores a text chunk with its embedding vector.
 */
export const storeTextChunk = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    entityId: v.optional(v.id("entities")),
    documentId: v.id("documents"),
    documentCategory,
    chunkIndex: v.number(),
    text: v.string(),
    embeddingModel: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("documentTextChunks", {
      workspaceId: args.workspaceId,
      entityId: args.entityId,
      documentId: args.documentId,
      documentCategory: args.documentCategory,
      chunkIndex: args.chunkIndex,
      text: args.text,
      embeddingModel: args.embeddingModel,
      embedding: args.embedding,
      createdAt: Date.now(),
    });
  },
});
