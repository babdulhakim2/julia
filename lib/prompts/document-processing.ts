export const OPENROUTER_PROVIDER = "openrouter";
export const GEMINI_FLASH_MODEL = "google/gemini-2.5-flash";
export const DOCUMENT_EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const DOCUMENT_EMBEDDING_DIMENSIONS = 768;

export const PROMPT_KEYS = {
  documentExtraction: "document.extraction",
  entityMatch: "document.entity_match",
  documentFiling: "document.filing",
  documentEmbedding: "document.embedding",
  chatAnswer: "chat.answer",
} as const;

export type PromptKey = (typeof PROMPT_KEYS)[keyof typeof PROMPT_KEYS];

export interface PromptEntityContext {
  id: string;
  kind: "business" | "property" | "vehicle" | "personal";
  name: string;
  subtitle?: string;
  identifiers: Record<string, string>;
}

export interface DocumentPromptContext {
  workspaceName: string;
  entities: PromptEntityContext[];
  fileNames: string[];
}

export const DOCUMENT_EXTRACTION_OUTPUT_SCHEMA = {
  type: "object",
  required: [
    "title",
    "category",
    "documentType",
    "issuer",
    "entityId",
    "confidence",
    "needsReview",
    "extractedFields",
  ],
  properties: {
    title: { type: "string" },
    category: {
      type: "string",
      enum: [
        "finance",
        "tax",
        "utilities",
        "legal",
        "insurance",
        "fines",
        "people",
        "operations",
        "other",
      ],
    },
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
    issuedDate: { type: ["string", "null"], description: "ISO date, YYYY-MM-DD" },
    dueDate: { type: ["string", "null"], description: "ISO date, YYYY-MM-DD" },
    extractedFields: {
      type: "object",
      additionalProperties: { type: ["string", "number", "boolean", "null"] },
    },
    tags: { type: "array", items: { type: "string" } },
  },
};

export function buildDocumentExtractionPrompt(context: DocumentPromptContext) {
  return {
    key: PROMPT_KEYS.documentExtraction,
    provider: OPENROUTER_PROVIDER,
    model: GEMINI_FLASH_MODEL,
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
      "Known entities:",
      JSON.stringify(context.entities, null, 2),
      "Task:",
      "1. Read all pages as one capture session unless the content clearly contains separate documents.",
      "2. Identify the best entityId from the known entities, or null when uncertain.",
      "3. Classify the document category and documentType.",
      "4. Extract issuer, reference, amount, currency, issuedDate, dueDate, and useful fields.",
      "5. Set needsReview when confidence is below 0.8 or when a human should confirm the next action.",
      "Output schema:",
      JSON.stringify(DOCUMENT_EXTRACTION_OUTPUT_SCHEMA, null, 2),
    ].join("\n\n"),
  };
}

export function buildChatAnswerSystemPrompt() {
  return [
    "You are the chat assistant inside an AI-native company secretary SaaS.",
    "Answer using only the supplied workspace, entity, calendar, and document context.",
    "Use markdown formatting for clarity: bold for key figures, bullet lists for multiple items, headers for sections.",
    'When referencing a document, use a markdown link with the doc: scheme: [Document Title](doc:DOCUMENT_ID). Example: [Council Tax Bill Q2](doc:abc123).',
    "Never show a raw document ID as visible text; hide it inside the doc: markdown link only.",
    "If the context is insufficient, say what is missing and suggest the narrow next step.",
    "Never invent payment status, deadlines, company identifiers, or legal conclusions.",
  ].join("\n");
}
