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

const INTAKE_CATEGORIES = [
  "takings.card",
  "takings.cash",
  "expense.supplier",
  "expense.utility",
  "expense.other",
  "invoice.receivable",
  "tax.hmrc",
  "tax.council",
  "legal.licence",
  "legal.compliance",
  "vehicle.pcn",
  "vehicle.mot",
  "vehicle.insurance",
  "vehicle.tax",
  "property.mortgage",
  "property.tenancy",
  "property.service",
  "correspondence.council",
  "correspondence.bank",
  "correspondence.insurance",
  "correspondence.other",
  "unknown",
] as const;

type IntakeCategory = (typeof INTAKE_CATEGORIES)[number];

type ExtractedValue = string | number | boolean | null;

interface ExtractionResult {
  title: string;
  category: DocumentCategory;
  intakeCategory: IntakeCategory;
  documentType: string;
  issuer?: string;
  reference?: string;
  entityId?: string;
  entityConfidence: number;
  confidence: number;
  needsReview: boolean;
  needsReviewReason?: string;
  summary?: string;
  actionSummary?: string;
  outcomeMessage?: string;
  draftRecommended: boolean;
  draftResponse?: string;
  draftReason?: string;
  amountMinor?: number;
  currency?: string;
  issuedDate?: string;
  dueDate?: string;
  extractedFields: Record<string, ExtractedValue>;
  tags: string[];
  bookkeepingCandidate: boolean;
  bookkeepingType?: "income" | "expense";
  paymentMethod?: "cash" | "card" | "bank" | "other";
  recordDate?: string;
  bookkeepingCategory?: string;
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
    "intakeCategory",
    "documentType",
    "issuer",
    "reference",
    "entityId",
    "entityConfidence",
    "confidence",
    "needsReview",
    "needsReviewReason",
    "summary",
    "actionSummary",
    "draftRecommended",
    "draftResponse",
    "draftReason",
    "amountMinor",
    "currency",
    "issuedDate",
    "dueDate",
    "extractedFields",
    "tags",
    "bookkeepingCandidate",
    "bookkeepingType",
    "paymentMethod",
    "recordDate",
    "bookkeepingCategory",
  ],
  properties: {
    title: { type: "string" },
    category: { type: "string", enum: DOCUMENT_CATEGORIES },
    intakeCategory: { type: "string", enum: INTAKE_CATEGORIES },
    documentType: { type: "string" },
    issuer: { type: ["string", "null"] },
    reference: { type: ["string", "null"] },
    entityId: { type: ["string", "null"] },
    entityConfidence: { type: "number" },
    confidence: { type: "number" },
    needsReview: { type: "boolean" },
    needsReviewReason: { type: ["string", "null"] },
    summary: { type: ["string", "null"] },
    actionSummary: {
      type: ["string", "null"],
      description: "One short plain-English description of what Julia should do next.",
    },
    draftRecommended: { type: "boolean" },
    draftResponse: {
      type: ["string", "null"],
      description: "Draft appeal or response text when useful; otherwise null.",
    },
    draftReason: {
      type: ["string", "null"],
      description: "Why a response or appeal draft is appropriate; otherwise null.",
    },
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
    bookkeepingCandidate: { type: "boolean" },
    bookkeepingType: { type: ["string", "null"], enum: ["income", "expense", null] },
    paymentMethod: { type: ["string", "null"], enum: ["cash", "card", "bank", "other", null] },
    recordDate: {
      type: ["string", "null"],
      description: "ISO date in YYYY-MM-DD format for bookkeeping record date.",
    },
    bookkeepingCategory: { type: ["string", "null"] },
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
  hintedCategory?: string;
  hintedIntakeCategory?: string;
  inlineText: string[];
}) {
  return {
    system: [
      "You are the document intake engine for an AI-native company secretary SaaS.",
      "Extract structured facts from uploaded letters, PDFs, scanned photos, and multi-page capture sessions.",
      "Match the document to one known entity only when there is enough evidence.",
      "Use only supplied entity IDs. Never invent an entity ID or a new entity name.",
      "Prefer needsReview=true over guessing when entity, amount, due date, or action is uncertain.",
      "Deadline-bearing documents must not be treated as handled just because they are filed.",
      "The user is a UK owner-operator with several businesses, properties, and vehicles; classify the admin work and route it for her.",
      "Return strict JSON matching the supplied schema. Do not include markdown.",
    ].join("\n"),
    user: [
      `Today: ${new Date().toISOString().slice(0, 10)}`,
      `Workspace: ${context.workspaceName}`,
      `Files: ${context.fileNames.join(", ") || "unnamed upload"}`,
      context.hintedEntityId
        ? `User-selected entity hint: ${context.hintedEntityId}`
        : "User-selected entity hint: none",
      context.hintedCategory || context.hintedIntakeCategory
        ? `User-selected category hint: ${[
          context.hintedCategory ? `category=${context.hintedCategory}` : null,
          context.hintedIntakeCategory ? `intakeCategory=${context.hintedIntakeCategory}` : null,
        ].filter(Boolean).join(", ")}`
        : "User-selected category hint: none",
      "Known entities:",
      JSON.stringify(context.entities, null, 2),
      context.inlineText.length
        ? ["Plain text extracted before model call:", ...context.inlineText].join("\n\n")
        : "Plain text extracted before model call: none",
      "Task:",
      "1. Read all uploaded pages as one capture session.",
      "2. Identify the best entityId from the known entities, or null when uncertain. entityConfidence must be below 0.75 unless there is direct identifier, name, address, registration, or account evidence.",
      `3. Classify intakeCategory as one of: ${INTAKE_CATEGORIES.join(", ")}.`,
      "4. Also set the coarse category used by the UI: finance, tax, utilities, legal, insurance, fines, people, operations, or other.",
      "5. Extract issuer, reference, amount, currency, issuedDate, dueDate, summary, tags, and useful fields.",
      "6. For deadline-bearing categories, extract dueDate aggressively. If the document says \"within 14 days\", \"within 28 days\", discount period, appeal-by, pay-by, renewal-by, expiry, or response deadline, compute the ISO dueDate from issuedDate/date of notice when possible.",
      "7. For vehicle.pcn, dueDate must be the earliest actionable date the user cares about, usually the discount deadline if visible or computable; also put the final payment/appeal deadline in extractedFields when visible.",
      "8. Set needsReview when confidence is below 0.75, the entity is unclear, amount/date is ambiguous, intakeCategory is unknown, or a deadline-bearing document has no dueDate.",
      "9. For takings.card and takings.cash, set bookkeepingCandidate=true, bookkeepingType=income, and paymentMethod=card or cash. These are usually handled after adding to books.",
      "10. For expense.supplier, expense.other, and property.mortgage, set bookkeepingCandidate=true, bookkeepingType=expense, and infer paymentMethod when visible. Paid receipts are usually handled after adding to books.",
      "11. For expense.utility and property.service, file the bill and set dueDate when visible; only make it a bookkeeping candidate if the document clearly proves it has already been paid.",
      "12. For vehicle.pcn, tax.hmrc penalties/queries, and correspondence.council asking for a response, set draftRecommended=true and draftResponse to a practical draft the user can edit. Do not say it has been sent.",
      "13. actionSummary must be one short plain-English phrase such as \"added card takings\", \"reminder set\", \"draft appeal ready\", or \"needs your eye\".",
    ].join("\n\n"),
  };
}

