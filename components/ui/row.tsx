'use client';

import React from 'react';
import { Ic } from '@/components/icons';

interface RowProps {
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  sub?: string;
  value?: string | null;
  valueSub?: string | null;
  onClick?: () => void;
  chevron?: boolean;
  last?: boolean;
}

export function Row({ icon, iconBg, title, sub, value, valueSub, onClick, chevron = true, last = false }: RowProps) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 16px', minHeight: 44, cursor: onClick ? 'pointer' : 'default',
      borderBottom: last ? 'none' : '0.5px solid var(--hair)',
    }}>
      {icon && (
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: iconBg || 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.25, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      {value && (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          {valueSub && <div style={{ fontSize: 11, color: 'var(--muted2)' }}>{valueSub}</div>}
        </div>
      )}
      {chevron && onClick && Ic.chevron(13, 'rgba(60,60,67,0.3)')}
    </div>
  );
}
