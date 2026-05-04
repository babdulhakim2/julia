import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOwnedDocument, requireWorkspaceMember } from "./lib/auth";

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
    documentType: v.string(),
    title: v.string(),
    issuer: v.optional(v.string()),
    reference: v.optional(v.string()),
    summary: v.optional(v.string()),
    amount: v.optional(money),
    issuedAt: v.optional(v.number()),
    dueAt: v.optional(v.number()),
    confidence: v.optional(v.number()),
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
      documentType: args.documentType,
      title: args.title,
      issuer: args.issuer,
      reference: args.reference,
      summary: args.summary,
      amount: args.amount,
      issuedAt: args.issuedAt,
      dueAt: args.dueAt,
      confidence: args.confidence,
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
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwnedDocument(ctx, args.documentId);
    const { documentId, ...patch } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    await ctx.db.patch(documentId, updates);

    if (args.status === "done") {
      const now = Date.now();
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
