import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
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
