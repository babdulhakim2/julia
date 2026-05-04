'use client';

import React from 'react';
import { Ic } from '@/components/icons';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  search: string;
  setSearch: (s: string) => void;
  onCapture: () => void;
}

export function PageHeader({ title, subtitle, search, setSearch, onCapture }: PageHeaderProps) {
  return (
    <div style={{
      padding: '16px 24px 14px', borderBottom: '0.5px solid var(--sep)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: -0.3, fontFamily: 'var(--font-display)' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '6px 10px', borderRadius: 7,
        background: 'rgba(118,118,128,0.10)', minWidth: 240,
      }}>
        {Ic.search(14, 'var(--muted)')}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files, items, entities..."
          style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--ink)' }} />
        <span style={{ fontSize: 11, color: 'var(--muted2)', padding: '1px 5px',
          border: '0.5px solid var(--sep)', borderRadius: 4, fontFamily: 'ui-monospace, SF Mono, Menlo, monospace' }}>⌘K</span>
      </div>

      <button onClick={onCapture} title="Capture / upload" style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 11px', borderRadius: 7,
        background: 'var(--accent)', color: '#fff', border: 0, cursor: 'pointer',
        fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
      }}>{Ic.plus(13, '#fff', 2.4)} Add</button>
    </div>
  );
}
