'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: CardProps) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      overflow: 'hidden',
      ...(padded ? { padding: 16 } : {}),
      ...style,
    }}>{children}</div>
  );
}
