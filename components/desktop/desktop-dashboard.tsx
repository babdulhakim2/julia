'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Entity, Item } from '@/lib/types';
import { Ic } from '@/components/icons';
import { StatusPill } from '@/components/ui/status-pill';
import { DocumentThumb } from '@/components/shared/document-thumb';
import { ItemsTable } from './items-table';
import { DocumentPreviewModal } from '@/components/shared/document-preview-modal';
import { attentionSummary, getAttentionItems } from '@/lib/attention';

interface DashboardProps {
  items: Item[];
  entities: Entity[];
  search: string;
  selectedItemId: string;
  setSelectedItemId: (id: string) => void;
}

export function DesktopDashboard({ items, entities, search, selectedItemId, setSelectedItemId }: DashboardProps) {
  const router = useRouter();
  const ent = Object.fromEntries(entities.map(e => [e.id, e]));
  const openItems = items.filter(i => i.status !== 'done');
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);

  const attention = getAttentionItems(items);
  const summary = attentionSummary(attention);
  const attentionItems = attention.map(entry => entry.item);
  const urgentAmount = attentionItems.reduce((s, i) => s + (i.amount || 0), 0);
  const drafts = items.filter(i => i.drafted || i.status === 'drafting');

  // Grouped sections
  const needsReview = openItems.filter(i => i.status === 'needs_review');
  const attentionById = new Map(attention.map(entry => [entry.item.id, entry]));
  const upcoming = openItems
    .filter(i => i.status === 'scheduled' && !attentionById.has(i.id))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));

  function handlePreviewItem(item: Item) {
    if (item.convexDocumentId) {
      setPreviewDocumentId(item.convexDocumentId);
    } else {
      setSelectedItemId(item.id);
    }
  }

  return (
    <div>
      {/* Hero card */}
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{
          background: 'var(--ink)', color: '#fff', borderRadius: 14, padding: '18px 20px',
          backgroundImage: 'linear-gradient(140deg, #1c1c1e 0%, #2a2a2e 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
            color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
            {Ic.sparkle(11, 'rgba(255,255,255,0.55)')} Needs attention
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.3, marginTop: 8, lineHeight: 1.3, fontFamily: 'var(--font-display)' }}>
            <span style={{ color: '#fff' }}>{summary.label}</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}> - {summary.detail}</span>
            {urgentAmount > 0 && <span style={{ color: 'rgba(255,255,255,0.55)' }}> £{urgentAmount.toLocaleString()} in related amounts.</span>}
            {drafts.length > 0 && <span style={{ color: 'rgba(255,255,255,0.55)' }}> {drafts.length} draft{drafts.length !== 1 ? 's' : ''} waiting.</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => router.push('/ask')} style={{
              padding: '6px 12px', borderRadius: 7, border: 0, cursor: 'pointer',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
            }}>Ask anything</button>
            <button onClick={() => router.push('/calendar')} style={{
              padding: '6px 12px', borderRadius: 7, border: 0, cursor: 'pointer',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
            }}>See calendar</button>
          </div>
        </div>
      </div>

      {/* Needs your eye */}
      {needsReview.length > 0 && (
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Needs your eye · {needsReview.length}
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
            {needsReview.map(it => (
              <button key={it.id} onClick={() => handlePreviewItem(it)} style={{
                width: 170, flexShrink: 0, background: '#FAF9F5', borderRadius: 10, border: selectedItemId === it.id ? '1.5px solid var(--accent)' : '0.5px solid var(--sep)',
                cursor: 'pointer', padding: 10, textAlign: 'left', fontFamily: 'var(--font)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ height: 60, borderRadius: 6, overflow: 'hidden' }}>
                  <DocumentThumb documentId={it.convexDocumentId} fallbackKind={it.preview} height={60} title={it.title} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.25,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{it.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{Math.round((it.confidence || 0) * 100)}% sure</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attention */}
      {attention.length > 0 && (
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Needs attention · {attention.length}
          </div>
          <div style={{ background: '#FAF9F5', borderRadius: 10, border: '0.5px solid var(--sep)', overflow: 'hidden' }}>
            {attention.map((entry, i) => {
              const it = entry.item;
              const e = ent[it.entity || ''];
              return (
                <button key={it.id} onClick={() => handlePreviewItem(it)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: selectedItemId === it.id ? 'rgba(0,122,255,0.05)' : 'transparent',
                  border: 0, borderBottom: i === attention.length - 1 ? 'none' : '0.5px solid var(--hair)',
                  cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left',
                }}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: e?.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{it.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{e?.name || 'Unassigned'} · {entry.reason}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {it.amount && <div style={{ fontSize: 13, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>£{it.amount.toLocaleString()}</div>}
                    <StatusPill status={it.status} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Upcoming · {upcoming.length}
          </div>
          <div style={{ background: '#FAF9F5', borderRadius: 10, border: '0.5px solid var(--sep)', overflow: 'hidden' }}>
            {upcoming.map((it, i) => {
              const e = ent[it.entity || ''];
              return (
                <button key={it.id} onClick={() => handlePreviewItem(it)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: selectedItemId === it.id ? 'rgba(0,122,255,0.05)' : 'transparent',
                  border: 0, borderBottom: i === upcoming.length - 1 ? 'none' : '0.5px solid var(--hair)',
                  cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left',
                }}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: e?.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{it.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{e?.name} · {it.dueDate}</div>
                  </div>
                  {it.amount && <div style={{ fontSize: 13, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>£{it.amount.toLocaleString()}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {openItems.length === 0 && (
        <div style={{ padding: '32px 24px' }}>
          <div style={{
            background: '#FAF9F5', border: '0.5px solid var(--sep)', borderRadius: 14,
            padding: '28px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>&#128203;</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              No documents yet
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Capture or upload something to get started. Your dashboard will show due items, reviews, and upcoming deadlines here.
            </div>
          </div>
        </div>
      )}

      {/* Full table */}
      {openItems.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ padding: '0 24px 8px', fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            All open items · {openItems.length}
          </div>
          <ItemsTable items={openItems} ent={ent} search={search} selectedId={selectedItemId} onSelect={setSelectedItemId} />
        </div>
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
