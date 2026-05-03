import type { CalendarEventDraft, Entity, Item } from './types';

export interface CalendarEntry {
  id: string;
  source: 'item' | 'event';
  title: string;
  date: string;
  startAt: number;
  entityId: string | null;
  amount?: number;
  type: string;
  status: Item['status'] | 'cancelled';
  removable: boolean;
  itemId?: string;
  eventId?: string;
  documentId?: string;
}

export function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateKeyToStartAt(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 9).getTime();
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function monthRange(date: Date) {
  const from = startOfMonth(date);
  const to = addMonths(from, 1);
  return { from: from.getTime(), to: to.getTime() };
}

export function monthGrid(date: Date) {
  const first = startOfMonth(date);
  const firstWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: Array<{ key: string; day: number | null; date?: string }> = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ key: `blank-${i}`, day: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      key: `${first.getFullYear()}-${first.getMonth()}-${day}`,
      day,
      date: dateKey(new Date(first.getFullYear(), first.getMonth(), day)),
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${cells.length}`, day: null });
  }
  return cells;
}

export function itemToCalendarEntry(item: Item): CalendarEntry | null {
  if (!item.dueDate || item.status === 'done') return null;
  return {
    id: `item:${item.id}`,
    source: 'item',
    title: item.title,
    date: item.dueDate,
    startAt: dateKeyToStartAt(item.dueDate),
    entityId: item.entity,
    amount: item.amount,
    type: item.type,
    status: item.status,
    removable: item.id.startsWith('ev-'),
    itemId: item.id,
    documentId: item.convexDocumentId,
  };
}

export function eventToCalendarEntry(event: {
  _id: string;
  title: string;
  startAt: number;
  entityId?: string;
  documentId?: string;
  kind: string;
  status: 'scheduled' | 'done' | 'cancelled';
}): CalendarEntry {
  return {
    id: `event:${event._id}`,
    source: 'event',
    title: event.title,
    date: dateKey(new Date(event.startAt)),
    startAt: event.startAt,
    entityId: event.entityId ?? null,
    type: event.kind,
    status: event.status === 'done' ? 'done' : 'scheduled',
    removable: true,
    eventId: event._id,
    documentId: event.documentId,
  };
}

export function makeFallbackItem(event: CalendarEventDraft): Item {
  return {
    id: `ev-${Date.now()}`,
    entity: event.entityId,
    category: 'operations',
    type: 'Reminder',
    title: event.title,
    dueDate: event.date,
    date: event.date,
    amount: event.amount,
    status: 'scheduled',
    confidence: 1,
    capturedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
}

export function entityMap(entities: Entity[]) {
  return Object.fromEntries(entities.map((entity) => [entity.id, entity]));
}
