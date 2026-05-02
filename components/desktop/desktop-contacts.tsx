'use client';

import React from 'react';
import { CONTACTS } from '@/lib/data';
import { getInitials } from '@/lib/utils';

export function DesktopContacts() {
  return (
    <div style={{ padding: '14px 24px 30px' }}>
      <div style={{
        background: '#FAF9F5', borderRadius: 10, border: '0.5px solid var(--sep)', overflow: 'hidden',
      }}>
        {CONTACTS.map((c, i) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
            borderBottom: i === CONTACTS.length - 1 ? 'none' : '0.5px solid var(--hair)',
          }}>
            <div style={{ width: 34, height: 34, borderRadius: 99, background: '#fff',
              border: '0.5px solid var(--sep)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: 'var(--ink2)' }}>
              {getInitials(c.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{c.note}</div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {c.tags.slice(0, 3).map(t => (
                <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99,
                  background: 'rgba(0,0,0,0.05)', color: 'var(--muted2)', fontWeight: 500 }}>{t}</span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted2)', minWidth: 70, textAlign: 'right' }}>
              {new Date(c.last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
