'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { CalendarEventDraft, Entity, Item } from '@/lib/types';
import { useStore } from '@/lib/store';
import { Ic } from '@/components/icons';
import { AddEventModal } from '@/components/ui/add-event-modal';
import { TODAY } from '@/lib/data';
import {
  addMonths,
  dateKeyToStartAt,
  eventToCalendarEntry,
  itemToCalendarEntry,
  makeFallbackItem,
  monthGrid,
  monthRange,
  startOfMonth,
  type CalendarEntry,
} from '@/lib/calendar';

interface CalendarProps {
  items: Item[];
  ent: Record<string, Entity>;
  onSelect: (id: string) => void;
  onDocumentPreview?: (documentId: string) => void;
}

export function DesktopCalendar({ items, ent, onSelect, onDocumentPreview }: CalendarProps) {
  const { state, dispatch } = useStore();
  const [month, setMonth] = useState(() => startOfMonth(new Date(`${TODAY}T12:00:00`)));
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [addDate, setAddDate] = useState<string | null>(null);
  const workspace = useQuery(api.workspaces.getMyWorkspace);
  const range = useMemo(() => monthRange(month), [month]);
  const convexEvents = useQuery(
    api.events.listByWorkspace,
    workspace ? { workspaceId: workspace._id, from: range.from, to: range.to } : 'skip',
  );
  const createEvent = useMutation(api.events.create);
  const removeEvent = useMutation(api.events.remove);

  const entries = useMemo(() => {
    const remoteDocumentIds = new Set(
      (convexEvents ?? [])
        .map(event => event.documentId)
        .filter((id): id is Id<'documents'> => id !== undefined),
    );
    const documentEntries = items
      .map(itemToCalendarEntry)
      .filter((entry): entry is CalendarEntry =>
        entry !== null && (!entry.documentId || !remoteDocumentIds.has(entry.documentId as Id<'documents'>)),
      );
    const remoteEntries = (convexEvents ?? []).map(eventToCalendarEntry);
    return [...documentEntries, ...remoteEntries].sort((a, b) => a.startAt - b.startAt);
  }, [items, convexEvents]);

  const entriesByDate = useMemo(() => {
    const grouped: Record<string, CalendarEntry[]> = {};
    for (const entry of entries) {
      (grouped[entry.date] = grouped[entry.date] || []).push(entry);
    }
    return grouped;
  }, [entries]);

  const selectedEntries = entriesByDate[selectedDate] ?? [];
  const monthLabel = month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  async function handleAdd(event: CalendarEventDraft) {
    if (workspace) {
      await createEvent({
        workspaceId: workspace._id,
        entityId: event.entityId ? event.entityId as Id<'entities'> : undefined,
        kind: 'task',
        title: event.title,
        notes: event.amount ? `Amount: £${event.amount}` : event.notes,
        startAt: dateKeyToStartAt(event.date),
        allDay: true,
      });
    } else {
      dispatch({ type: 'ADD_ITEM', item: makeFallbackItem(event) });
    }
    setSelectedDate(event.date);
    setAddDate(null);
  }

  async function handleRemove(entry: CalendarEntry) {
    if (entry.eventId) {
      await removeEvent({ eventId: entry.eventId as Id<'events'> });
      return;
    }
    if (entry.removable && entry.itemId) {
      dispatch({ type: 'REMOVE_ITEM', id: entry.itemId });
    }
  }

  return (
    <div style={{ padding: '16px 24px 30px', display: 'flex', flexWrap: 'wrap', gap: 18, minHeight: 0, alignItems: 'flex-start' }}>
      <section style={{ flex: '1 1 420px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button onClick={() => setAddDate(selectedDate)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 7,
            background: 'var(--ink)', color: '#fff', border: 0, cursor: 'pointer',
            fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
          }}>{Ic.plus(13, '#fff', 2.4)} Add event</button>
          <button onClick={() => {
            const today = new Date(`${TODAY}T12:00:00`);
            setMonth(startOfMonth(today));
            setSelectedDate(TODAY);
          }} style={{
            padding: '7px 10px', borderRadius: 7, border: '0.5px solid var(--sep)',
            background: '#fff', color: 'var(--ink)', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
          }}>Today</button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setMonth(m => addMonths(m, -1))} title="Previous month" style={navButtonStyle}>
              {Ic.chevron(15, 'var(--accent)', 'left')}
            </button>
            <div style={{ minWidth: 150, textAlign: 'center', fontSize: 17, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              {monthLabel}
            </div>
            <button onClick={() => setMonth(m => addMonths(m, 1))} title="Next month" style={navButtonStyle}>
              {Ic.chevron(15, 'var(--accent)', 'right')}
            </button>
          </div>
        </div>

        <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '0.5px solid var(--hair)' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} style={{ padding: '9px 10px', fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {day}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {monthGrid(month).map((cell, index) => {
              if (!cell.date || cell.day === null) {
                return <div key={cell.key} style={{ minHeight: 88, borderRight: (index + 1) % 7 === 0 ? 0 : '0.5px solid var(--hair)', borderBottom: '0.5px solid var(--hair)', background: '#FAF9F5' }} />;
              }
              const dayEntries = entriesByDate[cell.date] ?? [];
              const selected = cell.date === selectedDate;
              const isToday = cell.date === TODAY;
              return (
                <button key={cell.key} onClick={() => setSelectedDate(cell.date!)} style={{
                  minHeight: 88, padding: 9, border: 0,
                  borderRight: (index + 1) % 7 === 0 ? 0 : '0.5px solid var(--hair)',
                  borderBottom: '0.5px solid var(--hair)',
                  background: selected ? 'var(--accent-soft)' : '#fff',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)',
                  display: 'flex', flexDirection: 'column', gap: 6,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 12,
                    background: isToday ? 'var(--ink)' : 'transparent',
                    color: isToday ? '#fff' : 'var(--ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12.5, fontWeight: selected || isToday ? 700 : 600,
                  }}>{cell.day}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 16, flexWrap: 'wrap', overflow: 'hidden' }}>
                    {dayEntries.slice(0, 4).map(entry => {
                      const entity = ent[entry.entityId ?? ''];
                      return (
                        <span key={entry.id} title={entry.title} style={{ width: 6, height: 6, borderRadius: 99, background: entity?.color ?? 'var(--muted)', flexShrink: 0 }} />
                      );
                    })}
                    {dayEntries.length > 4 && (
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, lineHeight: 1 }}>+{dayEntries.length - 4}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <aside style={{ borderLeft: '0.5px solid var(--sep)', paddingLeft: 18, minWidth: 240, maxWidth: 320, flex: '1 1 280px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {selectedEntries.length === 0 ? (
            <button onClick={() => setAddDate(selectedDate)} style={{
              padding: 14, borderRadius: 8, border: '1px dashed var(--sep)', background: '#fff',
              color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            }}>Add event</button>
          ) : selectedEntries.map(entry => {
            const entity = ent[entry.entityId ?? ''];
            return (
              <div key={entry.id} style={{ border: '0.5px solid var(--sep)', borderRadius: 8, background: '#FAF9F5', padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: 99, background: entity?.color ?? 'var(--muted)', flexShrink: 0 }} />
                  <button onClick={() => {
                    if (entry.documentId && onDocumentPreview) onDocumentPreview(entry.documentId);
                    else if (entry.itemId) onSelect(entry.itemId);
                  }} style={{
                    flex: 1, minWidth: 0, background: 'transparent', border: 0, padding: 0,
                    textAlign: 'left', cursor: entry.itemId || entry.documentId ? 'pointer' : 'default', fontFamily: 'var(--font)',
                  }}>
                    <div style={{
                      fontSize: 13.5, color: 'var(--ink)', fontWeight: 700, lineHeight: 1.3,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{entry.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                      {entity?.name ?? 'No entity'} · {entry.amount ? `£${entry.amount.toLocaleString()}` : entry.type}
                    </div>
                  </button>
                  {entry.removable && (
                    <button onClick={() => handleRemove(entry)} title="Remove event" style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 2 }}>
                      {Ic.x(14, 'var(--muted)')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {addDate && (
        <AddEventModal
          date={addDate}
          entities={state.entities}
          onAdd={handleAdd}
          onClose={() => setAddDate(null)}
        />
      )}
    </div>
  );
}

const navButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 7,
  border: '0.5px solid var(--sep)',
  background: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
