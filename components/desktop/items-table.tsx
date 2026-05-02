'use client';

import React from 'react';
import type { Item, Entity } from '@/lib/types';
import { STATUS_META } from '@/lib/data';
import { dRel } from '@/lib/utils';
import { Ic } from '@/components/icons';

interface ItemsTableProps {
  items: Item[];
  ent: Record<string, Entity>;
  search: string;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ItemsTable({ items, ent, search, selectedId, onSelect }: ItemsTableProps) {
  const filtered = items.filter(i => search === '' ||
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.issuer || '').toLowerCase().includes(search.toLowerCase()));

  const ordered = [...filtered].sort((a, b) => {
    const order: Record<string, number> = { needs_review: 0, overdue: 1, due_soon: 2, drafting: 3, scheduled: 4, done: 5 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  if (ordered.length === 0) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nothing matches.</div>;
  }

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '32px 1fr 160px 110px 110px 110px',
        padding: '8px 24px', borderBottom: '0.5px solid var(--sep)',
        fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
        background: '#fff', position: 'sticky', top: 0, zIndex: 1,
      }}>
        <span></span>
        <span>Title</span>
        <span>Entity</span>
        <span>Status</span>
        <span style={{ textAlign: 'right' }}>Amount</span>
        <span style={{ textAlign: 'right' }}>Due</span>
      </div>

      {ordered.map(it => {
        const e = ent[it.entity || ''];
        const sel = selectedId === it.id;
        const meta = STATUS_META[it.status];
        return (
          <button key={it.id} onClick={() => onSelect(it.id)} style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 160px 110px 110px 110px',
            width: '100%', padding: '11px 24px', alignItems: 'center', gap: 0,
            background: sel ? 'var(--sel-bg)' : 'transparent', border: 0, borderBottom: '0.5px solid var(--hair)',
            fontFamily: 'var(--font)', textAlign: 'left', cursor: 'pointer', color: 'var(--ink)',
          }}
          onMouseEnter={(ev) => { if (!sel) ev.currentTarget.style.background = 'var(--row-hover)'; }}
          onMouseLeave={(ev) => { if (!sel) ev.currentTarget.style.background = 'transparent'; }}>
            <div style={{
              width: 22, height: 28, borderRadius: 4, background: '#fff',
              border: '0.5px solid var(--sep)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{Ic.doc(12, 'var(--muted)')}</div>
            <div style={{ minWidth: 0, paddingRight: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{it.issuer || it.type}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink2)', minWidth: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: e?.color, flexShrink: 0 }}></span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e?.name}</span>
            </div>
            <div>
              {meta && (
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 99,
                  fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color,
                }}>{meta.label}</span>
              )}
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
              {it.amount ? `£${it.amount.toLocaleString()}` : '—'}
            </div>
            <div style={{ textAlign: 'right', fontSize: 12.5, color: it.status === 'overdue' ? 'oklch(0.55 0.20 25)' : 'var(--ink2)', fontVariantNumeric: 'tabular-nums' }}>
              {dRel(it.dueDate)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
