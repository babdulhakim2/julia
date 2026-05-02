'use client';

import React from 'react';
import type { ItemStatus } from '@/lib/types';
import { STATUS_META } from '@/lib/data';

interface StatusPillProps {
  status: ItemStatus;
  size?: 'sm' | 'md';
}

export function StatusPill({ status, size = 'sm' }: StatusPillProps) {
  const m = STATUS_META[status];
  if (!m) return null;
  const padV = size === 'sm' ? 2 : 4;
  const padH = size === 'sm' ? 7 : 9;
  const fs = size === 'sm' ? 11 : 12;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: `${padV}px ${padH}px`, borderRadius: 999,
      background: m.bg, color: m.color,
      fontSize: fs, fontWeight: 600, letterSpacing: 0.1,
      lineHeight: 1.1,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 99, background: m.color }} />
      {m.label}
    </span>
  );
}
