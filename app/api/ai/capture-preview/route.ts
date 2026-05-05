import { NextResponse } from "next/server";
import { OPENROUTER_BASE_URL } from "@/lib/openrouter";

const FLASH_LITE_MODEL = "google/gemini-2.5-flash-lite";
const FLASH_MODEL = "google/gemini-2.5-flash";

interface CapturePreviewBody {
  pages?: Array<{
    name?: string;
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

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "documentType", "issuer", "entityId", "confidence", "reason", "fields"],
  properties: {
    title: { type: "string" },
    documentType: { type: "string" },
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

  const pages = (body.pages ?? []).filter(page => page.dataUrl?.startsWith("data:image/")).slice(0, 3);
  const entities = (body.entities ?? []).slice(0, 100);

  if (pages.length === 0) {
    return NextResponse.json({ ok: false, error: "Provide at least one image page" }, { status: 400 });
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
            "Your job is fast preview only: infer a likely entity and lightweight metadata.",
            "Use only the supplied entity IDs. Return null when uncertain.",
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
                "Classify these captured pages as one document. Prefer exact identifier/name/address evidence over guessing.",
              ].join("\n"),
            },
            ...pages.map(page => ({
              type: "image_url",
              image_url: { url: page.dataUrl! },
            })),
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
  const entityId = typeof parsed.entityId === "string" && entityIds.has(parsed.entityId)
    ? parsed.entityId
    : null;

  return {
    model,
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "Captured document",
    documentType: typeof parsed.documentType === "string" && parsed.documentType.trim() ? parsed.documentType.trim() : "Document",
    issuer: typeof parsed.issuer === "string" && parsed.issuer.trim() ? parsed.issuer.trim() : null,
    entityId,
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
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

class OpenRouterCaptureError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenRouterCaptureError";
    this.status = status;
  }
}
