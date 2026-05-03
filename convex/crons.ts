import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";

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

const crons = cronJobs();

crons.interval(
  "scan stuck processing jobs",
  { minutes: 5 },
  internal.crons.scanStuckJobs,
  {},
);

export default crons;
