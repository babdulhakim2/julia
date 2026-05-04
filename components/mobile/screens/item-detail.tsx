'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Ic } from '@/components/icons';
import { StatusPill } from '@/components/ui/status-pill';
import { ListGroup } from '@/components/ui/list-group';
import { Row } from '@/components/ui/row';
import { Btn } from '@/components/ui/button';
import { NavBar } from '@/components/ui/nav-bar';
import { NavBtn } from '@/components/ui/nav-btn';
import { DocumentThumb } from '@/components/shared/document-thumb';
import { DocumentPreviewModal } from '@/components/shared/document-preview-modal';

interface ItemDetailProps {
  itemId: string;
  onBack: () => void;
}

export function ItemDetail({ itemId, onBack }: ItemDetailProps) {
  const { state } = useStore();
  const [previewOpen, setPreviewOpen] = useState(false);
  const it = state.items.find(i => i.id === itemId);
  const e = state.entities.find(x => x.id === it?.entity);
  if (!it) return null;

  const fields = [
    it.amount && { k: 'Amount', v: `£${it.amount}${it.fullAmount ? ` (£${it.fullAmount} after)` : ''}` },
    it.dueDate && { k: 'Due', v: new Date(it.dueDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) },
    it.issuer && { k: 'From', v: it.issuer },
    it.ref && { k: 'Reference', v: it.ref },
    e && { k: 'Filed under', v: e.name },
    { k: 'Captured', v: it.capturedAt || '' },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <div style={{ paddingBottom: 120 }}>
      <NavBar
        title="Detail"
        leading={<NavBtn onClick={onBack}>{Ic.back(20, 'var(--accent)')} Back</NavBtn>}
        trailing={<NavBtn>{Ic.edit(20, 'var(--accent)')}</NavBtn>}
      />

      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <StatusPill status={it.status} size="md" />
          <span style={{ fontSize: 12, color: 'var(--muted2)' }}>{Math.round((it.confidence || 0) * 100)}% confident · human reviewed</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.3, lineHeight: 1.2, fontFamily: 'var(--font-display)' }}>{it.title}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{it.type} · {e?.name}</div>

        <button
          onClick={() => it.convexDocumentId ? setPreviewOpen(true) : undefined}
          style={{
            marginTop: 14, width: '100%', border: 0, padding: 0, borderRadius: 10,
            overflow: 'hidden', cursor: it.convexDocumentId ? 'pointer' : 'default',
            background: 'transparent',
          }}
        >
          <DocumentThumb documentId={it.convexDocumentId} fallbackKind={it.preview || 'lambeth'} height={220} title={it.title} />
        </button>
      </div>

      <ListGroup header="Details">
        {fields.map((f, i) => (
          <div key={f.k} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '12px 14px',
            borderBottom: i === fields.length - 1 ? 'none' : '0.5px solid var(--hair)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{f.k}</span>
            <span style={{ fontSize: 14, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{f.v}</span>
          </div>
        ))}
      </ListGroup>

      {it.drafted && (
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ background: 'var(--accent-soft)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
              color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {Ic.sparkle(11, 'var(--accent)')} Draft reply ready
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 8, lineHeight: 1.45,
              padding: 12, background: 'rgba(255,255,255,0.6)', borderRadius: 8 }}>
              &ldquo;Dear Sir/Madam, I write to formally challenge PCN LB23994821 on the grounds that the loading restrictions were not clearly signposted at this location&hellip;&rdquo;
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <Btn size="sm" variant="primary">Send</Btn>
              <Btn size="sm" variant="secondary">Edit draft</Btn>
            </div>
          </div>
        </div>
      )}

      <ListGroup header="Actions">
        <Row icon={Ic.pound(16, 'var(--accent)')} iconBg="var(--accent-soft)" title="Pay £65 with Lambeth's link" sub="Opens in browser" chevron onClick={() => {}} />
        <Row icon={Ic.bell(16, 'var(--accent)')} iconBg="var(--accent-soft)" title="Reminder: 12 May, 9am" sub="2 days before due" chevron onClick={() => {}} />
        <Row icon={Ic.thumbtack(16, 'var(--accent)')} iconBg="var(--accent-soft)" title="Pin to top" chevron last onClick={() => {}} />
      </ListGroup>

      {previewOpen && it.convexDocumentId && (
        <DocumentPreviewModal
          documentId={it.convexDocumentId}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
