'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Ic } from '@/components/icons';
import { StatusPill } from '@/components/ui/status-pill';
import { NavBar } from '@/components/ui/nav-bar';
import { NavBtn } from '@/components/ui/nav-btn';
import { ListGroup } from '@/components/ui/list-group';
import { AddEventModal } from '@/components/ui/add-event-modal';
import { TODAY } from '@/lib/data';

interface CalendarViewProps {
  onOpenItem: (id: string) => void;
}

export function CalendarView({ onOpenItem }: CalendarViewProps) {
  const { state, dispatch } = useStore();
  const [addDate, setAddDate] = useState<string | null>(null);
  const month = 'May 2026';
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const firstDow = 5; // May 1 2026 is a Friday
  const itemsByDay: Record<number, string[]> = {
    9: ['gas'], 14: ['pcn'], 28: ['lambeth'],
  };
  const colorFor = (k: string) => ({ gas: 'oklch(0.55 0.20 25)', pcn: 'oklch(0.62 0.14 60)', lambeth: 'oklch(0.55 0.10 240)' }[k]);
  const today = 2;

  const upcoming = state.items.filter(i => i.dueDate && i.status !== 'done').slice(0, 5);
  const ent = Object.fromEntries(state.entities.map(e => [e.id, e]));

  return (
    <div style={{ paddingBottom: 120 }}>
      <NavBar large title="Calendar" sub="May 2026 · 4 due"
        trailing={<NavBtn onClick={() => setAddDate(TODAY)}>{Ic.calendarPlus(22, 'var(--accent)')}</NavBtn>} />

      <div style={{ padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, padding: '0 4px' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>{month}</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer' }}>
                {Ic.chevron(15, 'var(--accent)', 'left')}
              </button>
              <button style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer' }}>
                {Ic.chevron(15, 'var(--accent)', 'right')}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0,
            fontSize: 11, color: 'var(--muted)', fontWeight: 500, padding: '0 0 6px' }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDow - 1 }).map((_, i) => <div key={'b' + i} />)}
            {days.map(d => {
              const has = itemsByDay[d];
              const isToday = d === today;
              return (
                <div key={d} onClick={() => setAddDate(`2026-05-${String(d).padStart(2, '0')}`)} style={{
                  aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', position: 'relative',
                  borderRadius: 8,
                  background: isToday ? 'var(--ink)' : 'transparent',
                  color: isToday ? '#fff' : 'var(--ink)',
                  fontSize: 14, fontWeight: isToday ? 600 : 400,
                  cursor: 'pointer',
                }}>
                  {d}
                  {has && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 2, position: 'absolute', bottom: 4 }}>
                      {has.map((k, i) => (
                        <span key={i} style={{ width: 4, height: 4, borderRadius: 99, background: colorFor(k) }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ListGroup header="What's coming">
        {upcoming.map((it, i) => {
          const e = ent[it.entity || ''];
          return (
            <div key={it.id} onClick={() => onOpenItem(it.id)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
              borderBottom: i === upcoming.length - 1 ? 'none' : '0.5px solid var(--hair)',
              cursor: 'pointer',
            }}>
              <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {new Date(it.dueDate!).toLocaleDateString('en-GB', { month: 'short' })}
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', lineHeight: 1, fontFamily: 'var(--font-display)' }}>
                  {new Date(it.dueDate!).getDate()}
                </div>
              </div>
              <div style={{ width: 3, height: 36, borderRadius: 99, background: e?.color }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{it.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{e?.name} · {it.amount ? `£${it.amount}` : it.type}</div>
              </div>
              <StatusPill status={it.status} />
            </div>
          );
        })}
      </ListGroup>

      {addDate && (
        <AddEventModal
          date={addDate}
          entities={state.entities}
          onAdd={(item) => {
            dispatch({ type: 'ADD_ITEM', item });
            setAddDate(null);
          }}
          onClose={() => setAddDate(null)}
        />
      )}
    </div>
  );
}
