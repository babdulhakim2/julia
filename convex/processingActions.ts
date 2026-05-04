import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";
const GEMINI_FLASH_MODEL = "google/gemini-2.5-flash";
const DOCUMENT_EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 768;
const MAX_ATTEMPTS = 3;
const MAX_TEXT_FILE_CHARS = 20_000;

const DOCUMENT_CATEGORIES = [
  "finance",
  "tax",
  "utilities",
  "legal",
  "insurance",
  "fines",
  "people",
  "operations",
  "other",
] as const;

type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

type ExtractedValue = string | number | boolean | null;

interface ExtractionResult {
  title: string;
  category: DocumentCategory;
  documentType: string;
  issuer?: string;
  reference?: string;
  entityId?: string;
  confidence: number;
  needsReview: boolean;
  needsReviewReason?: string;
  summary?: string;
  amountMinor?: number;
  currency?: string;
  issuedDate?: string;
  dueDate?: string;
  extractedFields: Record<string, ExtractedValue>;
  tags: string[];
}

type TextContentPart = { type: "text"; text: string };
type ImageContentPart = { type: "image_url"; image_url: { url: string } };
type FileContentPart = {
  type: "file";
  file: { filename: string; file_data: string };
};
type UserContentPart = TextContentPart | ImageContentPart | FileContentPart;

const DOCUMENT_EXTRACTION_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "category",
    "documentType",
    "issuer",
    "reference",
    "entityId",
    "entityConfidence",
    "confidence",
    "needsReview",
    "needsReviewReason",
    "summary",
    "amountMinor",
    "currency",
    "issuedDate",
    "dueDate",
    "extractedFields",
    "tags",
  ],
  properties: {
    title: { type: "string" },
    category: { type: "string", enum: DOCUMENT_CATEGORIES },
    documentType: { type: "string" },
    issuer: { type: ["string", "null"] },
    reference: { type: ["string", "null"] },
    entityId: { type: ["string", "null"] },
    entityConfidence: { type: "number" },
    confidence: { type: "number" },
    needsReview: { type: "boolean" },
    needsReviewReason: { type: ["string", "null"] },
    summary: { type: ["string", "null"] },
    amountMinor: { type: ["number", "null"] },
    currency: { type: ["string", "null"] },
    issuedDate: {
      type: ["string", "null"],
      description: "ISO date in YYYY-MM-DD format.",
    },
    dueDate: {
      type: ["string", "null"],
      description: "ISO date in YYYY-MM-DD format.",
    },
    extractedFields: {
      type: "object",
      additionalProperties: { type: ["string", "number", "boolean", "null"] },
    },
    tags: { type: "array", items: { type: "string" } },
  },
};

function buildExtractionPrompt(context: {
  workspaceName: string;
  entities: Array<{
    id: string;
    kind: string;
    name: string;
    subtitle?: string;
    identifiers: Record<string, string>;
  }>;
  fileNames: string[];
  hintedEntityId?: string;
  inlineText: string[];
}) {
  return {
    system: [
      "You are the document intake engine for an AI-native company secretary SaaS.",
      "Extract structured facts from uploaded letters, PDFs, and scanned photos.",
      "Match the document to one known entity only when there is enough evidence.",
      "Prefer needsReview=true over guessing when entity, amount, due date, or action is uncertain.",
      "Return strict JSON matching the supplied schema. Do not include markdown.",
    ].join("\n"),
    user: [
      `Workspace: ${context.workspaceName}`,
      `Files: ${context.fileNames.join(", ") || "unnamed upload"}`,
      context.hintedEntityId
        ? `User-selected entity hint: ${context.hintedEntityId}`
        : "User-selected entity hint: none",
      "Known entities:",
      JSON.stringify(context.entities, null, 2),
      context.inlineText.length
        ? ["Plain text extracted before model call:", ...context.inlineText].join("\n\n")
        : "Plain text extracted before model call: none",
      "Task:",
      "1. Read all uploaded pages as one capture session.",
      "2. Identify the best entityId from the known entities, or null when uncertain.",
      "3. Classify category and documentType.",
      "4. Extract issuer, reference, amount, currency, issuedDate, dueDate, summary, tags, and useful fields.",
      "5. Set needsReview when confidence is below 0.8 or when a human should confirm entity, amount, due date, or next action.",
    ].join("\n\n"),
  };
}

