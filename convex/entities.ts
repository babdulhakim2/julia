import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { requireWorkspaceMember } from "./lib/auth";

/**
 * Lists active entities for a workspace.
 */
export const listByWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.db
      .query("entities")
      .withIndex("by_workspaceId_and_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "active"),
      )
      .take(100);
  },
});

/**
 * Creates a new entity in a workspace.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    kind: v.union(
      v.literal("business"),
      v.literal("property"),
      v.literal("vehicle"),
      v.literal("personal"),
    ),
    name: v.string(),
    subtitle: v.optional(v.string()),
    icon: v.string(),
    color: v.string(),
    identifiers: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireWorkspaceMember(ctx, args.workspaceId);

    const now = Date.now();
    const normalizedName = args.name.toLowerCase().trim();

    return await ctx.db.insert("entities", {
      workspaceId: args.workspaceId,
      kind: args.kind,
      status: "active",
      name: args.name,
      normalizedName,
      subtitle: args.subtitle,
      icon: args.icon,
      color: args.color,
      identifiers: args.identifiers ?? {},
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Soft-deletes an entity by setting status to "archived".
 */
export const archive = mutation({
  args: { entityId: v.id("entities") },
  handler: async (ctx, args) => {
    const entity = await ctx.db.get(args.entityId);
    if (!entity) throw new Error("Entity not found");
    await requireWorkspaceMember(ctx, entity.workspaceId);

    await ctx.db.patch(args.entityId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Returns counts of related data for the entity deletion confirmation dialog.
 */
export const getCascadeInfo = query({
  args: { entityId: v.id("entities") },
  handler: async (ctx, args) => {
    const entity = await ctx.db.get(args.entityId);
    if (!entity) throw new Error("Entity not found");
    await requireWorkspaceMember(ctx, entity.workspaceId);

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_entityId_and_status", (q) =>
        q.eq("entityId", args.entityId),
      )
      .take(500);
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_workspaceId_and_entityId", (q) =>
        q.eq("workspaceId", entity.workspaceId).eq("entityId", args.entityId),
      )
      .take(500);
    const events = await ctx.db
      .query("events")
      .withIndex("by_entityId_and_startAt", (q) =>
        q.eq("entityId", args.entityId),
      )
      .take(500);

    return {
      entityName: entity.name,
      entityIcon: entity.icon,
      entityColor: entity.color,
      documentCount: docs.length,
      folderCount: folders.length,
      eventCount: events.length,
    };
  },
});

/**
 * Deletes an entity and all related data in a cascading fashion.
 * Processes up to 20 documents per transaction, self-scheduling if more remain.
 */
export const deleteWithCascade = mutation({
  args: { entityId: v.id("entities") },
  handler: async (ctx, args) => {
    const entity = await ctx.db.get(args.entityId);
    if (!entity) throw new Error("Entity not found");
    await requireWorkspaceMember(ctx, entity.workspaceId);

    // Batch delete documents and their children
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_entityId_and_status", (q) =>
        q.eq("entityId", args.entityId),
      )
      .take(20);

    for (const doc of docs) {
      // Delete doc files (+ storage blobs)
      const files = await ctx.db
        .query("documentFiles")
        .withIndex("by_documentId_and_pageNumber", (q) =>
          q.eq("documentId", doc._id),
        )
        .take(50);
      for (const f of files) {
        await ctx.storage.delete(f.storageId);
        if (f.thumbnailStorageId) await ctx.storage.delete(f.thumbnailStorageId);
        await ctx.db.delete(f._id);
      }
      // Delete text chunks
      const chunks = await ctx.db
        .query("documentTextChunks")
        .withIndex("by_documentId_and_chunkIndex", (q) =>
          q.eq("documentId", doc._id),
        )
        .take(100);
      for (const c of chunks) await ctx.db.delete(c._id);
      // Delete processing jobs
      const jobs = await ctx.db
        .query("processingJobs")
        .withIndex("by_documentId", (q) => q.eq("documentId", doc._id))
        .take(50);
      for (const j of jobs) await ctx.db.delete(j._id);
      // Delete doc-level events + reminders
      const docEvents = await ctx.db
        .query("events")
        .withIndex("by_documentId", (q) => q.eq("documentId", doc._id))
        .take(50);
      for (const e of docEvents) await ctx.db.delete(e._id);
      const docReminders = await ctx.db
        .query("reminders")
        .withIndex("by_documentId", (q) => q.eq("documentId", doc._id))
        .take(50);
      for (const r of docReminders) await ctx.db.delete(r._id);
      // Delete the document
      await ctx.db.delete(doc._id);
    }

    // If more docs remain, self-schedule and return early
    if (docs.length === 20) {
      await ctx.scheduler.runAfter(
        0,
        api.entities.deleteWithCascade,
        { entityId: args.entityId },
      );
      return { complete: false };
    }

    // Delete folders
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_workspaceId_and_entityId", (q) =>
        q.eq("workspaceId", entity.workspaceId).eq("entityId", args.entityId),
      )
      .take(100);
    for (const f of folders) await ctx.db.delete(f._id);

    // Delete entity-level events
    const events = await ctx.db
      .query("events")
      .withIndex("by_entityId_and_startAt", (q) =>
        q.eq("entityId", args.entityId),
      )
      .take(100);
    for (const ev of events) await ctx.db.delete(ev._id);

    // Delete usage events
    const usage = await ctx.db
      .query("usageEvents")
      .withIndex("by_entityId_and_occurredAt", (q) =>
        q.eq("entityId", args.entityId),
      )
      .take(100);
    for (const u of usage) await ctx.db.delete(u._id);

    // Delete the entity
    await ctx.db.delete(args.entityId);
    return { complete: true };
  },
});
