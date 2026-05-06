import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

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
  if (dueAt !== undefined && dueAt < now) return "overdue";
  if (dueAt !== undefined && dueAt <= now + DUE_SOON_MS) return "due_soon";
  if (needsReview) return "needs_review";
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
 * Updates an existing document after a manual AI reassessment.
 */
export const updateFromExtraction = internalMutation({
  args: {
    documentId: v.id("documents"),
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
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    const now = Date.now();
    const amount =
      args.amountMinor != null
        ? { amountMinor: args.amountMinor, currency: args.currency ?? doc.amount?.currency ?? "GBP" }
        : doc.amount;
    const issuedAt = parseIsoDate(args.issuedDate) ?? doc.issuedAt;
    const dueAt = parseIsoDate(args.dueDate) ?? doc.dueAt;
    const issuer = args.issuer ?? doc.issuer;
    const reference = args.reference ?? doc.reference;
    const summary = args.summary ?? doc.summary;
    const entityId = args.entityId ?? doc.entityId;
    const locked = doc.status === "done" || doc.status === "archived";
    const status = locked ? doc.status : statusForDueDate(args.needsReview, dueAt, now);

    const changedFields = changedDocumentFields(doc, {
      title: args.title,
      category: args.category,
      documentType: args.documentType,
      issuer,
      reference,
      summary,
      entityId,
      status,
      amount,
      issuedAt,
      dueAt,
    });

    const patch: Partial<Doc<"documents">> = {
      status,
      category: args.category,
      documentType: args.documentType,
      title: args.title,
      issuer,
      reference,
      summary,
      amount,
      issuedAt,
      dueAt,
      confidence: args.confidence,
      needsReviewReason: args.needsReview ? args.needsReviewReason : undefined,
      extractedFields: args.extractedFields,
      tags: args.tags,
      updatedAt: now,
    };
    if (entityId) patch.entityId = entityId;
    await ctx.db.patch(args.documentId, patch);

    await syncDeadlineArtifacts(ctx, {
      documentId: args.documentId,
      workspaceId: doc.workspaceId,
      entityId,
      createdBy: doc.createdBy,
      dueAt,
      title: args.title,
      summary,
      category: args.category,
      documentType: args.documentType,
      locked,
      now,
    });

    return { changedFields };
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

/**
 * Clears old vector chunks before re-embedding a reassessed document.
 */
export const clearTextChunksForDocument = internalMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("documentTextChunks")
      .withIndex("by_documentId_and_chunkIndex", (q) =>
        q.eq("documentId", args.documentId),
      )
      .take(100);
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }
  },
});

function changedDocumentFields(
  doc: Doc<"documents">,
  next: {
    title: string;
    category: string;
    documentType: string;
    issuer?: string;
    reference?: string;
    summary?: string;
    entityId?: Id<"entities">;
    status: Doc<"documents">["status"];
    amount?: Doc<"documents">["amount"];
    issuedAt?: number;
    dueAt?: number;
  },
) {
  const changed: string[] = [];
  if (doc.title !== next.title) changed.push("title");
  if (doc.category !== next.category) changed.push("category");
  if (doc.documentType !== next.documentType) changed.push("type");
  if ((doc.issuer ?? "") !== (next.issuer ?? "")) changed.push("issuer");
  if ((doc.reference ?? "") !== (next.reference ?? "")) changed.push("reference");
  if ((doc.summary ?? "") !== (next.summary ?? "")) changed.push("summary");
  if ((doc.entityId ?? "") !== (next.entityId ?? "")) changed.push("entity");
  if (doc.status !== next.status) changed.push("status");
  if ((doc.issuedAt ?? 0) !== (next.issuedAt ?? 0)) changed.push("issued date");
  if ((doc.dueAt ?? 0) !== (next.dueAt ?? 0)) changed.push("due date");
  if ((doc.amount?.amountMinor ?? 0) !== (next.amount?.amountMinor ?? 0)) changed.push("amount");
  return changed;
}

async function syncDeadlineArtifacts(
  ctx: MutationCtx,
  args: {
    documentId: Id<"documents">;
    workspaceId: Id<"workspaces">;
    entityId?: Id<"entities">;
    createdBy: Id<"users">;
    dueAt?: number;
    title: string;
    summary?: string;
    category: string;
    documentType: string;
    locked: boolean;
    now: number;
  },
) {
  const events = await ctx.db
    .query("events")
    .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
    .take(20);
  const reminders = await ctx.db
    .query("reminders")
    .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
    .take(20);

  if (!args.dueAt || args.locked) {
    if (!args.dueAt) {
      for (const event of events) {
        if (event.status === "scheduled") {
          await ctx.db.patch(event._id, { status: "cancelled", updatedAt: args.now });
        }
      }
      for (const reminder of reminders) {
        if (reminder.status === "pending") {
          await ctx.db.patch(reminder._id, { status: "dismissed", updatedAt: args.now });
        }
      }
    }
    return;
  }

  const activeEvent = events.find((event) => event.status !== "cancelled");
  const eventPatch = {
    entityId: args.entityId,
    kind: eventKindFor(args.category, args.documentType),
    title: args.title,
    notes: args.summary,
    startAt: args.dueAt,
    allDay: true,
    updatedAt: args.now,
  } as const;
  let eventId: Id<"events"> | undefined = activeEvent?._id;
  if (activeEvent) {
    if (activeEvent.status !== "done") {
      await ctx.db.patch(activeEvent._id, eventPatch);
    }
  } else {
    eventId = await ctx.db.insert("events", {
      workspaceId: args.workspaceId,
      entityId: args.entityId,
      documentId: args.documentId,
      kind: eventKindFor(args.category, args.documentType),
      status: "scheduled",
      title: args.title,
      notes: args.summary,
      startAt: args.dueAt,
      allDay: true,
      createdBy: args.createdBy,
      createdAt: args.now,
      updatedAt: args.now,
    });
  }

  const reminderAt = Math.max(args.now, args.dueAt - 2 * DAY_MS);
  const pendingReminder = reminders.find((reminder) => reminder.status === "pending");
  if (pendingReminder) {
    await ctx.db.patch(pendingReminder._id, {
      entityId: args.entityId,
      eventId,
      remindAt: reminderAt,
      title: args.title,
      body: args.summary ?? `Deadline for ${args.title}`,
      updatedAt: args.now,
    });
  } else {
    await ctx.db.insert("reminders", {
      workspaceId: args.workspaceId,
      entityId: args.entityId,
      documentId: args.documentId,
      eventId,
      channel: "in_app",
      status: "pending",
      remindAt: reminderAt,
      title: args.title,
      body: args.summary ?? `Deadline for ${args.title}`,
      createdBy: args.createdBy,
      createdAt: args.now,
      updatedAt: args.now,
    });
  }
}
