import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const usageFeature = v.union(
  v.literal("document_upload"),
  v.literal("document_processed"),
  v.literal("openrouter_chat"),
  v.literal("openrouter_extract"),
  v.literal("openrouter_embed"),
  v.literal("storage_byte"),
);

const usageUnit = v.union(
  v.literal("count"),
  v.literal("token"),
  v.literal("byte"),
  v.literal("usd_micros"),
);

const metadataValue = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

export const record = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.optional(v.id("users")),
    entityId: v.optional(v.id("entities")),
    documentId: v.optional(v.id("documents")),
    feature: usageFeature,
    quantity: v.number(),
    unit: usageUnit,
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    costMicros: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), metadataValue)),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("usageEvents", {
      workspaceId: args.workspaceId,
      userId: args.userId,
      entityId: args.entityId,
      documentId: args.documentId,
      feature: args.feature,
      quantity: args.quantity,
      unit: args.unit,
      provider: args.provider,
      model: args.model,
      costMicros: args.costMicros,
      metadata: args.metadata ?? {},
      occurredAt: now,
      createdAt: now,
    });
  },
});