export const processJob = internalAction({
  args: { jobId: v.id("processingJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.processingQueries.getJob, {
      jobId: args.jobId,
    });
    if (!job || job.status !== "queued") return;

    await ctx.runMutation(internal.processingJobs.updateStatus, {
      jobId: args.jobId,
      status: "running",
    });
    await ctx.runMutation(internal.processingJobs.incrementAttempts, {
      jobId: args.jobId,
    });

    try {
      let outputSummary = "Processed job";
      if (job.kind === "document_ingest") {
        outputSummary = await handleDocumentIngest(ctx, job);
      } else if (job.kind === "embed") {
        outputSummary = await handleEmbed(ctx, job);
      }

      await ctx.runMutation(internal.processingJobs.updateStatus, {
        jobId: args.jobId,
        status: "succeeded",
        outputSummary,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const attempts = job.attempts + 1;

      if (attempts < MAX_ATTEMPTS) {
        const delayMs = 5000 * attempts;
        await ctx.runMutation(internal.processingJobs.updateStatus, {
          jobId: args.jobId,
          status: "failed",
          errorMessage: message,
        });
        await ctx.runMutation(internal.processingJobs.reschedule, {
          jobId: args.jobId,
          delayMs,
        });
        return;
      }

      await ctx.runMutation(internal.processingJobs.updateStatus, {
        jobId: args.jobId,
        status: "failed",
        errorMessage: `Final failure after ${attempts} attempts: ${message}`,
      });

      if (job.captureSessionId) {
        await ctx.runMutation(internal.captureSessions.updateInternal, {
          sessionId: job.captureSessionId,
          status: "failed",
          errorMessage: message,
        });
      }
    }
  },
});

async function handleDocumentIngest(
  ctx: ActionCtx,
  job: Doc<"processingJobs">,
): Promise<string> {
  if (!job.captureSessionId) {
    throw new Error("document_ingest job requires captureSessionId");
  }

  const [files, wsContext, session] = await Promise.all([
    ctx.runQuery(internal.processingQueries.getSessionFiles, {
      captureSessionId: job.captureSessionId,
    }),
    ctx.runQuery(internal.processingQueries.getWorkspaceContext, {
      workspaceId: job.workspaceId,
    }),
    ctx.runQuery(internal.processingQueries.getCaptureSession, {
      sessionId: job.captureSessionId,
    }),
  ]);

  if (files.length === 0) throw new Error("No files found for capture session");
  if (!wsContext) throw new Error("Workspace not found");
  if (!session) throw new Error("Capture session not found");

  const inlineText: string[] = [];
  const fileParts: UserContentPart[] = [];
  for (const file of files) {
    const url = await ctx.storage.getUrl(file.storageId);
    if (!url) continue;

    if (file.contentType.startsWith("image/")) {
      fileParts.push({ type: "image_url", image_url: { url } });
      continue;
    }

    if (file.contentType.startsWith("text/") || file.contentType === "application/json") {
      inlineText.push(await readTextFile(url, file.fileName));
      continue;
    }

    fileParts.push({
      type: "file",
      file: {
        filename: file.fileName,
        file_data: url,
      },
    });
  }

  const prompt = buildExtractionPrompt({
    workspaceName: wsContext.workspace.name,
    entities: wsContext.entities,
    fileNames: files.map((file) => file.fileName),
    hintedEntityId: session.entityId,
    inlineText,
  });

  const userContent: UserContentPart[] = [
    { type: "text", text: prompt.user },
    ...fileParts,
  ];

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const model = job.model || GEMINI_FLASH_MODEL;
  const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: "POST",
    headers: openRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: userContent },
      ],
      plugins: [
        {
          id: "file-parser",
          pdf: { engine: process.env.OPENROUTER_PDF_ENGINE ?? "mistral-ocr" },
        },
        { id: "response-healing" },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "document_extraction",
          strict: true,
          schema: DOCUMENT_EXTRACTION_OUTPUT_SCHEMA,
        },
      },
      temperature: 0.1,
      max_completion_tokens: 2000,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${openRouterError(data)}`);
  }

  const extraction = normalizeExtraction(readMessageText(data));
  const validEntityIds = new Set<string>(wsContext.entities.map((entity) => entity.id));
  let entityId: Id<"entities"> | undefined;
  if (extraction.entityId && validEntityIds.has(extraction.entityId)) {
    entityId = extraction.entityId as Id<"entities">;
  } else if (session.entityId && validEntityIds.has(session.entityId)) {
    entityId = session.entityId;
  }

  const needsReview = extraction.needsReview || extraction.confidence < 0.8 || !entityId;

  const documentId = await ctx.runMutation(
    internal.documentMutations.createFromExtraction,
    {
      workspaceId: job.workspaceId,
      captureSessionId: job.captureSessionId,
      source: session.source,
      createdBy: session.createdBy,
      title: extraction.title,
      category: extraction.category,
      documentType: extraction.documentType,
      issuer: extraction.issuer,
      reference: extraction.reference,
      summary: extraction.summary,
      entityId,
      confidence: extraction.confidence,
      needsReview,
      needsReviewReason: extraction.needsReviewReason,
      amountMinor: extraction.amountMinor,
      currency: extraction.currency,
      issuedDate: extraction.issuedDate,
      dueDate: extraction.dueDate,
      extractedFields: extraction.extractedFields,
      tags: extraction.tags,
    },
  );

  for (const file of files) {
    await ctx.runMutation(internal.documentMutations.linkFileToDocument, {
      fileId: file._id,
      documentId,
    });
  }

  await recordOpenRouterUsage(ctx, {
    workspaceId: job.workspaceId,
    userId: session.createdBy,
    entityId,
    documentId,
    feature: "openrouter_extract",
    model,
    data,
  });

  await ctx.runMutation(internal.processingJobs.createInternal, {
    workspaceId: job.workspaceId,
    kind: "embed",
    documentId,
    provider: job.provider,
    model: DOCUMENT_EMBEDDING_MODEL,
  });

  return `Created document: ${extraction.title}`;
}

async function handleEmbed(
  ctx: ActionCtx,
  job: Doc<"processingJobs">,
): Promise<string> {
  if (!job.documentId) {
    throw new Error("embed job requires documentId");
  }

  const doc = await ctx.runQuery(internal.processingQueries.getDocument, {
    documentId: job.documentId,
  });
  if (!doc) throw new Error("Document not found");

  const fullText = buildDocumentText(doc);
  const chunks = chunkText(fullText, 800);
  if (chunks.length === 0) return "No document text to embed";

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const embeddingModel = job.model || DOCUMENT_EMBEDDING_MODEL;
  for (let i = 0; i < chunks.length; i++) {
    const res = await fetch(`${OPENROUTER_API_URL}/embeddings`, {
      method: "POST",
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model: embeddingModel,
        input: chunks[i],
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Embedding error ${res.status}: ${openRouterError(data)}`);
    }

    const embedding = readEmbedding(data);
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Expected ${EMBEDDING_DIMENSIONS} embedding dimensions`);
    }

    await ctx.runMutation(internal.documentMutations.storeTextChunk, {
      workspaceId: doc.workspaceId,
      entityId: doc.entityId,
      documentId: doc._id,
      documentCategory: doc.category,
      chunkIndex: i,
      text: chunks[i],
      embeddingModel,
      embedding,
    });

    await recordOpenRouterUsage(ctx, {
      workspaceId: doc.workspaceId,
      userId: doc.createdBy,
      entityId: doc.entityId,
      documentId: doc._id,
      feature: "openrouter_embed",
      model: embeddingModel,
      data,
    });
  }

  return `Embedded ${chunks.length} chunk${chunks.length === 1 ? "" : "s"}`;
}

function openRouterHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-OpenRouter-Title": "Julia",
  };
}

async function readTextFile(url: string, fileName: string) {
  const res = await fetch(url);
  if (!res.ok) return `File ${fileName}: failed to read text (${res.status}).`;
  const text = await res.text();
  return `File ${fileName}:\n${text.slice(0, MAX_TEXT_FILE_CHARS)}`;
}

function buildDocumentText(doc: Doc<"documents">) {
  const textParts = [doc.title];
  if (doc.summary) textParts.push(doc.summary);
  if (doc.issuer) textParts.push(`Issuer: ${doc.issuer}`);
  if (doc.reference) textParts.push(`Reference: ${doc.reference}`);
  if (doc.documentType) textParts.push(`Type: ${doc.documentType}`);
  if (doc.amount) {
    textParts.push(`Amount: ${doc.amount.amountMinor} ${doc.amount.currency}`);
  }
  for (const [key, value] of Object.entries(doc.extractedFields)) {
    if (value != null) textParts.push(`${key}: ${value}`);
  }
  return textParts.join("\n");
}

function normalizeExtraction(content: string): ExtractionResult {
  const parsed = parseJson(content);
  const record = asRecord(parsed);
  const category = normalizeCategory(record.category);
  const confidence = clampNumber(record.confidence, 0, 1, 0);

  return {
    title: stringValue(record.title) || "Untitled document",
    category,
    documentType: stringValue(record.documentType) || "Document",
    issuer: optionalString(record.issuer),
    reference: optionalString(record.reference),
    entityId: optionalString(record.entityId),
    confidence,
    needsReview: booleanValue(record.needsReview, true),
    needsReviewReason: optionalString(record.needsReviewReason),
    summary: optionalString(record.summary),
    amountMinor: optionalNumber(record.amountMinor),
    currency: optionalString(record.currency)?.toUpperCase(),
    issuedDate: optionalIsoDate(record.issuedDate),
    dueDate: optionalIsoDate(record.dueDate),
    extractedFields: extractedFields(record.extractedFields),
    tags: stringArray(record.tags),
  };
}

function parseJson(content: string) {
  const trimmed = content
    .replace(/^```json?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(trimmed) as unknown;
}

