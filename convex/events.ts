import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceMember } from "./lib/auth";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const eventKind = v.union(
  v.literal("deadline"),
  v.literal("reminder"),
  v.literal("appointment"),
  v.literal("renewal"),
  v.literal("task"),
);

async function validateEventLinks(
  ctx: MutationCtx,
  args: {
    workspaceId: Id<"workspaces">;
    entityId?: Id<"entities">;
    documentId?: Id<"documents">;
  },
) {
  if (args.entityId) {
    const entity = await ctx.db.get(args.entityId);
    if (!entity || entity.workspaceId !== args.workspaceId) {
      throw new Error("Entity not found");
    }
  }
  if (args.documentId) {
    const document = await ctx.db.get(args.documentId);
    if (!document || document.workspaceId !== args.workspaceId) {
      throw new Error("Document not found");
    }
  }
}

export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
    from: v.number(),
    to: v.number(),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.db
      .query("events")
      .withIndex("by_workspaceId_and_startAt", (q) =>
        q
          .eq("workspaceId", args.workspaceId)
          .gte("startAt", args.from)
          .lt("startAt", args.to),
      )
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .take(250);
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    entityId: v.optional(v.id("entities")),
    documentId: v.optional(v.id("documents")),
    kind: eventKind,
    title: v.string(),
    notes: v.optional(v.string()),
    startAt: v.number(),
    endAt: v.optional(v.number()),
    allDay: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireWorkspaceMember(ctx, args.workspaceId);
    await validateEventLinks(ctx, args);

    const now = Date.now();
    return await ctx.db.insert("events", {
      workspaceId: args.workspaceId,
      entityId: args.entityId,
      documentId: args.documentId,
      kind: args.kind,
      status: "scheduled",
      title: args.title,
      notes: args.notes,
      startAt: args.startAt,
      endAt: args.endAt,
      allDay: args.allDay,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    await requireWorkspaceMember(ctx, event.workspaceId);

    await ctx.db.patch(args.eventId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});
