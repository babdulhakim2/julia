import type { StoreState } from "@/lib/store";
import type { UsageEvent } from "@/lib/types";

export interface AssistantReply {
  text: string;
  items?: string[];
  usageEvent?: UsageEvent;
  source: "openrouter" | "local";
}

export function buildAssistantContext(state: StoreState) {
  const entityById = new Map(state.entities.map((entity) => [entity.id, entity]));
  return {
    entities: state.entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      subtitle: entity.sub,
      identifiers: entity.info,
    })),
    openItems: state.items
      .filter((item) => item.status !== "done")
      .map((item) => ({
        entity: item.entity ? entityById.get(item.entity)?.name ?? item.entity : null,
        category: item.category,
        type: item.type,
        document: item.convexDocumentId
          ? `[${item.title}](doc:${item.convexDocumentId})`
          : item.title,
        amount: item.amount,
        dueDate: item.dueDate,
        issuer: item.issuer,
        status: item.status,
      })),
  };
}

export async function askSecretary(question: string, state: StoreState): Promise<AssistantReply> {
  try {
    const res = await fetch("/api/ai/openrouter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "chat",
        question,
        context: buildAssistantContext(state),
        maxTokens: 650,
        temperature: 0.2,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return localSecretaryReply(question, state, data.error);
    }

    const totalTokens =
      typeof data.usage?.total_tokens === "number"
        ? data.usage.total_tokens
        : undefined;

    return {
      text: data.content,
      source: "openrouter",
      usageEvent: totalTokens
        ? {
            id: `usage-${Date.now()}`,
            feature: "openrouter_chat",
            quantity: totalTokens,
            unit: "token",
            provider: "openrouter",
            model: data.model,
            occurredAt: new Date().toISOString(),
          }
        : undefined,
    };
  } catch (error) {
    return localSecretaryReply(
      question,
      state,
      error instanceof Error ? error.message : "OpenRouter unavailable",
    );
  }
}

export async function askSecretaryStreaming(
  question: string,
  state: StoreState,
  onChunk: (accumulatedText: string) => void,
  documentContext?: string,
  conversationHistory?: Array<{ role: string; content: string }>,
): Promise<AssistantReply> {
  try {
    const res = await fetch("/api/ai/openrouter/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        context: buildAssistantContext(state),
        documentContext,
        conversationHistory,
        maxTokens: 650,
        temperature: 0.2,
      }),
    });

    if (!res.ok || !res.body) {
      return localSecretaryReply(question, state, `Stream error: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === "string") {
            accumulated += delta;
            onChunk(accumulated);
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }

    return {
      text: accumulated || "No response received.",
      source: "openrouter",
    };
  } catch (error) {
    return localSecretaryReply(
      question,
      state,
      error instanceof Error ? error.message : "Streaming unavailable",
    );
  }
}

export function localSecretaryReply(
  question: string,
  state: StoreState,
  reason?: string,
): AssistantReply {
  const t = question.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekKey = nextWeek.toISOString().slice(0, 10);
  const dueItems = state.items
    .filter((item) =>
      item.status === "overdue" ||
      item.status === "due_soon" ||
      (item.dueDate !== undefined && item.dueDate >= today && item.dueDate <= nextWeekKey),
    )
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  let text = "I need OpenRouter configured before I can answer with the LLM.";
  let items: string[] | undefined;

  if (t.includes("due") && (t.includes("week") || t.includes("soon"))) {
    const amount = dueItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const lines = dueItems.slice(0, 8).map((item) => {
      const title = item.convexDocumentId
        ? `[${item.title}](doc:${item.convexDocumentId})`
        : item.title;
      const due = item.dueDate ? `due ${item.dueDate}` : "no due date";
      const itemAmount = item.amount ? `, £${item.amount.toLocaleString()}` : "";
      return `- ${title}: ${due}${itemAmount}`;
    });
    text = [
      "## Due this week",
      `You have **${dueItems.length}** open due item${dueItems.length === 1 ? "" : "s"}${amount ? `, totalling **£${amount.toLocaleString()}**` : ""}.`,
      lines.length ? lines.join("\n") : "Nothing is due in the next 7 days.",
    ].join("\n\n");
    items = dueItems.map((item) => item.id);
  } else if (t.includes("mot")) {
    const item = state.items.find((candidate) => candidate.type.toLowerCase().includes("mot"));
    const title = item?.convexDocumentId
      ? `[${item.title}](doc:${item.convexDocumentId})`
      : item?.title;
    text = item?.dueDate
      ? `${title ?? "MOT"} is due **${item.dueDate}**.`
      : "I could not find an MOT item.";
    items = item ? [item.id] : undefined;
  } else if (t.includes("overdue")) {
    const overdue = state.items.filter((item) => item.status === "overdue");
    const lines = overdue.slice(0, 8).map((item) => {
      const title = item.convexDocumentId
        ? `[${item.title}](doc:${item.convexDocumentId})`
        : item.title;
      return `- ${title}${item.dueDate ? `: due ${item.dueDate}` : ""}`;
    });
    text = overdue.length
      ? ["## Overdue", `You have **${overdue.length}** overdue item${overdue.length === 1 ? "" : "s"}.`, lines.join("\n")].join("\n\n")
      : "No overdue items in the current workspace.";
    items = overdue.map((item) => item.id);
  }

  return {
    text: reason ? `${text} (${reason})` : text,
    items,
    source: "local",
  };
}
