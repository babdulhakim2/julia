'use client';

import React from 'react';

interface NavBarProps {
  title: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  large?: boolean;
  sub?: string;
}

export function NavBar({ title, leading, trailing, large, sub }: NavBarProps) {
  return (
    <div style={{ background: 'var(--background)', paddingTop: 4 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 8px 4px', minHeight: 44,
      }}>
        <div style={{ minWidth: 60, display: 'flex', alignItems: 'center', gap: 4 }}>{leading}</div>
        {!large && <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.4 }}>{title}</div>}
        <div style={{ minWidth: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>{trailing}</div>
      </div>
      {large && (
        <div style={{ padding: '6px 16px 8px' }}>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.8, color: 'var(--ink)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{title}</div>
          {sub && <div style={{ marginTop: 4, fontSize: 14, color: 'var(--muted)' }}>{sub}</div>}
        </div>
      )}
    </div>
  );
}
