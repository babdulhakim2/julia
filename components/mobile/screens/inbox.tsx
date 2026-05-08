'use client';

import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { fmtDate } from '@/lib/utils';
import { Ic } from '@/components/icons';
import { StatusPill } from '@/components/ui/status-pill';
import { ListGroup } from '@/components/ui/list-group';
import { Row } from '@/components/ui/row';
import { Btn } from '@/components/ui/button';
import { NavBar } from '@/components/ui/nav-bar';
import { EntityChip } from '@/components/ui/entity-chip';
import { DocumentThumb } from '@/components/shared/document-thumb';
import { DocumentPreviewModal } from '@/components/shared/document-preview-modal';
import { attentionSummary, getAttentionItems } from '@/lib/attention';

interface InboxViewProps {
  onOpenItem: (id: string) => void;
  onOpenEntity: (id: string) => void;
  onNavigate: (tab: string) => void;
}

export function InboxView({ onOpenItem, onOpenEntity, onNavigate }: InboxViewProps) {
  const { user } = useUser();
  const router = useRouter();
  const { state } = useStore();
  const { items, entities } = state;
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);

  // Dynamic date and stats
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const review = items.filter(i => i.status === 'needs_review');
  const attention = getAttentionItems(items, now);
  const summary = attentionSummary(attention);
  const attentionById = new Map(attention.map(entry => [entry.item.id, entry]));
  const upcoming = items
    .filter(i => i.status === 'scheduled' && !attentionById.has(i.id))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  const drafts = items.filter(i => i.drafted || i.status === 'drafting');
  const entById = Object.fromEntries(entities.map(e => [e.id, e]));

  const urgentAmount = attention.reduce((s, entry) => s + (entry.item.amount || 0), 0);

  // User initials
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const subline = review.length > 0
    ? `${dateStr} · ${review.length} needs your eye`
    : dateStr;

  function handleOpenItem(id: string) {
    const item = items.find(i => i.id === id);
    if (item?.convexDocumentId) {
      setPreviewDocumentId(item.convexDocumentId);
    } else {
      onOpenItem(id);
    }
  }

  return (
    <div style={{ paddingBottom: 120 }}>
      <NavBar
        large
        title="Inbox"
        sub={subline}
        leading={
          <button
            onClick={() => router.push('/settings')}
            aria-label="Open profile settings"
            style={{
              width: 36, height: 36, borderRadius: 18, border: 0,
              background: 'transparent', padding: 2, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {user?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.imageUrl} alt="" style={{
                width: 32, height: 32, borderRadius: 16, objectFit: 'cover',
              }} />
            ) : (
              <span style={{
              width: 32, height: 32, borderRadius: 16, background: '#E9E9EE',
              color: 'var(--ink)', fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{initials}</span>
            )}
          </button>
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
            {Ic.sparkle(12, 'rgba(255,255,255,0.55)')} Needs attention
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, marginTop: 8, lineHeight: 1.25, fontFamily: 'var(--font-display)' }}>
            <span style={{ color: '#fff' }}>{summary.label}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}> - {summary.detail}</span>
            {urgentAmount > 0 && <span style={{ color: 'rgba(255,255,255,0.5)' }}> £{urgentAmount.toLocaleString()} related.</span>}
            {drafts.length > 0 && <span style={{ color: 'rgba(255,255,255,0.5)' }}> {drafts.length} draft{drafts.length !== 1 ? 's' : ''} waiting.</span>}
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
            <div key={it.id} onClick={() => handleOpenItem(it.id)} style={{
              padding: 14, cursor: 'pointer',
              borderBottom: i === review.length - 1 ? 'none' : '0.5px solid var(--hair)',
            }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 56, height: 72, flexShrink: 0 }}>
                  <DocumentThumb documentId={it.convexDocumentId} fallbackKind={it.preview} height={72} title={it.title} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusPill status={it.status} />
                    <span style={{ fontSize: 11, color: 'var(--muted2)' }}>· {Math.round((it.confidence || 0) * 100)}% sure</span>
                  </div>
                  <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500, marginTop: 6, lineHeight: 1.3 }}>{it.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {it.entity && entById[it.entity] ? entById[it.entity].name : 'Tap to review and assign'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </ListGroup>
      )}

      {/* Needs attention */}
      {attention.length > 0 && (
        <ListGroup header={`Needs attention · ${attention.length}`}>
          {attention.map((entry, i) => {
            const it = entry.item;
            const e = entById[it.entity || ''];
            return (
              <Row key={it.id}
                onClick={() => handleOpenItem(it.id)}
                last={i === attention.length - 1}
                icon={<span style={{ width: 8, height: 8, borderRadius: 99, background: e?.color }} />}
                iconBg={e?.color ? 'transparent' : 'var(--accent-soft)'}
                title={it.title}
                sub={`${e?.name || 'Unassigned'} · ${entry.reason}`}
                value={it.amount ? `£${it.amount}` : undefined}
                valueSub={fmtDate(it.dueDate)}
              />
            );
          })}
        </ListGroup>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <ListGroup header="Upcoming">
          {upcoming.map((it, i) => {
            const e = entById[it.entity || ''];
            return (
              <Row key={it.id}
                onClick={() => handleOpenItem(it.id)}
                last={i === upcoming.length - 1}
                icon={<span style={{ width: 8, height: 8, borderRadius: 99, background: e?.color }} />}
                iconBg="transparent"
                title={it.title}
                sub={`${e?.name || 'Unassigned'} · ${it.type}`}
                value={it.amount ? `£${it.amount}` : '—'}
                valueSub={fmtDate(it.dueDate)}
              />
            );
          })}
        </ListGroup>
      )}

      {/* Empty state */}
      {items.filter(i => i.status !== 'done').length === 0 && (
        <div style={{ padding: '32px 16px' }}>
          <div style={{
            background: '#fff', border: '0.5px solid var(--hair)', borderRadius: 14,
            padding: '28px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>&#128203;</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              No documents yet
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Capture or upload something to get started.
            </div>
          </div>
        </div>
      )}

      {/* Quick entity jump */}
      {entities.length > 0 && (
        <>
          <div style={{ marginTop: 24, padding: '0 16px 6px', fontSize: 13, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: 0.4 }}>Jump to</div>
          <div className="no-scrollbar" style={{ paddingLeft: 16, paddingRight: 16, display: 'flex', gap: 8,
            overflowX: 'auto' }}>
            {entities.map(e => <EntityChip key={e.id} entity={e} onClick={() => onOpenEntity(e.id)} />)}
          </div>
        </>
      )}

      {previewDocumentId && (
        <DocumentPreviewModal
          documentId={previewDocumentId}
          onClose={() => setPreviewDocumentId(null)}
        />
      )}
    </div>
  );
}
