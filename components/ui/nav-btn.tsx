'use client';

import React from 'react';

interface NavBtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
}

export function NavBtn({ children, onClick, primary }: NavBtnProps) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 0, padding: '6px 8px',
      color: 'var(--accent)', fontSize: 17, fontWeight: primary ? 600 : 400,
      fontFamily: 'var(--font)', letterSpacing: -0.4, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>{children}</button>
  );
}
