import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceMember } from "./lib/auth";

const chatRole = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

/**
 * Creates a new chat thread.
 */
export const createThread = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireWorkspaceMember(ctx, args.workspaceId);
    const now = Date.now();
    return await ctx.db.insert("chatThreads", {
      workspaceId: args.workspaceId,
      createdBy: user._id,
      title: args.title,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Lists threads for the current user, ordered by lastMessageAt desc.
 */
export const listThreads = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const user = await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.db
      .query("chatThreads")
      .withIndex("by_createdBy_and_lastMessageAt", (q) =>
        q.eq("createdBy", user._id),
      )
      .order("desc")
      .take(50);
  },
});

/**
 * Adds a message to a thread and updates lastMessageAt.
 */
export const addMessage = mutation({
  args: {
    threadId: v.id("chatThreads"),
    role: chatRole,
    content: v.string(),
    citedDocumentIds: v.array(v.id("documents")),
    citedEntityIds: v.array(v.id("entities")),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");
    await requireWorkspaceMember(ctx, thread.workspaceId);

    const now = Date.now();
    const messageId = await ctx.db.insert("chatMessages", {
      workspaceId: thread.workspaceId,
      threadId: args.threadId,
      role: args.role,
      content: args.content,
      citedDocumentIds: args.citedDocumentIds,
      citedEntityIds: args.citedEntityIds,
      model: args.model,
      createdAt: now,
    });

    await ctx.db.patch(args.threadId, {
      lastMessageAt: now,
      updatedAt: now,
    });

    return messageId;
  },
});

/**
 * Returns messages for a thread, ordered by createdAt asc.
 */
export const getMessages = query({
  args: { threadId: v.id("chatThreads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");
    await requireWorkspaceMember(ctx, thread.workspaceId);

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_threadId_and_createdAt", (q) =>
        q.eq("threadId", args.threadId),
      )
      .take(200);
  },
});

/**
 * Updates a thread's title (e.g. auto-title after first AI response).
 */
export const updateThreadTitle = mutation({
  args: {
    threadId: v.id("chatThreads"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");
    await requireWorkspaceMember(ctx, thread.workspaceId);

    await ctx.db.patch(args.threadId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});
