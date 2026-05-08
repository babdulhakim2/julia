import { NextResponse } from "next/server";
import { OPENROUTER_BASE_URL } from "@/lib/openrouter";

const FLASH_LITE_MODEL = "google/gemini-2.5-flash-lite";
const FLASH_MODEL = "google/gemini-2.5-flash";
const MIN_ENTITY_CONFIDENCE = 0.78;
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

interface CapturePreviewBody {
  pages?: Array<{
    name?: string;
    contentType?: string;
    dataUrl?: string;
  }>;
  entities?: Array<{
    id: string;
    kind: string;
    name: string;
    subtitle?: string;
    identifiers?: Record<string, string>;
  }>;
}

type PreviewContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "documentType", "category", "intakeCategory", "issuer", "entityId", "confidence", "reason", "fields"],
  properties: {
    title: { type: "string" },
    documentType: { type: "string" },
    category: { type: "string", enum: DOCUMENT_CATEGORIES },
    intakeCategory: { type: "string", enum: INTAKE_CATEGORIES },
    issuer: { type: ["string", "null"] },
    entityId: { type: ["string", "null"] },
    confidence: { type: "number" },
    reason: { type: ["string", "null"] },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["k", "v"],
        properties: {
          k: { type: "string" },
          v: { type: "string" },
        },
      },
    },
  },
};

export async function POST(request: Request) {
  let body: CapturePreviewBody;
  try {
    body = (await request.json()) as CapturePreviewBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const pages = (body.pages ?? [])
    .filter(page => page.name || page.dataUrl)
    .slice(0, 3);
  const entities = (body.entities ?? []).slice(0, 100);

  if (pages.length === 0) {
    return NextResponse.json({ ok: false, error: "Provide at least one file" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "OPENROUTER_API_KEY is not configured" }, { status: 503 });
  }

  try {
    const result = await classify(apiKey, FLASH_LITE_MODEL, pages, entities)
      .catch(async (error) => {
        if (error instanceof OpenRouterCaptureError && (error.status === 400 || error.status === 404)) {
          return classify(apiKey, FLASH_MODEL, pages, entities);
        }
        throw error;
      });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Capture preview failed";
    const status = error instanceof OpenRouterCaptureError ? error.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

async function classify(
  apiKey: string,
  model: string,
  pages: NonNullable<CapturePreviewBody["pages"]>,
  entities: NonNullable<CapturePreviewBody["entities"]>,
) {
  const referer =
    process.env.OPENROUTER_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3003";

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME || "Julia",
      "X-Title": process.env.OPENROUTER_APP_NAME || "Julia",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: [
            "You classify freshly captured document photos for Julia.",
            "Your job is fast preview only: infer likely entity, category, and lightweight metadata.",
            "Use only the supplied entity IDs. Return null when uncertain.",
            `Use category from: ${DOCUMENT_CATEGORIES.join(", ")}.`,
            `Use intakeCategory from: ${INTAKE_CATEGORIES.join(", ")}.`,
            "Income/takings should use takings.card or takings.cash when visible. Supplier receipts and bills should use expense.*. Admin letters should use the closest tax, vehicle, property, legal, insurance, utility, or correspondence category.",
            "Return strict JSON matching the schema. Do not include markdown.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Known entities:",
                JSON.stringify(entities, null, 2),
                "",
                "Uploaded files:",
                JSON.stringify(pages.map(page => ({
                  name: page.name ?? "unnamed",
                  contentType: page.contentType ?? contentTypeFromDataUrl(page.dataUrl),
                  hasInlineContent: Boolean(page.dataUrl),
                })), null, 2),
                "",
                "Classify these captured pages/files as one document. Prefer exact identifier/name/address evidence over guessing.",
              ].join("\n"),
            },
            ...pages.flatMap(fileContentPart),
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "capture_preview",
          strict: true,
          schema: OUTPUT_SCHEMA,
        },
      },
      temperature: 0,
      max_completion_tokens: 700,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof data?.error?.message === "string"
        ? data.error.message
        : `OpenRouter request failed with ${res.status}`;
    throw new OpenRouterCaptureError(message, res.status);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new OpenRouterCaptureError("OpenRouter response did not include JSON", 502);
  }

  const parsed = JSON.parse(content.replace(/^```json?\s*/i, "").replace(/\s*```\s*$/i, "").trim()) as Record<string, unknown>;
  const entityIds = new Set(entities.map(entity => entity.id));
  const confidence = typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0;
  const entityId = typeof parsed.entityId === "string" && entityIds.has(parsed.entityId) && confidence >= MIN_ENTITY_CONFIDENCE
    ? parsed.entityId
    : null;

  return {
    model,
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "Captured document",
    documentType: typeof parsed.documentType === "string" && parsed.documentType.trim() ? parsed.documentType.trim() : "Document",
    category: normalizeCategory(parsed.category),
    intakeCategory: normalizeIntakeCategory(parsed.intakeCategory),
    issuer: typeof parsed.issuer === "string" && parsed.issuer.trim() ? parsed.issuer.trim() : null,
    entityId,
    confidence,
    reason: typeof parsed.reason === "string" && parsed.reason.trim() ? parsed.reason.trim() : null,
    fields: Array.isArray(parsed.fields)
      ? parsed.fields
          .map((field) => {
            const record = field && typeof field === "object" ? field as Record<string, unknown> : {};
            return {
              k: typeof record.k === "string" ? record.k : "",
              v: typeof record.v === "string" ? record.v : "",
            };
          })
          .filter(field => field.k && field.v)
          .slice(0, 4)
      : [],
  };
}

function fileContentPart(page: NonNullable<CapturePreviewBody["pages"]>[number]): PreviewContentPart[] {
  if (!page.dataUrl) return [];
  if (page.dataUrl.startsWith("data:image/")) {
    return [{
      type: "image_url",
      image_url: { url: page.dataUrl },
    }];
  }
  return [{
    type: "file",
    file: {
      filename: page.name || "upload",
      file_data: page.dataUrl,
    },
  }];
}

function contentTypeFromDataUrl(dataUrl?: string) {
  const match = dataUrl?.match(/^data:([^;,]+)/);
  return match?.[1] ?? "unknown";
}

function normalizeCategory(value: unknown) {
  return DOCUMENT_CATEGORIES.includes(value as (typeof DOCUMENT_CATEGORIES)[number])
    ? value
    : "other";
}

function normalizeIntakeCategory(value: unknown) {
  return INTAKE_CATEGORIES.includes(value as (typeof INTAKE_CATEGORIES)[number])
    ? value
    : "unknown";
}

class OpenRouterCaptureError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenRouterCaptureError";
    this.status = status;
  }
}
