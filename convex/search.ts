import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";
const DOCUMENT_EMBEDDING_MODEL = "google/text-embedding-004";

/**
 * Hydrates vector search results with document details.
 */
export const hydrateSearchResults = internalQuery({
  args: {
    ids: v.array(v.id("documentTextChunks")),
  },
  handler: async (ctx, args) => {
    const results = [];
    for (const id of args.ids) {
      const chunk = await ctx.db.get(id);
      if (!chunk) continue;
      const doc = await ctx.db.get(chunk.documentId);
      if (!doc) continue;
      results.push({
        chunkId: chunk._id,
        text: chunk.text,
        chunkIndex: chunk.chunkIndex,
        documentId: doc._id,
        documentTitle: doc.title,
        documentType: doc.documentType,
        category: doc.category,
        issuer: doc.issuer,
        entityId: doc.entityId,
      });
    }
    return results;
  },
});

interface SearchResult {
  chunkId: Id<"documentTextChunks">;
  text: string;
  chunkIndex: number;
  documentId: Id<"documents">;
  documentTitle: string;
  documentType: string;
  category: string;
  issuer: string | undefined;
  entityId: Id<"entities"> | undefined;
  score: number;
}

interface SearchResponse {
  results: SearchResult[];
  error?: string;
}

/**
 * Performs semantic search across document text chunks.
 */
export const semanticSearch = action({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
    entityId: v.optional(v.id("entities")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SearchResponse> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { results: [], error: "Not authenticated" };
    }
    const canAccessWorkspace = await ctx.runQuery(
      internal.processingQueries.canAccessWorkspace,
      {
        workspaceId: args.workspaceId,
        tokenIdentifier: identity.tokenIdentifier,
      },
    );
    if (!canAccessWorkspace) {
      return { results: [], error: "Unauthorized" };
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { results: [], error: "OPENROUTER_API_KEY not configured" };
    }

    // Embed the query
    const res = await fetch(`${OPENROUTER_API_URL}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DOCUMENT_EMBEDDING_MODEL,
        input: args.query,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        results: [],
        error: `Embedding error: ${data?.error?.message || res.status}`,
      };
    }

    const queryEmbedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(queryEmbedding)) {
      return { results: [], error: "Invalid embedding response" };
    }

    // Vector search — build filter based on whether entityId is provided
    const searchResults = args.entityId
      ? await ctx.vectorSearch(
          "documentTextChunks",
          "by_embedding",
          {
            vector: queryEmbedding,
            limit: args.limit ?? 10,
            filter: (q) => q.eq("entityId", args.entityId),
          },
        )
      : await ctx.vectorSearch(
          "documentTextChunks",
          "by_embedding",
          {
            vector: queryEmbedding,
            limit: args.limit ?? 10,
            filter: (q) =>
              q.eq("workspaceId", args.workspaceId),
          },
        );

    if (searchResults.length === 0) {
      return { results: [] };
    }

    // Hydrate results with document details
    const ids = searchResults.map((r) => r._id);
    const hydrated: Array<Omit<SearchResult, "score">> = await ctx.runQuery(
      internal.search.hydrateSearchResults,
      { ids },
    );

    return {
      results: hydrated.map((h, i) => ({
        ...h,
        score: searchResults[i]?._score ?? 0,
      })),
    };
  },
});
