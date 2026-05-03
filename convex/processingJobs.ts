import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireWorkspaceMember } from "./lib/auth";

const processingKind = v.union(
  v.literal("document_ingest"),
  v.literal("extract"),
  v.literal("classify"),
  v.literal("embed"),
  v.literal("summarize"),
  v.literal("reminder_scan"),
  v.literal("chat_answer"),
);

const processingStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("cancelled"),
);

/**
 * Creates a processing job and immediately schedules it.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    kind: processingKind,
    captureSessionId: v.optional(v.id("captureSessions")),
    documentId: v.optional(v.id("documents")),
    provider: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    if (args.captureSessionId) {
      const session = await ctx.db.get(args.captureSessionId);
      if (!session || session.workspaceId !== args.workspaceId) {
        throw new Error("Capture session not found");
      }
    }
    if (args.documentId) {
      const document = await ctx.db.get(args.documentId);
      if (!document || document.workspaceId !== args.workspaceId) {
        throw new Error("Document not found");
      }
    }

    const now = Date.now();
    const jobId = await ctx.db.insert("processingJobs", {
      workspaceId: args.workspaceId,
      kind: args.kind,
      status: "queued",
      captureSessionId: args.captureSessionId,
      documentId: args.documentId,
      provider: args.provider,
      model: args.model,
      attempts: 0,
      nextRunAt: now,
      createdAt: now,
      updatedAt: now,
    });

    if (args.captureSessionId) {
      await ctx.db.patch(args.captureSessionId, {
        status: "processing",
        currentJobId: jobId,
        updatedAt: now,
      });
    }

    // Schedule the job to run immediately
    await ctx.scheduler.runAfter(
      0,
      internal.processingActions.processJob,
      { jobId },
    );

    return jobId;
  },
});

/**
 * Updates the status of a processing job. Internal only.
 */
export const updateStatus = internalMutation({
  args: {
    jobId: v.id("processingJobs"),
    status: processingStatus,
    errorMessage: v.optional(v.string()),
    outputSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };
    if (args.status === "running") {
      patch.lockedAt = now;
    }
    if (args.status === "succeeded" || args.status === "failed") {
      patch.completedAt = now;
    }
    if (args.errorMessage !== undefined) {
      patch.errorMessage = args.errorMessage;
    }
    if (args.outputSummary !== undefined) {
      patch.outputSummary = args.outputSummary;
    }
    await ctx.db.patch(args.jobId, patch);
  },
});

/**
 * Increments the attempts counter. Internal only.
 */
export const incrementAttempts = internalMutation({
  args: { jobId: v.id("processingJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    await ctx.db.patch(args.jobId, {
      attempts: job.attempts + 1,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Creates a processing job from internal context (no auth required).
 */
export const createInternal = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    kind: processingKind,
    captureSessionId: v.optional(v.id("captureSessions")),
    documentId: v.optional(v.id("documents")),
    provider: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const jobId = await ctx.db.insert("processingJobs", {
      workspaceId: args.workspaceId,
      kind: args.kind,
      status: "queued",
      captureSessionId: args.captureSessionId,
      documentId: args.documentId,
      provider: args.provider,
      model: args.model,
      attempts: 0,
      nextRunAt: now,
      createdAt: now,
      updatedAt: now,
    });

    if (args.captureSessionId) {
      await ctx.db.patch(args.captureSessionId, {
        status: "processing",
        currentJobId: jobId,
        updatedAt: now,
      });
    }

    await ctx.scheduler.runAfter(
      0,
      internal.processingActions.processJob,
      { jobId },
    );

    return jobId;
  },
});

/**
 * Reschedules a failed job with exponential backoff. Internal only.
 */
export const reschedule = internalMutation({
  args: {
    jobId: v.id("processingJobs"),
    delayMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "queued",
      nextRunAt: now + args.delayMs,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      args.delayMs,
      internal.processingActions.processJob,
      { jobId: args.jobId },
    );
  },
});