function readMessageText(data: unknown) {
  const record = asRecord(data);
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const first = asRecord(choices[0]);
  const message = asRecord(first.message);
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        const partRecord = asRecord(part);
        return typeof partRecord.text === "string" ? partRecord.text : "";
      })
      .join("\n");
  }
  throw new Error("No content in OpenRouter response");
}

function readEmbedding(data: unknown): number[] {
  const record = asRecord(data);
  const dataList = Array.isArray(record.data) ? record.data : [];
  const first = asRecord(dataList[0]);
  const embedding = first.embedding;
  if (!Array.isArray(embedding) || !embedding.every((value) => typeof value === "number")) {
    throw new Error("Invalid embedding response");
  }
  return embedding as number[];
}

function openRouterError(data: unknown) {
  const record = asRecord(data);
  const error = asRecord(record.error);
  return typeof error.message === "string" ? error.message : "Unknown";
}

async function recordOpenRouterUsage(
  ctx: ActionCtx,
  args: {
    workspaceId: Id<"workspaces">;
    userId: Id<"users">;
    entityId?: Id<"entities">;
    documentId?: Id<"documents">;
    feature: "openrouter_extract" | "openrouter_embed";
    model: string;
    data: unknown;
  },
) {
  const usage = asRecord(asRecord(args.data).usage);
  const totalTokens = optionalNumber(usage.total_tokens);
  if (!totalTokens) return;

  await ctx.runMutation(internal.usage.record, {
    workspaceId: args.workspaceId,
    userId: args.userId,
    entityId: args.entityId,
    documentId: args.documentId,
    feature: args.feature,
    quantity: totalTokens,
    unit: "token",
    provider: "openrouter",
    model: args.model,
    metadata: {
      promptTokens: optionalNumber(usage.prompt_tokens) ?? 0,
      completionTokens: optionalNumber(usage.completion_tokens) ?? 0,
    },
  });
}

function normalizeCategory(value: unknown): DocumentCategory {
  return DOCUMENT_CATEGORIES.includes(value as DocumentCategory)
    ? (value as DocumentCategory)
    : "other";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const text = stringValue(value);
  return text || undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = optionalNumber(value);
  if (number === undefined) return fallback;
  return Math.max(min, Math.min(max, number));
}

function optionalIsoDate(value: unknown) {
  const text = optionalString(value);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : undefined;
}

function extractedFields(value: unknown): Record<string, ExtractedValue> {
  const record = asRecord(value);
  const output: Record<string, ExtractedValue> = {};
  for (const [key, fieldValue] of Object.entries(record)) {
    if (
      typeof fieldValue === "string" ||
      typeof fieldValue === "number" ||
      typeof fieldValue === "boolean" ||
      fieldValue === null
    ) {
      output[key] = fieldValue;
    }
  }
  return output;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 20)
    : [];
}

function chunkText(text: string, maxLen: number): string[] {
  if (!text.trim()) return [];
  if (text.length <= maxLen) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
