import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Gets a processing job by ID.
 */
export const getJob = internalQuery({
  args: { jobId: v.id("processingJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

/**
 * Gets all files for a capture session, ordered by page number.
 */
export const getSessionFiles = internalQuery({
  args: { captureSessionId: v.id("captureSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documentFiles")
      .withIndex("by_captureSessionId_and_pageNumber", (q) =>
        q.eq("captureSessionId", args.captureSessionId),
      )
      .take(50);
  },
});

/**
 * Gets workspace context for AI prompts (workspace name + entity list).
 */
export const getWorkspaceContext = internalQuery({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) return null;

    const entities = await ctx.db
      .query("entities")
      .withIndex("by_workspaceId_and_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "active"),
      )
      .take(100);

    return {
      workspace,
      entities: entities.map((e) => ({
        id: e._id,
        kind: e.kind,
        name: e.name,
        subtitle: e.subtitle,
        identifiers: e.identifiers,
      })),
    };
  },
});

/**
 * Gets a document by ID.
 */
export const getDocument = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

/**
 * Gets a text chunk with its parent document.
 */
export const getChunkWithDocument = internalQuery({
  args: { chunkId: v.id("documentTextChunks") },
  handler: async (ctx, args) => {
    const chunk = await ctx.db.get(args.chunkId);
    if (!chunk) return null;
    const document = await ctx.db.get(chunk.documentId);
    return { chunk, document };
  },
});

/**
 * Gets a capture session by ID.
 */
export const getCaptureSession = internalQuery({
  args: { sessionId: v.id("captureSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const canAccessWorkspace = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) return false;
    if (user.isAdmin === true) return true;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_workspaceId_and_userId", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", user._id),
      )
      .unique();
    return membership?.status === "active";
  },
});
