'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { fmtDate } from '@/lib/utils';
import { Ic } from '@/components/icons';
import { StatusPill } from '@/components/ui/status-pill';
import { ListGroup } from '@/components/ui/list-group';
import { Row } from '@/components/ui/row';
import { Btn } from '@/components/ui/button';
import { NavBar } from '@/components/ui/nav-bar';
import { EntityChip } from '@/components/ui/entity-chip';
import { DocPreview } from '@/components/ui/doc-preview';

interface InboxViewProps {
  onOpenItem: (id: string) => void;
  onOpenEntity: (id: string) => void;
  onNavigate: (tab: string) => void;
}

export function InboxView({ onOpenItem, onOpenEntity, onNavigate }: InboxViewProps) {
  const { state } = useStore();
  const { items, entities } = state;
  const review = items.filter(i => i.status === 'needs_review');
  const dueSoon = items.filter(i => i.status === 'due_soon' || i.status === 'overdue');
  const upcoming = items.filter(i => i.status === 'scheduled');
  const entById = Object.fromEntries(entities.map(e => [e.id, e]));

  return (
    <div style={{ paddingBottom: 120 }}>
      <NavBar
        large
        title="Inbox"
        sub="Saturday, 2 May · 3 needs your eye"
        trailing={
          <button style={{
            width: 32, height: 32, borderRadius: 16, background: '#E9E9EE',
            border: 0, color: 'var(--ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font)',
          }}>JC</button>
        }
      />

      {/* Today summary card */}
      <div style={{ padding: '4px 16px 0' }}>
        <div style={{
          background: 'var(--ink)', color: '#fff', borderRadius: 16, padding: 16,
          backgroundImage: 'linear-gradient(140deg, #1c1c1e 0%, #2a2a2e 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
            color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
            {Ic.sparkle(12, 'rgba(255,255,255,0.55)')} Your week
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, marginTop: 8, lineHeight: 1.25, fontFamily: 'var(--font-display)' }}>
            <span style={{ color: '#fff' }}>£547</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}> due in the next 7 days, </span>
            <span style={{ color: '#fff' }}>1 overdue</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>. </span>
            <span style={{ color: '#fff' }}>2 drafts</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}> waiting on you.</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Btn size="sm" variant="dark" onClick={() => onNavigate('ask')} style={{ background: 'rgba(255,255,255,0.15)' }}>
              Ask anything
            </Btn>
            <Btn size="sm" variant="dark" onClick={() => onNavigate('calendar')} style={{ background: 'rgba(255,255,255,0.15)' }}>
              See calendar
            </Btn>
          </div>
        </div>
      </div>

      {/* Needs review */}
      {review.length > 0 && (
        <ListGroup header={`Needs your eye · ${review.length}`}>
          {review.map((it, i) => (
            <div key={it.id} onClick={() => onOpenItem(it.id)} style={{
              padding: 14, cursor: 'pointer',
              borderBottom: i === review.length - 1 ? 'none' : '0.5px solid var(--hair)',
            }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 56, height: 72, flexShrink: 0 }}>
                  <DocPreview kind={it.preview} height={72} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusPill status={it.status} />
                    <span style={{ fontSize: 11, color: 'var(--muted2)' }}>· {Math.round((it.confidence || 0) * 100)}% sure</span>
                  </div>
                  <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500, marginTop: 6, lineHeight: 1.3 }}>{it.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Couldn&apos;t tell which entity — tap to assign
                  </div>
                </div>
              </div>
            </div>
          ))}
        </ListGroup>
      )}

      {/* Due soon / overdue */}
      <ListGroup header={`Due this week · ${dueSoon.length}`}>
        {dueSoon.map((it, i) => {
          const e = entById[it.entity || ''];
          return (
            <Row key={it.id}
              onClick={() => onOpenItem(it.id)}
              last={i === dueSoon.length - 1}
              icon={<span style={{ width: 8, height: 8, borderRadius: 99, background: e?.color }} />}
              iconBg={e?.color ? 'transparent' : 'var(--accent-soft)'}
              title={it.title}
              sub={`${e?.name || 'Unassigned'} · ${it.type}`}
              value={it.amount ? `£${it.amount}` : undefined}
              valueSub={fmtDate(it.dueDate)}
            />
          );
        })}
      </ListGroup>

      {/* Upcoming */}
      <ListGroup header="Upcoming">
        {upcoming.map((it, i) => {
          const e = entById[it.entity || ''];
          return (
            <Row key={it.id}
              onClick={() => onOpenItem(it.id)}
              last={i === upcoming.length - 1}
              icon={<span style={{ width: 8, height: 8, borderRadius: 99, background: e?.color }} />}
              iconBg="transparent"
              title={it.title}
              sub={`${e?.name} · ${it.type}`}
              value={it.amount ? `£${it.amount}` : '—'}
              valueSub={fmtDate(it.dueDate)}
            />
          );
        })}
      </ListGroup>

      {/* Quick entity jump */}
      <div style={{ marginTop: 24, padding: '0 16px 6px', fontSize: 13, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: 0.4 }}>Jump to</div>
      <div className="no-scrollbar" style={{ paddingLeft: 16, paddingRight: 16, display: 'flex', gap: 8,
        overflowX: 'auto' }}>
        {entities.map(e => <EntityChip key={e.id} entity={e} onClick={() => onOpenEntity(e.id)} />)}
      </div>
    </div>
  );
}
