'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { STATUS_META } from '@/lib/data';
import { Ic } from '@/components/icons';

interface InspectorProps {
  itemId: string;
}

function Field({ label, value, dotColor, last }: { label: string; value?: string; dotColor?: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 0', borderBottom: last ? 'none' : '0.5px solid var(--hair)', gap: 14 }}>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {dotColor && <span style={{ width: 8, height: 8, borderRadius: 99, background: dotColor }}></span>}
        {value}
      </span>
    </div>
  );
}

export function DesktopInspector({ itemId }: InspectorProps) {
  const { state } = useStore();
  const it = state.items.find(i => i.id === itemId);
  const e = state.entities.find(x => x.id === it?.entity);
  const meta = it ? STATUS_META[it.status] : null;

  if (!it) {
    return (
      <aside style={{ background: 'var(--inspector-bg)', padding: 30, fontSize: 13, color: 'var(--muted)' }}>
        Select an item to see details.
      </aside>
    );
  }

  return (
    <aside style={{ background: 'var(--inspector-bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Document preview */}
      <div style={{ padding: 18, borderBottom: '0.5px solid var(--sep)' }}>
        <div style={{
          aspectRatio: '0.78', background: '#fff', borderRadius: 10, padding: 18,
          border: '0.5px solid var(--sep)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 4px 18px rgba(0,0,0,0.05)',
          display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden',
        }}>
          <div style={{ fontSize: 9, color: 'var(--muted2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {it.issuer || it.type}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>{it.title}</div>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} style={{ height: 4, background: 'oklch(0.92 0.01 80)', borderRadius: 2, width: `${65 + (n*5) % 35}%` }}></div>
            ))}
          </div>
          {it.amount && (
            <div style={{ marginTop: 'auto', padding: '8px 0 0', borderTop: '0.5px solid var(--hair)' }}>
              <div style={{ fontSize: 9, color: 'var(--muted2)', textTransform: 'uppercase', fontWeight: 600 }}>Amount due</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>£{it.amount.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div style={{ padding: 18, flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{it.type}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)', letterSpacing: -0.3, lineHeight: 1.2, marginBottom: 6 }}>{it.title}</div>
        {meta && (
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 99,
            fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color,
          }}>{meta.label}</span>
        )}

        <div style={{ marginTop: 18, background: '#fff', borderRadius: 10, border: '0.5px solid var(--sep)', padding: '4px 14px' }}>
          <Field label="Entity" value={e?.name} dotColor={e?.color} />
          {it.amount ? <Field label="Amount" value={`£${it.amount.toLocaleString()}${it.fullAmount ? ` (£${it.fullAmount} after)` : ''}`} /> : null}
          {it.dueDate ? <Field label="Due" value={new Date(it.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} /> : null}
          {it.issuer ? <Field label="Issuer" value={it.issuer} /> : null}
          {it.ref ? <Field label="Reference" value={it.ref} /> : null}
          {it.date ? <Field label="Filed" value={new Date(it.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} last /> : null}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: 14, borderTop: '0.5px solid var(--sep)', display: 'flex', gap: 8 }}>
        <button style={{
          flex: 1, padding: '8px 12px', borderRadius: 8,
          background: 'rgba(0,0,0,0.05)', border: 0, cursor: 'pointer',
          fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font)',
        }}>Open original</button>
        <button style={{
          flex: 1, padding: '8px 12px', borderRadius: 8,
          background: 'var(--ink)', color: '#fff', border: 0, cursor: 'pointer',
          fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
        }}>Mark handled</button>
      </div>
    </aside>
  );
}
