'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Ic } from '@/components/icons';

interface TabBarProps {
  onCapture: () => void;
}

const tabs = [
  { id: 'inbox', href: '/inbox', label: 'Inbox', icon: 'inbox' as const },
  { id: 'entities', href: '/docs', label: 'Docs', icon: 'doc' as const },
  { id: 'capture', href: '', label: '', icon: 'camera' as const },
  { id: 'books', href: '/books', label: 'Books', icon: 'pound' as const },
  { id: 'calendar', href: '/calendar', label: 'Calendar', icon: 'cal' as const },
];

export function TabBar({ onCapture }: TabBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function getActive() {
    if (pathname.startsWith('/docs') || pathname.startsWith('/files')) return 'entities';
    if (pathname.startsWith('/books')) return 'books';
    if (pathname.startsWith('/calendar')) return 'calendar';
    return 'inbox';
  }

  const active = getActive();

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: 30, paddingTop: 8,
      background: 'rgba(247,247,250,0.92)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderTop: '0.5px solid var(--sep)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      zIndex: 30,
    }}>
      {tabs.map(t => {
        if (t.id === 'capture') {
          return (
            <button key="capture" onClick={onCapture} style={{
              width: 56, height: 56, borderRadius: 28, border: 0,
              background: 'var(--ink)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.1)',
              marginTop: -16, cursor: 'pointer',
            }}>{Ic.camera(26, '#fff')}</button>
          );
        }
        const isActive = active === t.id;
        const c = isActive ? 'var(--accent)' : 'var(--muted)';
        const iconFn = Ic[t.icon];
        return (
          <button key={t.id} onClick={() => router.push(t.href)} style={{
            border: 0, background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '4px 12px', color: c,
          }}>
            {iconFn(24, c)}
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 0.1 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
