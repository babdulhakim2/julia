import type { Item } from './types';

export interface AttentionItem {
  item: Item;
  score: number;
  reason: string;
  tone: 'critical' | 'urgent' | 'review' | 'soon';
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysUntil(dueDate: string, today: string) {
  const due = new Date(`${dueDate}T12:00:00`).getTime();
  const now = new Date(`${today}T12:00:00`).getTime();
  return Math.round((due - now) / DAY_MS);
}

function dueReason(days: number) {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  return `due in ${days} days`;
}

export function getAttentionItems(items: Item[], now = new Date()): AttentionItem[] {
  const today = dateKey(now);
  const seen = new Set<string>();
  const attention: AttentionItem[] = [];

  for (const item of items) {
    if (item.status === 'done') continue;

    let candidate: AttentionItem | null = null;
    const confidence = item.confidence ?? 1;

    if (item.status === 'overdue') {
      candidate = {
        item,
        score: 120,
        reason: item.dueDate ? dueReason(daysUntil(item.dueDate, today)) : 'overdue',
        tone: 'critical',
      };
    } else if (item.dueDate) {
      const days = daysUntil(item.dueDate, today);
      if (days < 0) {
        candidate = { item, score: 120 + Math.min(Math.abs(days), 14), reason: dueReason(days), tone: 'critical' };
      } else if (days <= 3) {
        candidate = { item, score: 105 - days, reason: dueReason(days), tone: 'urgent' };
      } else if (days <= 14) {
        candidate = { item, score: 80 - days, reason: dueReason(days), tone: 'soon' };
      }
    }

    if (item.status === 'needs_review' || confidence < 0.8) {
      const reviewScore = item.status === 'needs_review' ? 95 : 72;
      if (!candidate || reviewScore > candidate.score) {
        candidate = {
          item,
          score: reviewScore,
          reason: confidence < 0.8 ? `${Math.round(confidence * 100)}% confidence - review` : 'needs review',
          tone: 'review',
        };
      }
    }

    if (item.status === 'drafting' || item.drafted) {
      const draftScore = 64;
      if (!candidate || draftScore > candidate.score) {
        candidate = { item, score: draftScore, reason: 'draft waiting', tone: 'review' };
      }
    }

    if (candidate && !seen.has(item.id)) {
      seen.add(item.id);
      attention.push(candidate);
    }
  }

  return attention.sort((a, b) => b.score - a.score);
}

export function attentionSummary(attention: AttentionItem[]) {
  const top = attention[0];
  const critical = attention.filter(a => a.tone === 'critical' || a.tone === 'urgent').length;
  const review = attention.filter(a => a.tone === 'review').length;

  if (!top) {
    return {
      label: 'Nothing urgent right now',
      detail: 'No deadlines or review items need attention today.',
      critical,
      review,
    };
  }

  return {
    label: `${attention.length} item${attention.length === 1 ? '' : 's'} need attention`,
    detail: `${top.item.title} is ${top.reason}.`,
    critical,
    review,
  };
}
