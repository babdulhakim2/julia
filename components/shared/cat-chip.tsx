'use client';

import React from 'react';

interface CatChipProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  color: string;
  count?: number;
}

export function CatChip({ selected, onClick, label, color, count }: CatChipProps) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 10px 6px 8px', borderRadius: 999, border: 0, cursor: 'pointer',
      background: selected ? color : '#E9E9EE',
      color: selected ? '#fff' : 'var(--ink)',
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font)',
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: selected ? '#fff' : color }} />
      {label}
      {count !== undefined && (
        <span style={{ fontSize: 11, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      )}
    </button>
  );
}
