import { NextResponse } from "next/server";
import {
  createOpenRouterChatCompletion,
  getOpenRouterStatus,
  OpenRouterError,
  type OpenRouterMessage,
} from "@/lib/openrouter";
import { buildChatAnswerSystemPrompt } from "@/lib/prompts/document-processing";

interface OpenRouterRouteBody {
  task?: "chat" | "document_extraction" | "health_check";
  question?: string;
  context?: unknown;
  messages?: OpenRouterMessage[];
  maxTokens?: number;
  temperature?: number;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    openrouter: getOpenRouterStatus(),
  });
}

export async function POST(request: Request) {
  let body: OpenRouterRouteBody;

  try {
    body = (await request.json()) as OpenRouterRouteBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const task = body.task ?? "chat";
  const messages = buildMessages(task, body);

  if (messages.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Provide a question or messages" },
      { status: 400 },
    );
  }

  try {
    const result = await createOpenRouterChatCompletion({
      messages,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
      sessionId: `secretary-${task}`,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      openrouter: getOpenRouterStatus(),
    });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          status: error.status,
          details: error.details,
          openrouter: getOpenRouterStatus(),
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "OpenRouter request failed",
        openrouter: getOpenRouterStatus(),
      },
      { status: 500 },
    );
  }
}

function buildMessages(task: NonNullable<OpenRouterRouteBody["task"]>, body: OpenRouterRouteBody) {
  if (body.messages?.length) {
    return body.messages;
  }

  if (task === "health_check") {
    return [
      {
        role: "system" as const,
        content:
          "You are a production health-check endpoint. Reply with one compact sentence.",
      },
      {
        role: "user" as const,
        content:
          "Confirm OpenRouter Gemini 2.5 Flash is reachable for Secretary admin monitoring.",
      },
    ];
  }

  if (!body.question?.trim()) {
    return [];
  }

  const context = body.context
    ? JSON.stringify(body.context).slice(0, 24000)
    : "No workspace context supplied.";

  return [
    {
      role: "system" as const,
      content: buildChatAnswerSystemPrompt(),
    },
    {
      role: "user" as const,
      content: [
        "Workspace context:",
        context,
        "",
        `Question: ${body.question.trim()}`,
      ].join("\n"),
    },
  ];
}
