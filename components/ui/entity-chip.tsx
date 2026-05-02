'use client';

import React from 'react';
import type { Entity } from '@/lib/types';

interface EntityChipProps {
  entity: Entity;
  selected?: boolean;
  onClick?: () => void;
  dense?: boolean;
}

export function EntityChip({ entity, selected, onClick, dense }: EntityChipProps) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: dense ? '5px 10px 5px 7px' : '7px 12px 7px 9px', borderRadius: 999,
      border: selected ? '1.5px solid var(--ink)' : '1px solid var(--hair)',
      background: selected ? 'var(--ink)' : '#fff',
      color: selected ? '#fff' : 'var(--ink)',
      fontSize: dense ? 12 : 13, fontWeight: 500, fontFamily: 'var(--font)',
      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: entity.color, flexShrink: 0 }} />
      {entity.name.replace(' · ', ' ')}
    </button>
  );
}
