import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOwnedDocument, requireWorkspaceMember } from "./lib/auth";
import type { Id } from "./_generated/dataModel";
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

const documentStatus = v.union(
  v.literal("processing"),
  v.literal("needs_review"),
  v.literal("due_soon"),
  v.literal("overdue"),
  v.literal("scheduled"),
  v.literal("done"),
  v.literal("archived"),
);

const ingestionSource = v.union(
  v.literal("camera"),
  v.literal("upload"),
  v.literal("email"),
  v.literal("whatsapp"),
  v.literal("drive"),
);

const money = v.object({
  amountMinor: v.number(),
  currency: v.string(),
});

const extractedValue = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_MS = 7 * DAY_MS;

function statusForDueDate(
  dueAt: number | undefined,
  now: number,
): "overdue" | "due_soon" | "scheduled" {
  if (dueAt !== undefined && dueAt < now) return "overdue";
  if (dueAt !== undefined && dueAt <= now + DUE_SOON_MS) return "due_soon";
  return "scheduled";
}

function intakeRequiresDeadline(intakeCategory?: string) {
  if (!intakeCategory) return false;
  return [
    "expense.utility",
    "invoice.receivable",
    "tax.hmrc",
    "tax.council",
    "legal.licence",
    "legal.compliance",
    "vehicle.pcn",
    "vehicle.mot",
    "vehicle.insurance",
    "vehicle.tax",
    "property.tenancy",
    "property.service",
    "correspondence.council",
    "correspondence.insurance",
  ].includes(intakeCategory);
}

function statusForDocumentUpdate(
  dueAt: number | undefined,
  now: number,
  intakeCategory?: string,
): "needs_review" | "overdue" | "due_soon" | "scheduled" | "done" {
  if (dueAt !== undefined) return statusForDueDate(dueAt, now);
  if (intakeRequiresDeadline(intakeCategory)) return "needs_review";
  return "done";
}

function eventKindFor(category: string, documentType: string): "renewal" | "deadline" {
  const text = `${category} ${documentType}`.toLowerCase();
  if (text.includes("renewal") || text.includes("mot") || text.includes("insurance")) {
    return "renewal";
  }
  return "deadline";
}

/**
 * Creates a new document.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    entityId: v.optional(v.id("entities")),
    folderId: v.optional(v.id("folders")),
    captureSessionId: v.optional(v.id("captureSessions")),
    source: ingestionSource,
    status: documentStatus,
    category: documentCategory,
    intakeCategory: v.optional(v.string()),
    documentType: v.string(),
    title: v.string(),
    issuer: v.optional(v.string()),
    reference: v.optional(v.string()),
    summary: v.optional(v.string()),
    actionSummary: v.optional(v.string()),
    outcomeMessage: v.optional(v.string()),
    draftResponse: v.optional(v.string()),
    draftReason: v.optional(v.string()),
    amount: v.optional(money),
    issuedAt: v.optional(v.number()),
    dueAt: v.optional(v.number()),
    confidence: v.optional(v.number()),
    entityConfidence: v.optional(v.number()),
    needsReviewReason: v.optional(v.string()),
    extractedFields: v.optional(v.record(v.string(), extractedValue)),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireWorkspaceMember(ctx, args.workspaceId);

    const now = Date.now();
    return await ctx.db.insert("documents", {
      workspaceId: args.workspaceId,
      entityId: args.entityId,
      folderId: args.folderId,
      captureSessionId: args.captureSessionId,
      source: args.source,
      status: args.status,
      category: args.category,
      intakeCategory: args.intakeCategory,
      documentType: args.documentType,
      title: args.title,
      issuer: args.issuer,
      reference: args.reference,
      summary: args.summary,
      actionSummary: args.actionSummary,
      outcomeMessage: args.outcomeMessage,
      draftResponse: args.draftResponse,
      draftReason: args.draftReason,
      amount: args.amount,
      issuedAt: args.issuedAt,
      dueAt: args.dueAt,
      confidence: args.confidence,
      entityConfidence: args.entityConfidence,
      needsReviewReason: args.needsReviewReason,
      extractedFields: args.extractedFields ?? {},
      tags: args.tags ?? [],
      capturedAt: now,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Updates a document.
 */
