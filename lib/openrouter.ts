export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface OpenRouterChatResult {
  id?: string;
  model: string;
  content: string;
  usage?: OpenRouterUsage;
}

export class OpenRouterError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
    this.details = details;
  }
}

export function getOpenRouterStatus() {
  const hasKey = Boolean(process.env.OPENROUTER_API_KEY);
  return {
    configured: hasKey,
    provider: "openrouter",
    model: DEFAULT_OPENROUTER_MODEL,
    missing: hasKey ? [] : ["OPENROUTER_API_KEY"],
  };
}

export async function createOpenRouterStreamingCompletion({
  messages,
  model = DEFAULT_OPENROUTER_MODEL,
  maxTokens = 700,
  temperature = 0.2,
  sessionId,
}: {
  messages: OpenRouterMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  sessionId?: string;
}): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError("OPENROUTER_API_KEY is not configured", 503);
  }

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
      ...(sessionId ? { "X-Session-Id": sessionId } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_completion_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message =
      typeof data?.error?.message === "string"
        ? data.error.message
        : `OpenRouter streaming request failed with ${res.status}`;
    throw new OpenRouterError(message, res.status, data);
  }

  return res;
}

export async function createOpenRouterChatCompletion({
  messages,
  model = DEFAULT_OPENROUTER_MODEL,
  maxTokens = 700,
  temperature = 0.2,
  sessionId,
}: {
  messages: OpenRouterMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  sessionId?: string;
}): Promise<OpenRouterChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError("OPENROUTER_API_KEY is not configured", 503);
  }

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
      ...(sessionId ? { "X-Session-Id": sessionId } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_completion_tokens: maxTokens,
      stream: false,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof data?.error?.message === "string"
        ? data.error.message
        : `OpenRouter request failed with ${res.status}`;
    throw new OpenRouterError(message, res.status, data);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new OpenRouterError("OpenRouter response did not include text", 502, data);
  }

  return {
    id: typeof data.id === "string" ? data.id : undefined,
    model: typeof data.model === "string" ? data.model : model,
    content,
    usage: data.usage,
  };
}
