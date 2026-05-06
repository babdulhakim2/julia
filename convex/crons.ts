import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_MS = 7 * DAY_MS;

/**
 * Scans for stuck processing jobs (running for > 5 min) and re-queues them.
 */
export const scanStuckJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    const stuckThreshold = Date.now() - 5 * 60 * 1000;

    const runningJobs = await ctx.runQuery(
      internal.crons.getRunningJobs,
      {},
    );

    for (const job of runningJobs) {
      if (job.lockedAt && job.lockedAt < stuckThreshold) {
        if (job.attempts < 3) {
          await ctx.runMutation(internal.processingJobs.reschedule, {
            jobId: job._id,
            delayMs: 5000,
          });
        } else {
          await ctx.runMutation(internal.processingJobs.updateStatus, {
            jobId: job._id,
            status: "failed",
            errorMessage: "Job stuck and max attempts reached",
          });
        }
      }
    }
  },
});

export const getRunningJobs = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("processingJobs")
      .withIndex("by_status_and_nextRunAt", (q) =>
        q.eq("status", "running"),
      )
      .take(50);
  },
});

/**
 * Refreshes document statuses based on current date.
 * - scheduled + dueAt within 7 days → due_soon
 * - scheduled/due_soon/needs_review + dueAt in the past → overdue
 */
export const refreshDocumentStatuses = internalMutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const now = Date.now();
    let updated = 0;
    const statuses = ["scheduled", "due_soon", "needs_review"] as const;

    for (const status of statuses) {
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_workspaceId_and_status", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("status", status),
        )
        .take(200);

      for (const doc of docs) {
        if (!doc.dueAt) continue;
        let newStatus: "due_soon" | "overdue" | null = null;
        if (doc.dueAt < now) {
          newStatus = "overdue";
        } else if (doc.dueAt <= now + DUE_SOON_MS && doc.status !== "due_soon") {
          newStatus = "due_soon";
        }
        if (newStatus) {
          await ctx.db.patch(doc._id, { status: newStatus, updatedAt: now });
          updated++;
        }
      }
    }

    return updated;
  },
});

/**
 * Scans all workspaces and refreshes document statuses.
 */
export const scanDocumentStatuses = internalAction({
  args: {},
  handler: async (ctx) => {
    const workspaces = await ctx.runQuery(
      internal.crons.getAllWorkspaceIds,
      {},
    );

    for (const workspaceId of workspaces) {
      await ctx.runMutation(internal.crons.refreshDocumentStatuses, {
        workspaceId,
      });
    }
  },
});

export const getAllWorkspaceIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const workspaces = await ctx.db.query("workspaces").take(100);
    return workspaces.map((w) => w._id);
  },
});

const crons = cronJobs();

crons.interval(
  "scan stuck processing jobs",
  { minutes: 5 },
  internal.crons.scanStuckJobs,
  {},
);

crons.interval(
  "refresh document statuses",
  { hours: 1 },
  internal.crons.scanDocumentStatuses,
  {},
);

export default crons;