function requiresDeadline(intakeCategory: IntakeCategory) {
  return [
    "expense.utility",
    "invoice.receivable",
    "tax.hmrc",
    "tax.council",
    "legal.licence",
    "legal.compliance",
    "vehicle.pcn",
    "vehicle.mot",
    "vehicle.insurance",
    "vehicle.tax",
    "property.tenancy",
    "property.service",
    "correspondence.council",
    "correspondence.insurance",
  ].includes(intakeCategory);
}

function routingDecision(extraction: ExtractionResult, hasEntity: boolean) {
  const lowConfidence = extraction.confidence < 0.75 || extraction.entityConfidence < 0.75;
  const unknown = extraction.intakeCategory === "unknown";
  const missingDeadline = requiresDeadline(extraction.intakeCategory) && !extraction.dueDate;
  const needsReview = extraction.needsReview || unknown || lowConfidence || !hasEntity || missingDeadline;
  const confirmationRequired =
    !needsReview && (extraction.confidence < 0.93 || extraction.entityConfidence < 0.93);
  let reason = extraction.needsReviewReason;
  if (!hasEntity) reason = "Julia could not confidently match this to an existing entity.";
  else if (unknown) reason = "Julia could not classify this document.";
  else if (lowConfidence) reason = "Julia is not confident enough to file this without a quick check.";
  else if (missingDeadline) reason = "Julia could not find the deadline this document needs tracked.";
  return { needsReview, confirmationRequired, reason };
}

