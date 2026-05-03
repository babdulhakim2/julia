import { internalMutation, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceMember } from "./lib/auth";

/**
 * Creates a new capture session.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    source: v.union(
      v.literal("camera"),
      v.literal("upload"),
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("drive"),
    ),
    pageCount: v.number(),
    entityId: v.optional(v.id("entities")),
  },
  handler: async (ctx, args) => {
    const user = await requireWorkspaceMember(ctx, args.workspaceId);
    if (args.entityId) {
      const entity = await ctx.db.get(args.entityId);
      if (!entity || entity.workspaceId !== args.workspaceId) {
        throw new Error("Entity not found");
      }
    }

    const now = Date.now();
    return await ctx.db.insert("captureSessions", {
      workspaceId: args.workspaceId,
      source: args.source,
      status: "uploading",
      createdBy: user._id,
      entityId: args.entityId,
      pageCount: args.pageCount,
      createdAt: now,
      updatedAt: now,
      submittedAt: now,
    });
  },
});

/**
 * Updates the status of a capture session.
 */
export const updateStatus = mutation({
  args: {
    sessionId: v.id("captureSessions"),
    status: v.union(
      v.literal("draft"),
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("needs_review"),
      v.literal("filed"),
      v.literal("failed"),
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Capture session not found");
    await requireWorkspaceMember(ctx, session.workspaceId);

    const now = Date.now();
    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };
    if (args.errorMessage !== undefined) {
      patch.errorMessage = args.errorMessage;
    }
    if (args.status === "filed") {
      patch.completedAt = now;
    }

    await ctx.db.patch(args.sessionId, patch);
  },
});

export const updateInternal = internalMutation({
  args: {
    sessionId: v.id("captureSessions"),
    status: v.union(
      v.literal("draft"),
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("needs_review"),
      v.literal("filed"),
      v.literal("failed"),
    ),
    currentJobId: v.optional(v.id("processingJobs")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };
    if (args.currentJobId !== undefined) {
      patch.currentJobId = args.currentJobId;
    }
    if (args.errorMessage !== undefined) {
      patch.errorMessage = args.errorMessage;
    }
    if (args.status === "filed" || args.status === "failed") {
      patch.completedAt = now;
    }

    await ctx.db.patch(args.sessionId, patch);
  },
});

/**
 * Returns a capture session by ID.
 */
export const get = query({
  args: { sessionId: v.id("captureSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    await requireWorkspaceMember(ctx, session.workspaceId);
    return session;
  },
});
