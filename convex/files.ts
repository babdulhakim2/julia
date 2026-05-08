import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireWorkspaceMember } from "./lib/auth";

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const supportedContentTypes = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function isSupportedContentType(contentType: string) {
  return supportedContentTypes.includes(contentType);
}

/**
 * Generates a pre-signed upload URL for file storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Stores a reference to an uploaded document file.
 */
export const storeDocumentFile = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    captureSessionId: v.optional(v.id("captureSessions")),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    byteSize: v.number(),
    pageNumber: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.byteSize <= 0 || args.byteSize > MAX_DOCUMENT_BYTES) {
      throw new Error("Unsupported file size");
    }
    if (!isSupportedContentType(args.contentType)) {
      throw new Error("Unsupported file type");
    }

    const user = await requireWorkspaceMember(ctx, args.workspaceId);
    if (args.captureSessionId) {
      const session = await ctx.db.get(args.captureSessionId);
      if (!session || session.workspaceId !== args.workspaceId) {
        throw new Error("Capture session not found");
      }
    }

    const now = Date.now();
    const fileId = await ctx.db.insert("documentFiles", {
      workspaceId: args.workspaceId,
      captureSessionId: args.captureSessionId,
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      byteSize: args.byteSize,
      pageNumber: args.pageNumber,
      createdBy: user._id,
      createdAt: now,
    });

    await ctx.db.insert("usageEvents", {
      workspaceId: args.workspaceId,
      userId: user._id,
      feature: "document_upload",
      quantity: 1,
      unit: "count",
      metadata: { fileName: args.fileName, contentType: args.contentType },
      occurredAt: now,
      createdAt: now,
    });
    await ctx.db.insert("usageEvents", {
      workspaceId: args.workspaceId,
      userId: user._id,
      feature: "storage_byte",
      quantity: args.byteSize,
      unit: "byte",
      metadata: { fileName: args.fileName },
      occurredAt: now,
      createdAt: now,
    });

    return fileId;
  },
});

/**
 * Lists files belonging to a document, with resolved storage URLs.
 */
export const listByDocumentId = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return [];
    await requireWorkspaceMember(ctx, doc.workspaceId);
    const files = await ctx.db
      .query("documentFiles")
      .withIndex("by_documentId_and_pageNumber", (q) =>
        q.eq("documentId", args.documentId),
      )
      .take(50);
    return await Promise.all(
      files.map(async (f) => ({
        ...f,
        url: await ctx.storage.getUrl(f.storageId),
      })),
    );
  },
});

/**
 * Returns a URL for a stored file.
 */
export const getFileUrl = query({
  args: {
    workspaceId: v.id("workspaces"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const file = await ctx.db
      .query("documentFiles")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();
    if (!file || file.workspaceId !== args.workspaceId) {
      throw new Error("File not found");
    }
    return await ctx.storage.getUrl(args.storageId);
  },
});
