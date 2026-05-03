import { query } from "./_generated/server";

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    return user?.isAdmin === true;
  },
});

export const dashboard = query({
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
    if (!user?.isAdmin) throw new Error("Not authorized");

    const workspaces = await ctx.db.query("workspaces").take(100);

    const tenants = [];
    const entities: Array<{
      workspaceName: string;
      entityId: string;
      name: string;
      kind: string;
      icon: string;
      color: string;
      docs: number;
      open: number;
      overdue: number;
      review: number;
    }> = [];

    let totalOpen = 0;
    let totalReview = 0;
    let totalDueSoon = 0;
    let totalOverdue = 0;

    for (const ws of workspaces) {
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_workspaceId_and_status", (q) =>
          q.eq("workspaceId", ws._id).eq("status", "active"),
        )
        .take(500);

      const activeEntities = await ctx.db
        .query("entities")
        .withIndex("by_workspaceId_and_status", (q) =>
          q.eq("workspaceId", ws._id).eq("status", "active"),
        )
        .take(500);

      const documents = await ctx.db
        .query("documents")
        .withIndex("by_workspaceId_and_status", (q) =>
          q.eq("workspaceId", ws._id),
        )
        .take(5000);

      const reminders = await ctx.db
        .query("reminders")
        .withIndex("by_workspaceId_and_status", (q) =>
          q.eq("workspaceId", ws._id),
        )
        .take(5000);

      const openDocs = documents.filter(
        (d) => d.status !== "done" && d.status !== "archived",
      ).length;
      const needsReview = documents.filter(
        (d) => d.status === "needs_review",
      ).length;
      const overdue = documents.filter((d) => d.status === "overdue").length;
      const dueSoon = documents.filter((d) => d.status === "due_soon").length;

      totalOpen += openDocs;
      totalReview += needsReview;
      totalDueSoon += dueSoon;
      totalOverdue += overdue;

      const health =
        overdue > 0 ? "attention" : needsReview > 0 ? "review" : "healthy";

      tenants.push({
        id: ws._id,
        name: ws.name,
        plan: ws.plan,
        userCount: memberships.length,
        entityCount: activeEntities.length,
        documentCount: documents.length,
        reminderCount: reminders.length,
        openDocs,
        needsReview,
        overdue,
        dueSoon,
        health,
      });

      for (const entity of activeEntities) {
        const entityDocs = await ctx.db
          .query("documents")
          .withIndex("by_entityId_and_status", (q) =>
            q.eq("entityId", entity._id),
          )
          .take(5000);

        const entityOpen = entityDocs.filter(
          (d) => d.status !== "done" && d.status !== "archived",
        ).length;
        const entityOverdue = entityDocs.filter(
          (d) => d.status === "overdue",
        ).length;
        const entityReview = entityDocs.filter(
          (d) => d.status === "needs_review",
        ).length;

        entities.push({
          workspaceName: ws.name,
          entityId: entity._id,
          name: entity.name,
          kind: entity.kind,
          icon: entity.icon,
          color: entity.color,
          docs: entityDocs.length,
          open: entityOpen,
          overdue: entityOverdue,
          review: entityReview,
        });
      }
    }

    return {
      stats: {
        openWork: totalOpen,
        needsReview: totalReview,
        dueSoon: totalDueSoon,
        overdue: totalOverdue,
      },
      tenants,
      entities,
    };
  },
});
