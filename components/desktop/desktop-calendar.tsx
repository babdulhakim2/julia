'use client';

import React, { useState } from 'react';
import type { Item, Entity } from '@/lib/types';
import { useStore } from '@/lib/store';
import { Ic } from '@/components/icons';
import { AddEventModal } from '@/components/ui/add-event-modal';
import { TODAY } from '@/lib/data';

interface CalendarProps {
  items: Item[];
  ent: Record<string, Entity>;
  onSelect: (id: string) => void;
}

export function DesktopCalendar({ items, ent, onSelect }: CalendarProps) {
  const { state, dispatch } = useStore();
  const [addDate, setAddDate] = useState<string | null>(null);
  const dated = items.filter(i => i.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));

  const groups: Record<string, Item[]> = {};
  dated.forEach(it => {
    const k = it.dueDate!.slice(0, 7);
    (groups[k] = groups[k] || []).push(it);
  });

  return (
    <div style={{ padding: '14px 24px 30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={() => setAddDate(TODAY)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 7,
          background: 'var(--ink)', color: '#fff', border: 0, cursor: 'pointer',
          fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
        }}>{Ic.plus(13, '#fff', 2.4)} Add event</button>
      </div>

      {Object.entries(groups).map(([month, list]) => (
        <div key={month} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            {new Date(month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </div>
          <div style={{ background: '#FAF9F5', borderRadius: 10, border: '0.5px solid var(--sep)', overflow: 'hidden' }}>
            {list.map((it, i) => {
              const e = ent[it.entity || ''];
              const d = new Date(it.dueDate!);
              return (
                <button key={it.id} onClick={() => onSelect(it.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                  background: 'transparent', border: 0, borderBottom: i === list.length - 1 ? 'none' : '0.5px solid var(--hair)',
                  cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left',
                }}>
                  <div style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)', lineHeight: 1, marginTop: 2 }}>{d.getDate()}</div>
                  </div>
                  <div style={{ width: 4, height: 32, borderRadius: 2, background: e?.color, flexShrink: 0 }}></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{it.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{e?.name}</div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                    {it.amount ? `£${it.amount.toLocaleString()}` : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

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
