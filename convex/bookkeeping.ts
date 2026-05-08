import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireWorkspaceMember } from "./lib/auth";

const bookkeepingType = v.union(
  v.literal("income"),
  v.literal("expense"),
);

const paymentMethod = v.union(
  v.literal("cash"),
  v.literal("card"),
  v.literal("bank"),
  v.literal("other"),
);

const money = v.object({
  amountMinor: v.number(),
  currency: v.string(),
});

async function requireEntityMember(
  ctx: QueryCtx | MutationCtx,
  entityId: Id<"entities">,
): Promise<Doc<"entities">> {
  const entity = await ctx.db.get(entityId);
  if (!entity) throw new Error("Entity not found");
  await requireWorkspaceMember(ctx, entity.workspaceId);
  return entity;
}

export const listByEntity = query({
  args: {
    entityId: v.id("entities"),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireEntityMember(ctx, args.entityId);
    return await ctx.db
      .query("bookkeepingRecords")
      .withIndex("by_entityId_and_recordDate", (q) => {
        const byEntity = q.eq("entityId", args.entityId);
        if (args.from !== undefined && args.to !== undefined) {
          return byEntity.gte("recordDate", args.from).lt("recordDate", args.to);
        }
        if (args.from !== undefined) {
          return byEntity.gte("recordDate", args.from);
        }
        if (args.to !== undefined) {
          return byEntity.lt("recordDate", args.to);
        }
        return byEntity;
      })
      .order("desc")
      .take(args.limit ?? 200);
  },
});

export const todaySnapshot = query({
  args: {
    workspaceId: v.id("workspaces"),
    from: v.number(),
    to: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const records = await ctx.db
      .query("bookkeepingRecords")
      .withIndex("by_workspaceId_and_recordDate", (q) =>
        q
          .eq("workspaceId", args.workspaceId)
          .gte("recordDate", args.from)
          .lt("recordDate", args.to),
      )
      .order("desc")
      .take(args.limit ?? 500);

    const byEntity = new Map<
      Id<"entities">,
      {
        entityId: Id<"entities">;
        entityName: string;
        entityColor: string;
        income: number;
        expense: number;
        net: number;
        count: number;
      }
    >();
    let income = 0;
    let expense = 0;

    for (const record of records) {
      const entity = await ctx.db.get(record.entityId);
      if (!entity || entity.workspaceId !== args.workspaceId) continue;
      const current = byEntity.get(record.entityId) ?? {
        entityId: record.entityId,
        entityName: entity.name,
        entityColor: entity.color,
        income: 0,
        expense: 0,
        net: 0,
        count: 0,
      };
      if (record.type === "income") {
        current.income += record.amount.amountMinor;
        income += record.amount.amountMinor;
      } else {
        current.expense += record.amount.amountMinor;
        expense += record.amount.amountMinor;
      }
      current.net = current.income - current.expense;
      current.count += 1;
      byEntity.set(record.entityId, current);
    }

    return {
      income,
      expense,
      net: income - expense,
      count: records.length,
      entities: Array.from(byEntity.values()).sort((a, b) =>
        b.income + b.expense - (a.income + a.expense),
      ),
    };
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    entityId: v.id("entities"),
    documentId: v.optional(v.id("documents")),
    type: bookkeepingType,
    paymentMethod,
    recordDate: v.number(),
    amount: money,
    description: v.string(),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireWorkspaceMember(ctx, args.workspaceId);
    const entity = await ctx.db.get(args.entityId);
    if (!entity || entity.workspaceId !== args.workspaceId) {
      throw new Error("Entity not found");
    }
    if (args.documentId) {
      const doc = await ctx.db.get(args.documentId);
      if (!doc || doc.workspaceId !== args.workspaceId) {
        throw new Error("Document not found");
      }
    }

    const now = Date.now();
    return await ctx.db.insert("bookkeepingRecords", {
      workspaceId: args.workspaceId,
      entityId: args.entityId,
      documentId: args.documentId,
      type: args.type,
      paymentMethod: args.paymentMethod,
      recordDate: args.recordDate,
      amount: args.amount,
      description: args.description.trim(),
      category: args.category?.trim() || undefined,
      source: args.documentId ? "document" : "manual",
      notes: args.notes?.trim() || undefined,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    recordId: v.id("bookkeepingRecords"),
    type: v.optional(bookkeepingType),
    paymentMethod: v.optional(paymentMethod),
    recordDate: v.optional(v.number()),
    amount: v.optional(money),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) throw new Error("Record not found");
    await requireWorkspaceMember(ctx, record.workspaceId);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.type !== undefined) updates.type = args.type;
    if (args.paymentMethod !== undefined) updates.paymentMethod = args.paymentMethod;
    if (args.recordDate !== undefined) updates.recordDate = args.recordDate;
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.description !== undefined) updates.description = args.description.trim();
    if (args.category !== undefined) updates.category = args.category.trim() || undefined;
    if (args.notes !== undefined) updates.notes = args.notes.trim() || undefined;

    await ctx.db.patch(args.recordId, updates);
  },
});

export const remove = mutation({
  args: { recordId: v.id("bookkeepingRecords") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) throw new Error("Record not found");
    await requireWorkspaceMember(ctx, record.workspaceId);
    await ctx.db.delete(args.recordId);
  },
});

export const createFromDocument = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    entityId: v.id("entities"),
    documentId: v.id("documents"),
    createdBy: v.id("users"),
    type: bookkeepingType,
    paymentMethod,
    recordDate: v.number(),
    amount: money,
    description: v.string(),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bookkeepingRecords")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .first();
    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("bookkeepingRecords", {
      workspaceId: args.workspaceId,
      entityId: args.entityId,
      documentId: args.documentId,
      type: args.type,
      paymentMethod: args.paymentMethod,
      recordDate: args.recordDate,
      amount: args.amount,
      description: args.description.trim(),
      category: args.category?.trim() || undefined,
      source: "document",
      notes: args.notes?.trim() || undefined,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});
