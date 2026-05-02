'use client';

import React from 'react';
import { CONTACTS } from '@/lib/data';
import { getInitials } from '@/lib/utils';
import { Ic } from '@/components/icons';
import { NavBar } from '@/components/ui/nav-bar';
import { NavBtn } from '@/components/ui/nav-btn';
import { ListGroup } from '@/components/ui/list-group';

interface ContactsViewProps {
  onBack?: () => void;
}

export function ContactsView({ onBack }: ContactsViewProps) {
  return (
    <div style={{ paddingBottom: 120 }}>
      <NavBar large title="Contacts" sub="Phonebook · 5 people"
        leading={onBack ? <NavBtn onClick={onBack}>{Ic.back(20, 'var(--accent)')}</NavBtn> : undefined}
        trailing={<NavBtn primary>{Ic.plus(22, 'var(--accent)', 2.4)}</NavBtn>} />

      <ListGroup>
        {CONTACTS.map((c, i) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderBottom: i === CONTACTS.length - 1 ? 'none' : '0.5px solid var(--hair)',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 99, background: 'var(--background)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, color: 'var(--ink2)' }}>
              {getInitials(c.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.note}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {c.tags.slice(0, 2).map(t => (
                  <span key={t} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99,
                    background: 'var(--background)', color: 'var(--muted)', fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted2)', textAlign: 'right' }}>
              {new Date(c.last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        ))}
      </ListGroup>

      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ background: 'var(--accent-soft)', borderRadius: 12, padding: 14, display: 'flex', gap: 10 }}>
          <div style={{ marginTop: 1 }}>{Ic.sparkle(15, 'var(--accent)')}</div>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>
            Tip: voice-note &ldquo;Add John, 07700 900123, ordered crispy duck&rdquo; &mdash; I&apos;ll add him with a note and tag.
          </div>
        </div>
      </div>
    </div>
  );
}