function bookkeepingSideEffect(extraction: ExtractionResult):
  | { type: "income" | "expense"; paymentMethod: "cash" | "card" | "bank" | "other"; category: string }
  | null {
  switch (extraction.intakeCategory) {
    case "takings.card":
      return { type: "income", paymentMethod: "card", category: "Card takings" };
    case "takings.cash":
      return { type: "income", paymentMethod: "cash", category: "Cash takings" };
    case "expense.supplier":
      return {
        type: "expense",
        paymentMethod: extraction.paymentMethod ?? "other",
        category: extraction.bookkeepingCategory ?? "Supplier costs",
      };
    case "expense.other":
      return {
        type: "expense",
        paymentMethod: extraction.paymentMethod ?? "other",
        category: extraction.bookkeepingCategory ?? "Other costs",
      };
    case "property.mortgage":
      return {
        type: "expense",
        paymentMethod: extraction.paymentMethod ?? "bank",
        category: extraction.bookkeepingCategory ?? "Mortgage",
      };
    default:
      if (
        extraction.bookkeepingCandidate &&
        extraction.bookkeepingType &&
        extraction.intakeCategory !== "expense.utility" &&
        extraction.intakeCategory !== "property.service"
      ) {
        return {
          type: extraction.bookkeepingType,
          paymentMethod: extraction.paymentMethod ?? "other",
          category: extraction.bookkeepingCategory ?? extraction.documentType,
        };
      }
      return null;
  }
}

function coarseCategoryForIntake(
  intakeCategory: IntakeCategory,
  fallback: DocumentCategory,
): DocumentCategory {
  if (intakeCategory.startsWith("takings.")) return "finance";
  if (intakeCategory.startsWith("expense.")) {
    return intakeCategory === "expense.utility" ? "utilities" : "finance";
  }
  if (intakeCategory.startsWith("invoice.")) return "finance";
  if (intakeCategory.startsWith("tax.")) return "tax";
  if (intakeCategory.startsWith("legal.")) return "legal";
  if (intakeCategory === "vehicle.pcn") return "fines";
  if (intakeCategory === "vehicle.insurance") return "insurance";
  if (intakeCategory === "vehicle.tax") return "tax";
  if (intakeCategory === "vehicle.mot") return "operations";
  if (intakeCategory.startsWith("property.")) return "finance";
  if (intakeCategory === "correspondence.insurance") return "insurance";
  if (intakeCategory === "correspondence.bank") return "finance";
  if (intakeCategory === "correspondence.council") return "operations";
  if (intakeCategory === "unknown") return "other";
  return fallback;
}

function intakeExtractedFields(
  extraction: ExtractionResult,
  extras: {
    outcomeMessage: string;
    confirmationRequired: boolean;
  },
) {
  return {
    ...extraction.extractedFields,
    intakeCategory: extraction.intakeCategory,
    entityConfidence: extraction.entityConfidence,
    actionSummary: extraction.actionSummary ?? null,
    outcomeMessage: extras.outcomeMessage,
    confirmationRequired: extras.confirmationRequired,
    draftRecommended: extraction.draftRecommended,
  };
}

