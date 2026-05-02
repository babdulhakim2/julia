'use client';

import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  disabled?: boolean;
  full?: boolean;
}

const sizes = {
  sm: { h: 32, px: 12, fs: 14, r: 8 },
  md: { h: 44, px: 16, fs: 15, r: 12 },
  lg: { h: 52, px: 20, fs: 16, r: 14 },
};

const variants = {
  primary: { bg: 'var(--accent)', color: '#fff' },
  secondary: { bg: '#E9E9EE', color: 'var(--ink)' },
  ghost: { bg: 'transparent', color: 'var(--accent)' },
  dark: { bg: 'var(--ink)', color: '#fff' },
  success: { bg: 'oklch(0.55 0.14 150)', color: '#fff' },
};

export function Btn({ children, onClick, variant = 'primary', size = 'md', icon, style, disabled, full }: BtnProps) {
  const s = sizes[size];
  const v = variants[variant];
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      height: s.h, padding: `0 ${s.px}px`, borderRadius: s.r,
      background: v.bg, color: v.color,
      fontSize: s.fs, fontWeight: 600, letterSpacing: -0.1,
      border: 0, fontFamily: 'var(--font)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
      width: full ? '100%' : undefined, flexShrink: 0,
      ...style,
    }}>
      {icon}
      {children}
    </button>
  );
}
