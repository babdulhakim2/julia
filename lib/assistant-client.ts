import type { StoreState } from "@/lib/store";
import type { UsageEvent } from "@/lib/types";

export interface AssistantReply {
  text: string;
  items?: string[];
  usageEvent?: UsageEvent;
  source: "openrouter" | "local";
}

export function buildAssistantContext(state: StoreState) {
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
        id: item.id,
        entity: item.entity,
        category: item.category,
        type: item.type,
        title: item.title,
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

export function localSecretaryReply(
  question: string,
  state: StoreState,
  reason?: string,
): AssistantReply {
  const t = question.toLowerCase();
  const dueItems = state.items.filter(
    (item) => item.status === "due_soon" || item.status === "overdue",
  );

  let text = "I need OpenRouter configured before I can answer with the LLM.";
  let items: string[] | undefined;

  if (t.includes("due") && (t.includes("week") || t.includes("soon"))) {
    const amount = dueItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    text = `${dueItems.length} open due items, £${amount.toLocaleString()} total.`;
    items = dueItems.map((item) => item.id);
  } else if (t.includes("mot")) {
    const item = state.items.find((candidate) => candidate.type.toLowerCase().includes("mot"));
    text = item?.dueDate
      ? `MOT is due ${item.dueDate}.`
      : "I could not find an MOT item.";
    items = item ? [item.id] : undefined;
  } else if (t.includes("overdue")) {
    const overdue = state.items.filter((item) => item.status === "overdue");
    text = overdue.length
      ? `${overdue.length} overdue item${overdue.length === 1 ? "" : "s"}.`
      : "No overdue items in the current workspace.";
    items = overdue.map((item) => item.id);
  }

  return {
    text: reason ? `${text} (${reason})` : text,
    items,
    source: "local",
  };
}
