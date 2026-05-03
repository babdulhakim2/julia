import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

/**
 * Returns the authenticated user's default workspace, or null.
 */
export const getMyWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user?.defaultWorkspaceId) return null;

    return await ctx.db.get(user.defaultWorkspaceId);
  },
});

/**
 * Creates a workspace + owner membership, and links it to the user's
 * defaultWorkspaceId.
 */
export const create = mutation({
  args: {
    name: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const slugBase = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "workspace";
    const slug = `${slugBase}-${String(user._id).slice(-8).toLowerCase()}`;

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      slug,
      plan: "free",
      timezone: args.timezone,
      defaultCurrency: "GBP",
      ownerUserId: user._id,
      onboardingComplete: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create owner membership
    await ctx.db.insert("memberships", {
      workspaceId,
      userId: user._id,
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Link workspace to user
    await ctx.db.patch(user._id, {
      defaultWorkspaceId: workspaceId,
      updatedAt: now,
    });

    return workspaceId;
  },
});