function buildOutcomeMessage(
  extraction: ExtractionResult,
  entityName: string | undefined,
  sideEffects: { needsReview: boolean; bookkeeping: boolean; draft: boolean },
) {
  const title = extraction.title || extraction.documentType || "Document";
  const amount = extraction.amountMinor !== undefined
    ? `${extraction.currency === "GBP" || !extraction.currency ? "£" : `${extraction.currency} `}${(
        Math.abs(Math.round(extraction.amountMinor)) / 100
      ).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;
  if (sideEffects.needsReview) {
    return `${title}${amount ? `, ${amount}` : ""}, needs your eye before filing.`;
  }
  const place = entityName ? `filed under ${entityName}` : "filed";
  if (sideEffects.bookkeeping) {
    return `${title}${amount ? `, ${amount}` : ""}, ${place} and added to books.`;
  }
  if (sideEffects.draft && extraction.dueDate) {
    return `${title}${amount ? `, ${amount}` : ""}, ${place} with a reminder for ${extraction.dueDate} and a draft response ready.`;
  }
  if (sideEffects.draft) {
    return `${title}, ${place} and a draft response is ready.`;
  }
  if (extraction.dueDate) {
    return `${title}${amount ? `, ${amount}` : ""}, ${place} with a reminder for ${extraction.dueDate}.`;
  }
  return `${title}${amount ? `, ${amount}` : ""}, ${place}.`;
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
      } else if (job.kind === "extract") {
        outputSummary = await handleDocumentReassess(ctx, job);
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

  const { inlineText, fileParts } = await collectFileInputs(ctx, files);

  const prompt = buildExtractionPrompt({
    workspaceName: wsContext.workspace.name,
    entities: wsContext.entities,
    fileNames: files.map((file) => file.fileName),
    hintedEntityId: session.entityId,
    hintedCategory: session.category,
    hintedIntakeCategory: session.intakeCategory,
    inlineText,
  });

  const model = job.model || GEMINI_FLASH_MODEL;
  const { extraction, data } = await runExtractionModel(prompt, fileParts, model);
  const validEntityIds = new Set<string>(wsContext.entities.map((entity) => entity.id));
  let entityId: Id<"entities"> | undefined;
  if (
    extraction.entityId &&
    validEntityIds.has(extraction.entityId) &&
    extraction.entityConfidence >= 0.75
  ) {
    entityId = extraction.entityId as Id<"entities">;
  } else if (session.entityId && validEntityIds.has(session.entityId)) {
    entityId = session.entityId;
  }

  const entity = entityId
    ? wsContext.entities.find((candidate) => candidate.id === entityId)
    : undefined;
  const category = coarseCategoryForIntake(extraction.intakeCategory, extraction.category);
  const routing = routingDecision(extraction, Boolean(entityId));
  const sideEffect = bookkeepingSideEffect(extraction);
  const outcomeMessage = buildOutcomeMessage(extraction, entity?.name, {
    needsReview: routing.needsReview,
    bookkeeping: Boolean(sideEffect),
    draft: extraction.draftRecommended,
  });
  const extractedFields = intakeExtractedFields(extraction, {
    outcomeMessage,
    confirmationRequired: routing.confirmationRequired,
  });

  const documentId = await ctx.runMutation(
    internal.documentMutations.createFromExtraction,
    {
      workspaceId: job.workspaceId,
      captureSessionId: job.captureSessionId,
      source: session.source,
      createdBy: session.createdBy,
      title: extraction.title,
      category,
      intakeCategory: extraction.intakeCategory,
      documentType: extraction.documentType,
      issuer: extraction.issuer,
      reference: extraction.reference,
      summary: extraction.summary,
      actionSummary: extraction.actionSummary,
      outcomeMessage,
      draftResponse: extraction.draftRecommended ? extraction.draftResponse : undefined,
      draftReason: extraction.draftRecommended ? extraction.draftReason : undefined,
      entityId,
      confidence: extraction.confidence,
      entityConfidence: extraction.entityConfidence,
      needsReview: routing.needsReview,
      needsReviewReason: routing.reason ?? extraction.needsReviewReason,
      amountMinor: extraction.amountMinor,
      currency: extraction.currency,
      issuedDate: extraction.issuedDate,
      dueDate: extraction.dueDate,
      extractedFields,
      tags: extraction.tags,
    },
  );

  if (
    sideEffect &&
    entityId &&
    extraction.amountMinor !== undefined &&
    sideEffect.type
  ) {
    await ctx.runMutation(internal.bookkeeping.createFromDocument, {
      workspaceId: job.workspaceId,
      entityId,
      documentId,
      createdBy: session.createdBy,
      type: sideEffect.type,
      paymentMethod: sideEffect.paymentMethod,
      recordDate: timestampFromIsoDate(
        extraction.recordDate ?? extraction.issuedDate ?? extraction.dueDate,
      ) ?? Date.now(),
      amount: {
        amountMinor: Math.abs(Math.round(extraction.amountMinor)),
        currency: extraction.currency ?? "GBP",
      },
      description: extraction.title,
      category: sideEffect.category,
      notes: extraction.summary,
    });
  }

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

  return outcomeMessage;
}

async function handleDocumentReassess(
  ctx: ActionCtx,
  job: Doc<"processingJobs">,
): Promise<string> {
  if (!job.documentId) {
    throw new Error("extract job requires documentId");
  }

  const [doc, files, wsContext] = await Promise.all([
    ctx.runQuery(internal.processingQueries.getDocument, {
      documentId: job.documentId,
    }),
    ctx.runQuery(internal.processingQueries.getDocumentFiles, {
      documentId: job.documentId,
    }),
    ctx.runQuery(internal.processingQueries.getWorkspaceContext, {
      workspaceId: job.workspaceId,
    }),
  ]);

  if (!doc) throw new Error("Document not found");
  if (!wsContext) throw new Error("Workspace not found");

  const fileInputs = await collectFileInputs(ctx, files);
  const prompt = buildExtractionPrompt({
    workspaceName: wsContext.workspace.name,
    entities: wsContext.entities,
    fileNames: files.map((file) => file.fileName),
    hintedEntityId: doc.entityId,
    inlineText: [
      `Existing stored facts before reassessment:\n${buildDocumentText(doc)}`,
      ...fileInputs.inlineText,
    ],
  });

  const model = job.model || GEMINI_FLASH_MODEL;
  const { extraction, data } = await runExtractionModel(prompt, fileInputs.fileParts, model);
  const validEntityIds = new Set<string>(wsContext.entities.map((entity) => entity.id));
  let entityId: Id<"entities"> | undefined;
  if (
    extraction.entityId &&
    validEntityIds.has(extraction.entityId) &&
    extraction.entityConfidence >= 0.75
  ) {
    entityId = extraction.entityId as Id<"entities">;
  } else if (doc.entityId && validEntityIds.has(doc.entityId)) {
    entityId = doc.entityId;
  }

  const entity = entityId
    ? wsContext.entities.find((candidate) => candidate.id === entityId)
    : undefined;
  const category = coarseCategoryForIntake(extraction.intakeCategory, extraction.category);
  const routing = routingDecision(extraction, Boolean(entityId));
  const sideEffect = bookkeepingSideEffect(extraction);
  const outcomeMessage = buildOutcomeMessage(extraction, entity?.name, {
    needsReview: routing.needsReview,
    bookkeeping: Boolean(sideEffect),
    draft: extraction.draftRecommended,
  });
  const extractedFields = intakeExtractedFields(extraction, {
    outcomeMessage,
    confirmationRequired: routing.confirmationRequired,
  });
  const update = await ctx.runMutation(
    internal.documentMutations.updateFromExtraction,
    {
      documentId: doc._id,
      title: extraction.title,
      category,
      intakeCategory: extraction.intakeCategory,
      documentType: extraction.documentType,
      issuer: extraction.issuer,
      reference: extraction.reference,
      summary: extraction.summary,
      actionSummary: extraction.actionSummary,
      outcomeMessage,
      draftResponse: extraction.draftRecommended ? extraction.draftResponse : undefined,
      draftReason: extraction.draftRecommended ? extraction.draftReason : undefined,
      entityId,
      confidence: extraction.confidence,
      entityConfidence: extraction.entityConfidence,
      needsReview: routing.needsReview,
      needsReviewReason: routing.reason ?? extraction.needsReviewReason,
      amountMinor: extraction.amountMinor,
      currency: extraction.currency,
      issuedDate: extraction.issuedDate,
      dueDate: extraction.dueDate,
      extractedFields,
      tags: extraction.tags,
    },
  );

  if (
    sideEffect &&
    entityId &&
    extraction.amountMinor !== undefined &&
    sideEffect.type
  ) {
    await ctx.runMutation(internal.bookkeeping.createFromDocument, {
      workspaceId: job.workspaceId,
      entityId,
      documentId: doc._id,
      createdBy: doc.createdBy,
      type: sideEffect.type,
      paymentMethod: sideEffect.paymentMethod,
      recordDate: timestampFromIsoDate(
        extraction.recordDate ?? extraction.issuedDate ?? extraction.dueDate,
      ) ?? Date.now(),
      amount: {
        amountMinor: Math.abs(Math.round(extraction.amountMinor)),
        currency: extraction.currency ?? doc.amount?.currency ?? "GBP",
      },
      description: extraction.title,
      category: sideEffect.category,
      notes: extraction.summary,
    });
  }

  await recordOpenRouterUsage(ctx, {
    workspaceId: job.workspaceId,
    userId: doc.createdBy,
    entityId,
    documentId: doc._id,
    feature: "openrouter_extract",
    model,
    data,
  });

  await ctx.runMutation(internal.processingJobs.createInternal, {
    workspaceId: job.workspaceId,
    kind: "embed",
    documentId: doc._id,
    provider: job.provider,
    model: DOCUMENT_EMBEDDING_MODEL,
  });

  const changed = update.changedFields.length
    ? `updated ${update.changedFields.join(", ")}`
    : "no field changes";
  return `${outcomeMessage} (${changed})`;
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
  await ctx.runMutation(internal.documentMutations.clearTextChunksForDocument, {
    documentId: doc._id,
  });
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

async function collectFileInputs(
  ctx: ActionCtx,
  files: Array<Doc<"documentFiles">>,
) {
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
  return { inlineText, fileParts };
}

async function runExtractionModel(
  prompt: { system: string; user: string },
  fileParts: UserContentPart[],
  model: string,
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const userContent: UserContentPart[] = [
    { type: "text", text: prompt.user },
    ...fileParts,
  ];
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
      max_completion_tokens: 2800,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${openRouterError(data)}`);
  }

  return {
    extraction: normalizeExtraction(readMessageText(data)),
    data,
  };
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
  if (doc.outcomeMessage) textParts.push(`Outcome: ${doc.outcomeMessage}`);
  if (doc.issuer) textParts.push(`Issuer: ${doc.issuer}`);
  if (doc.reference) textParts.push(`Reference: ${doc.reference}`);
  if (doc.documentType) textParts.push(`Type: ${doc.documentType}`);
  if (doc.intakeCategory) textParts.push(`Intake category: ${doc.intakeCategory}`);
  if (doc.amount) {
    textParts.push(`Amount: ${doc.amount.amountMinor} ${doc.amount.currency}`);
  }
  if (doc.draftResponse) textParts.push(`Draft response: ${doc.draftResponse}`);
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
    intakeCategory: normalizeIntakeCategory(record.intakeCategory),
    documentType: stringValue(record.documentType) || "Document",
    issuer: optionalString(record.issuer),
    reference: optionalString(record.reference),
    entityId: optionalString(record.entityId),
    entityConfidence: clampNumber(record.entityConfidence, 0, 1, 0),
    confidence,
    needsReview: booleanValue(record.needsReview, true),
    needsReviewReason: optionalString(record.needsReviewReason),
    summary: optionalString(record.summary),
    actionSummary: optionalString(record.actionSummary),
    draftRecommended: booleanValue(record.draftRecommended, false),
    draftResponse: optionalString(record.draftResponse),
    draftReason: optionalString(record.draftReason),
    amountMinor: optionalNumber(record.amountMinor),
    currency: optionalString(record.currency)?.toUpperCase(),
    issuedDate: optionalIsoDate(record.issuedDate),
    dueDate: optionalIsoDate(record.dueDate),
    extractedFields: extractedFields(record.extractedFields),
    tags: stringArray(record.tags),
    bookkeepingCandidate: booleanValue(record.bookkeepingCandidate, false),
    bookkeepingType: normalizeBookkeepingType(record.bookkeepingType),
    paymentMethod: normalizePaymentMethod(record.paymentMethod),
    recordDate: optionalIsoDate(record.recordDate),
    bookkeepingCategory: optionalString(record.bookkeepingCategory),
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

function normalizeIntakeCategory(value: unknown): IntakeCategory {
  return INTAKE_CATEGORIES.includes(value as IntakeCategory)
    ? (value as IntakeCategory)
    : "unknown";
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

function timestampFromIsoDate(date: string | undefined) {
  if (!date) return undefined;
  const [year, month, day] = date.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day, 12);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function normalizeBookkeepingType(value: unknown): "income" | "expense" | undefined {
  return value === "income" || value === "expense" ? value : undefined;
}

function normalizePaymentMethod(value: unknown): "cash" | "card" | "bank" | "other" | undefined {
  return value === "cash" || value === "card" || value === "bank" || value === "other"
    ? value
    : undefined;
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
