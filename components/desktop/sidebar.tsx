'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Ic, getIcon } from '@/components/icons';

interface SidebarProps {
  onCapture: () => void;
}

export function DesktopSidebar({ onCapture }: SidebarProps) {
  const { state } = useStore();
  const pathname = usePathname();
  const { entities, items } = state;
  const review = items.filter(i => i.status === 'needs_review').length;
  const dueSoon = items.filter(i => i.status === 'due_soon' || i.status === 'overdue').length;

  const navItems = [
    { href: '/inbox', label: 'Everything', icon: 'inbox', badge: items.filter(i => i.status !== 'done').length },
    { href: '/files', label: 'Files', icon: 'building', badge: 0 },
    { href: '/calendar', label: 'Calendar', icon: 'cal', badge: dueSoon },
    { href: '/ask', label: 'Ask', icon: 'sparkle', badge: 0 },
    { href: '/contacts', label: 'Contacts', icon: 'user', badge: 0 },
  ];

  function isActive(href: string) {
    if (href === '/inbox') return pathname === '/inbox' || pathname === '/';
    if (href === '/files') return pathname === '/files';
    return pathname.startsWith(href);
  }

  return (
    <aside style={{
      background: 'var(--sidebar-bg)', borderRight: '0.5px solid var(--sep)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Brand */}
      <div style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: -0.3 }}>S</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.2 }}>Secretary</div>
        <div style={{ marginLeft: 'auto' }}>
          <Link href="/settings" title="Settings" style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
            {Ic.dots(16, 'var(--muted)')}
          </Link>
        </div>
      </div>

      {/* Capture / upload */}
      <div style={{ padding: '0 12px 14px' }}>
        <button onClick={onCapture} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', borderRadius: 9,
          background: 'var(--ink)', color: '#fff', border: 0, cursor: 'pointer',
          fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font)', letterSpacing: -0.1,
        }}>
          {Ic.camera(15, '#fff')} Capture or upload
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: '0 8px' }}>
        {navItems.map(n => {
          const active = isActive(n.href);
          const highlight = n.href === '/inbox' && review > 0;
          return (
            <Link key={n.href} href={n.href} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '6px 10px', marginBottom: 1, borderRadius: 7,
              background: active ? 'rgba(0,0,0,0.06)' : 'transparent', cursor: 'pointer',
              color: active ? 'var(--ink)' : 'var(--ink2)', fontSize: 13.5, fontWeight: active ? 600 : 500, fontFamily: 'var(--font)',
              textAlign: 'left', textDecoration: 'none',
            }}>
              <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {getIcon(n.icon, 15, active ? 'var(--ink)' : 'var(--muted)')}
              </span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge ? (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
                  background: highlight ? 'oklch(0.55 0.20 25)' : 'rgba(0,0,0,0.08)',
                  color: highlight ? '#fff' : 'var(--muted)',
                }}>{n.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Entities */}
      <div style={{ padding: '20px 18px 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Entities</span>
        <Link href="/settings" title="Add entity" style={{ background: 'transparent', border: 0, padding: 2, cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
          {Ic.plus(13, 'var(--muted)', 2.4)}
        </Link>
      </div>
      <div style={{ padding: '0 8px', overflowY: 'auto', flex: 1 }}>
        {entities.map(e => {
          const active = pathname === `/files/${e.id}` || pathname.startsWith(`/files/${e.id}/`);
          const count = items.filter(i => i.entity === e.id && i.status !== 'done').length;
          return (
            <Link key={e.id} href={`/files/${e.id}`} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '6px 10px', marginBottom: 1, borderRadius: 7,
              background: active ? 'rgba(0,0,0,0.06)' : 'transparent', cursor: 'pointer',
              color: 'var(--ink)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font)',
              textAlign: 'left', textDecoration: 'none',
            }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: e.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {getIcon(e.icon, 10, '#fff')}
              </span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
              {count ? (
                <span style={{ fontSize: 11, color: 'var(--muted2)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <Link href="/settings" style={{ padding: '12px 14px', borderTop: '0.5px solid var(--sep)',
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
        <div style={{ width: 26, height: 26, borderRadius: 99, background: 'oklch(0.85 0.04 50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}>JC</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.2 }}>Julia Chen</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Multi · {entities.length} entities</div>
        </div>
      </Link>
    </aside>
  );
}
