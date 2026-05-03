import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthCtx = QueryCtx | MutationCtx;

export async function requireUser(ctx: AuthCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}

export async function requireWorkspaceMember(
  ctx: AuthCtx,
  workspaceId: Id<"workspaces">,
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.isAdmin === true) return user;

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_workspaceId_and_userId", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", user._id),
    )
    .unique();

  if (!membership || membership.status !== "active") {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function requireOwnedDocument(
  ctx: AuthCtx,
  documentId: Id<"documents">,
) {
  const document = await ctx.db.get(documentId);
  if (!document) throw new Error("Document not found");
  await requireWorkspaceMember(ctx, document.workspaceId);
  return document;
}