export const update = mutation({
  args: {
    documentId: v.id("documents"),
    status: v.optional(documentStatus),
    entityId: v.optional(v.id("entities")),
    folderId: v.optional(v.id("folders")),
    title: v.optional(v.string()),
    category: v.optional(documentCategory),
    intakeCategory: v.optional(v.string()),
    documentType: v.optional(v.string()),
    issuer: v.optional(v.string()),
    reference: v.optional(v.string()),
    summary: v.optional(v.string()),
    actionSummary: v.optional(v.string()),
    outcomeMessage: v.optional(v.string()),
    draftResponse: v.optional(v.string()),
    draftReason: v.optional(v.string()),
    amount: v.optional(money),
    issuedAt: v.optional(v.number()),
    dueAt: v.optional(v.number()),
    confidence: v.optional(v.number()),
    entityConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const doc = await requireOwnedDocument(ctx, args.documentId);
    if (args.entityId) {
      const entity = await ctx.db.get(args.entityId);
      if (!entity || entity.workspaceId !== doc.workspaceId) {
        throw new Error("Entity not found");
      }
    }
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.workspaceId !== doc.workspaceId) {
        throw new Error("Folder not found");
      }
    }
    const { documentId, ...patch } = args;
    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    const dueAt = args.dueAt ?? doc.dueAt;
    const intakeCategory = args.intakeCategory ?? doc.intakeCategory;
    if (
      (args.dueAt !== undefined || args.intakeCategory !== undefined) &&
      args.status === undefined &&
      doc.status !== "archived"
    ) {
      updates.status = statusForDocumentUpdate(dueAt, now, intakeCategory);
    }
    await ctx.db.patch(documentId, updates);

    if (args.status === "done") {
      const events = await ctx.db
        .query("events")
        .withIndex("by_documentId", (q) => q.eq("documentId", documentId))
        .take(100);
      for (const event of events) {
        if (event.status !== "done") {
          await ctx.db.patch(event._id, { status: "done", updatedAt: now });
        }
      }

      const reminders = await ctx.db
        .query("reminders")
        .withIndex("by_documentId", (q) => q.eq("documentId", documentId))
        .take(100);
      for (const reminder of reminders) {
        if (reminder.status === "pending") {
          await ctx.db.patch(reminder._id, { status: "dismissed", updatedAt: now });
        }
      }
    }
    if (args.dueAt !== undefined && args.status !== "done") {
      await syncDeadlineArtifacts(ctx, {
        documentId,
        workspaceId: doc.workspaceId,
        entityId: args.entityId ?? doc.entityId,
        createdBy: doc.createdBy,
        dueAt: args.dueAt,
        title: args.title ?? doc.title,
        summary: args.summary ?? doc.summary,
        category: args.category ?? doc.category,
        intakeCategory,
        documentType: args.documentType ?? doc.documentType,
        now,
      });
    }
  },
});

/**
 * Permanently deletes a document and its direct derived data.
 */
export const remove = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireOwnedDocument(ctx, args.documentId);

    const files = await ctx.db
      .query("documentFiles")
      .withIndex("by_documentId_and_pageNumber", (q) =>
        q.eq("documentId", args.documentId),
      )
      .take(100);
    for (const file of files) {
      await ctx.storage.delete(file.storageId);
      if (file.thumbnailStorageId) {
        await ctx.storage.delete(file.thumbnailStorageId);
      }
      await ctx.db.delete(file._id);
    }

    const chunks = await ctx.db
      .query("documentTextChunks")
      .withIndex("by_documentId_and_chunkIndex", (q) =>
        q.eq("documentId", args.documentId),
      )
      .take(100);
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    const records = await ctx.db
      .query("bookkeepingRecords")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .take(100);
    for (const record of records) {
      await ctx.db.delete(record._id);
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .take(100);
    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .take(100);
    for (const reminder of reminders) {
      await ctx.db.delete(reminder._id);
    }

    const jobs = await ctx.db
      .query("processingJobs")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .take(100);
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }

    await ctx.db.delete(args.documentId);
  },
});

/**
 * Updates one extracted field inline without replacing the rest of the document.
 */
export const updateExtractedField = mutation({
  args: {
    documentId: v.id("documents"),
    key: v.string(),
    value: extractedValue,
  },
  handler: async (ctx, args) => {
    const doc = await requireOwnedDocument(ctx, args.documentId);
    const key = args.key.trim();
    if (!key) throw new Error("Field name is required");

    await ctx.db.patch(args.documentId, {
      extractedFields: {
        ...doc.extractedFields,
        [key]: args.value,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Returns a single document by ID.
 */
export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");
    await requireWorkspaceMember(ctx, doc.workspaceId);
    return doc;
  },
});

/**
 * Lists documents for a specific entity.
 */
export const listByEntity = query({
  args: {
    entityId: v.id("entities"),
  },
  handler: async (ctx, args) => {
    const entity = await ctx.db.get(args.entityId);
    if (!entity) throw new Error("Entity not found");
    await requireWorkspaceMember(ctx, entity.workspaceId);
    return await ctx.db
      .query("documents")
      .withIndex("by_entityId_and_status", (q) =>
        q.eq("entityId", args.entityId),
      )
      .take(50);
  },
});

/**
 * Lists all documents for a workspace.
 */
export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.db
      .query("documents")
      .withIndex("by_workspaceId_and_status", (q) =>
        q.eq("workspaceId", args.workspaceId),
      )
      .take(100);
  },
});

async function syncDeadlineArtifacts(
  ctx: MutationCtx,
  args: {
    documentId: Id<"documents">;
    workspaceId: Id<"workspaces">;
    entityId?: Id<"entities">;
    createdBy: Id<"users">;
    dueAt: number;
    title: string;
    summary?: string;
    category: string;
    intakeCategory?: string;
    documentType: string;
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
  let eventId = activeEvent?._id;
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

  const reminderAt = Math.max(args.now, args.dueAt - 5 * DAY_MS);
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
