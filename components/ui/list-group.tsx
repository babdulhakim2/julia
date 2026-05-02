'use client';

import React from 'react';

interface ListGroupProps {
  header?: string;
  footer?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function ListGroup({ header, footer, children, style }: ListGroupProps) {
  return (
    <div style={{ marginTop: 24, ...style }}>
      {header && (
        <div style={{
          padding: '0 16px 6px', fontSize: 13, fontWeight: 400,
          color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4,
        }}>{header}</div>
      )}
      <div style={{
        background: '#fff', marginInline: 16, borderRadius: 12, overflow: 'hidden',
      }}>{children}</div>
      {footer && (
        <div style={{ padding: '6px 16px 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{footer}</div>
      )}
    </div>
  );
}
