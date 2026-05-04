import {
  createOpenRouterStreamingCompletion,
  getOpenRouterStatus,
  OpenRouterError,
  type OpenRouterMessage,
} from "@/lib/openrouter";
import { buildChatAnswerSystemPrompt } from "@/lib/prompts/document-processing";

interface StreamRouteBody {
  question?: string;
  context?: unknown;
  documentContext?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

export async function POST(request: Request) {
  let body: StreamRouteBody;

  try {
    body = (await request.json()) as StreamRouteBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.question?.trim()) {
    return new Response(JSON.stringify({ error: "Provide a question" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contextStr = body.context
    ? JSON.stringify(body.context).slice(0, 24000)
    : "No workspace context supplied.";

  const userParts = ["Workspace context:", contextStr];

  if (body.documentContext) {
    userParts.push("", "Relevant document excerpts:", body.documentContext);
  }

  userParts.push("", `Question: ${body.question.trim()}`);

  const messages: OpenRouterMessage[] = [
    { role: "system", content: buildChatAnswerSystemPrompt() },
  ];

  // Inject conversation history for multi-turn context
  if (body.conversationHistory && Array.isArray(body.conversationHistory)) {
    for (const msg of body.conversationHistory) {
      if (
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string"
      ) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }
  }

  messages.push({ role: "user", content: userParts.join("\n") });

  try {
    const response = await createOpenRouterStreamingCompletion({
      messages,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
      sessionId: "julia-chat-stream",
    });

    // Pipe the SSE stream through to the client
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          openrouter: getOpenRouterStatus(),
        }),
        {
          status: error.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Streaming request failed",
        openrouter: getOpenRouterStatus(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
