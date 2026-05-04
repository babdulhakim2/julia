'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useStore } from '@/lib/store';
import type { CalendarEventDraft } from '@/lib/types';
import { Ic } from '@/components/icons';
import { StatusPill } from '@/components/ui/status-pill';
import { NavBar } from '@/components/ui/nav-bar';
import { NavBtn } from '@/components/ui/nav-btn';
import { ListGroup } from '@/components/ui/list-group';
import { AddEventModal } from '@/components/ui/add-event-modal';
import { TODAY } from '@/lib/data';
import {
  addMonths,
  dateKeyToStartAt,
  entityMap,
  eventToCalendarEntry,
  itemToCalendarEntry,
  makeFallbackItem,
  monthGrid,
  monthRange,
  startOfMonth,
  type CalendarEntry,
} from '@/lib/calendar';

interface CalendarViewProps {
  onOpenItem: (id: string) => void;
  onDocumentPreview?: (documentId: string) => void;
}

export function CalendarView({ onOpenItem, onDocumentPreview }: CalendarViewProps) {
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

  const ent = useMemo(() => entityMap(state.entities), [state.entities]);
  const entries = useMemo(() => {
    const remoteDocumentIds = new Set(
      (convexEvents ?? [])
        .map(event => event.documentId)
        .filter((id): id is Id<'documents'> => id !== undefined),
    );
    const documentEntries = state.items
      .map(itemToCalendarEntry)
      .filter((entry): entry is CalendarEntry =>
        entry !== null && (!entry.documentId || !remoteDocumentIds.has(entry.documentId as Id<'documents'>)),
      );
    const remoteEntries = (convexEvents ?? []).map(eventToCalendarEntry);
    return [...documentEntries, ...remoteEntries].sort((a, b) => a.startAt - b.startAt);
  }, [state.items, convexEvents]);

  const entriesByDate = useMemo(() => {
    const grouped: Record<string, CalendarEntry[]> = {};
    for (const entry of entries) {
      (grouped[entry.date] = grouped[entry.date] || []).push(entry);
    }
    return grouped;
  }, [entries]);

  const selectedEntries = entriesByDate[selectedDate] ?? [];
  const openCount = entries.filter(entry => entry.status !== 'done').length;
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
    <div style={{ paddingBottom: 120 }}>
      <NavBar large title="Calendar" sub={`${monthLabel} · ${openCount} open`}
        trailing={<NavBtn onClick={() => setAddDate(selectedDate)}>{Ic.calendarPlus(22, 'var(--accent)')}</NavBtn>} />

      <div style={{ padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '0.5px solid var(--sep)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, padding: '0 2px' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{monthLabel}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setMonth(m => addMonths(m, -1))} title="Previous month" style={navButtonStyle}>
                {Ic.chevron(15, 'var(--accent)', 'left')}
              </button>
              <button onClick={() => setMonth(m => addMonths(m, 1))} title="Next month" style={navButtonStyle}>
                {Ic.chevron(15, 'var(--accent)', 'right')}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0,
            fontSize: 11, color: 'var(--muted)', fontWeight: 600, padding: '0 0 6px' }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={`${d}-${i}`} style={{ textAlign: 'center' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {monthGrid(month).map(cell => {
              if (!cell.date || cell.day === null) return <div key={cell.key} style={{ aspectRatio: '1' }} />;
              const dayEntries = entriesByDate[cell.date] ?? [];
              const isToday = cell.date === TODAY;
              const selected = cell.date === selectedDate;
              return (
                <button key={cell.key} onClick={() => setSelectedDate(cell.date!)} style={{
                  aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', position: 'relative',
                  borderRadius: 7, border: selected ? '1px solid var(--accent)' : '1px solid transparent',
                  background: isToday ? 'var(--ink)' : selected ? 'var(--accent-soft)' : 'transparent',
                  color: isToday ? '#fff' : 'var(--ink)',
                  fontSize: 14, fontWeight: isToday || selected ? 700 : 500,
                  cursor: 'pointer', fontFamily: 'var(--font)',
                }}>
                  {cell.day}
                  {dayEntries.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 2, position: 'absolute', bottom: 4 }}>
                      {dayEntries.slice(0, 3).map((entry) => {
                        const entity = ent[entry.entityId ?? ''];
                        return (
                          <span key={entry.id} style={{ width: 4, height: 4, borderRadius: 99, background: entity?.color ?? 'var(--accent)' }} />
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ListGroup header={new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}>
        {selectedEntries.length === 0 ? (
          <button onClick={() => setAddDate(selectedDate)} style={{
            width: '100%', padding: '14px', border: 0, background: 'transparent',
            color: 'var(--accent)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
          }}>Add event</button>
        ) : selectedEntries.map((entry, i) => {
          const e = ent[entry.entityId ?? ''];
          return (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              borderBottom: i === selectedEntries.length - 1 ? 'none' : '0.5px solid var(--hair)',
              cursor: entry.itemId || entry.documentId ? 'pointer' : 'default',
            }}>
              <div style={{ width: 3, height: 38, borderRadius: 99, background: e?.color ?? 'var(--muted)', flexShrink: 0 }}/>
              <div onClick={() => {
                if (entry.documentId && onDocumentPreview) onDocumentPreview(entry.documentId);
                else if (entry.itemId) onOpenItem(entry.itemId);
              }} style={{ flex: 1, minWidth: 0, cursor: entry.itemId || entry.documentId ? 'pointer' : 'default' }}>
                <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{entry.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{e?.name ?? 'No entity'} · {entry.amount ? `£${entry.amount}` : entry.type}</div>
              </div>
              {entry.source === 'item' ? <StatusPill status={entry.status === 'cancelled' ? 'scheduled' : entry.status} /> : null}
              {entry.removable && (
                <button onClick={() => handleRemove(entry)} title="Remove event" style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 4 }}>
                  {Ic.x(16, 'var(--muted)')}
                </button>
              )}
            </div>
          );
        })}
      </ListGroup>

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
