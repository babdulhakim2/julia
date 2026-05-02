'use client';

import React, { type ReactNode } from 'react';
import { Ic } from '@/components/icons';

interface ToastProps {
  message: string;
  variant?: 'default' | 'success';
  icon?: ReactNode;
}

export function Toast({ message, variant = 'default', icon }: ToastProps) {
  const isSuccess = variant === 'success';
  return (
    <div style={{
      position: 'absolute', left: 16, right: 16, bottom: 110, zIndex: 40,
      padding: '12px 14px', borderRadius: 12,
      background: isSuccess ? 'oklch(0.22 0.04 150)' : 'var(--ink)',
      color: '#fff',
      fontSize: 14, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
      animation: 'fade-in-up 0.25s ease-out',
    }}>
      {icon || Ic.check(18, isSuccess ? 'oklch(0.75 0.14 150)' : '#fff', 2.5)} {message}
    </div>
  );
}
