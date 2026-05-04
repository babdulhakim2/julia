import { query, mutation } from "./_generated/server";

/**
 * Returns the authenticated user's document, or null if not found.
 */
export const getMe = query({
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

    return user ?? null;
  },
});

/**
 * Called from the client after Clerk authentication.
 * Creates the user document if it doesn't exist, or updates
 * name/email/image and lastSeenAt if it does.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? existing.name,
        email: identity.email ?? existing.email,
        imageUrl: identity.pictureUrl ?? existing.imageUrl,
        lastSeenAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    if (identity.email) {
      const existingByEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email))
        .unique();

      if (existingByEmail) {
        await ctx.db.patch(existingByEmail._id, {
          tokenIdentifier: identity.tokenIdentifier,
          name: identity.name ?? existingByEmail.name,
          imageUrl: identity.pictureUrl ?? existingByEmail.imageUrl,
          lastSeenAt: now,
          updatedAt: now,
        });
        return existingByEmail._id;
      }
    }

    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email,
      name: identity.name,
      imageUrl: identity.pictureUrl,
      onboardingComplete: false,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    });

    return userId;
  },
});

/**
 * Marks the user's onboarding as complete.
 */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");

    const now = Date.now();
    await ctx.db.patch(user._id, {
      onboardingComplete: true,
      updatedAt: now,
    });

    // Also mark the workspace if present
    if (user.defaultWorkspaceId) {
      await ctx.db.patch(user.defaultWorkspaceId, {
        onboardingComplete: true,
        updatedAt: now,
      });
    }

    return user._id;
  },
});
