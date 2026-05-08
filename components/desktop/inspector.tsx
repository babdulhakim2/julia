'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useStore } from '@/lib/store';
import { STATUS_META } from '@/lib/data';
import { Toast } from '@/components/ui/toast';

interface InspectorProps {
  itemId: string;
  readOnly?: boolean;
}

function Field({ label, value, dotColor, last }: { label: string; value?: string; dotColor?: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 0', borderBottom: last ? 'none' : '0.5px solid var(--hair)', gap: 14 }}>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {dotColor && <span style={{ width: 8, height: 8, borderRadius: 99, background: dotColor }}></span>}
        {value}
      </span>
    </div>
  );
}

function DocumentPreview({ documentId }: { documentId: string }) {
  const files = useQuery(api.files.listByDocumentId, { documentId: documentId as Id<'documents'> });

  if (!files) {
    return (
      <div style={{
        aspectRatio: '0.78', background: '#fff', borderRadius: 10, padding: 18,
        border: '0.5px solid var(--sep)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 4px 18px rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>Loading...</div>
      </div>
    );
  }

  const firstFile = files[0];
  if (!firstFile?.url) return null;

  const isImage = firstFile.contentType?.startsWith('image/');
  const isPdf = firstFile.contentType === 'application/pdf';

  if (isImage) {
    return (
      <div style={{
        aspectRatio: '0.78', borderRadius: 10, overflow: 'hidden',
        border: '0.5px solid var(--sep)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 4px 18px rgba(0,0,0,0.05)',
        background: '#f5f5f0',
      }}>
        <img src={firstFile.url} alt="Document" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div style={{
        aspectRatio: '0.78', borderRadius: 10, overflow: 'hidden',
        border: '0.5px solid var(--sep)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 4px 18px rgba(0,0,0,0.05)',
      }}>
        <iframe src={firstFile.url} style={{ width: '100%', height: '100%', border: 0 }} />
      </div>
    );
  }

  return null;
}

function PlaceholderPreview({ it }: { it: { issuer?: string; type: string; title: string; amount?: number } }) {
  return (
    <div style={{
      aspectRatio: '0.78', background: '#fff', borderRadius: 10, padding: 18,
      border: '0.5px solid var(--sep)',
      boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 4px 18px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden',
    }}>
      <div style={{ fontSize: 9, color: 'var(--muted2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {it.issuer || it.type}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>{it.title}</div>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[1, 2, 3, 4, 5, 6].map(n => (
          <div key={n} style={{ height: 4, background: 'oklch(0.92 0.01 80)', borderRadius: 2, width: `${65 + (n*5) % 35}%` }}></div>
        ))}
      </div>
      {it.amount && (
        <div style={{ marginTop: 'auto', padding: '8px 0 0', borderTop: '0.5px solid var(--hair)' }}>
          <div style={{ fontSize: 9, color: 'var(--muted2)', textTransform: 'uppercase', fontWeight: 600 }}>Amount due</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>£{it.amount.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

export function DesktopInspector({ itemId, readOnly = false }: InspectorProps) {
  const { state, dispatch } = useStore();
  const updateDocument = useMutation(api.documents.update);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const it = state.items.find(i => i.id === itemId);
  const meta = it ? STATUS_META[it.status] : null;

  if (!it) {
    return (
      <aside style={{ background: 'var(--inspector-bg)', padding: 30, fontSize: 13, color: 'var(--muted)' }}>
        Select an item to see details.
      </aside>
    );
  }

  async function markHandled() {
    if (!it || saving || it.status === 'done' || readOnly) return;
    setSaving(true);
    try {
      if (it.convexDocumentId) {
        await updateDocument({
          documentId: it.convexDocumentId as Id<'documents'>,
          status: 'done',
        });
      }
      dispatch({ type: 'UPDATE_ITEM', id: it.id, patch: { status: 'done' } });
      setToast('Marked as handled');
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function changeEntity(entityId: string) {
    if (!it?.convexDocumentId || saving || readOnly) return;
    setSaving(true);
    try {
      await updateDocument({
        documentId: it.convexDocumentId as Id<'documents'>,
        entityId: entityId as Id<'entities'>,
      });
      dispatch({ type: 'UPDATE_ITEM', id: it.id, patch: { entity: entityId } });
      setToast('Document moved');
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside style={{ background: 'var(--inspector-bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Document preview */}
      <div style={{ padding: 18, borderBottom: '0.5px solid var(--sep)' }}>
        {it.convexDocumentId ? (
          <DocumentPreview documentId={it.convexDocumentId} />
        ) : (
          <PlaceholderPreview it={it} />
        )}
      </div>

      {/* Meta */}
      <div style={{ padding: 18, flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{it.type}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)', letterSpacing: -0.3, lineHeight: 1.2, marginBottom: 6 }}>{it.title}</div>
        {meta && (
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 99,
            fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color,
          }}>{meta.label}</span>
        )}

        {it.outcomeMessage && (
          <div style={{
            marginTop: 14, background: 'var(--accent-soft)', color: 'var(--ink)',
            borderRadius: 10, padding: 12,
            fontSize: 12.5, lineHeight: 1.45,
          }}>
            {it.outcomeMessage}
          </div>
        )}

        {it.draftText && (
          <div style={{
            marginTop: 10, background: '#fff', border: '0.5px solid var(--sep)',
            borderRadius: 10, padding: 12,
          }}>
            <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Draft ready
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
              {it.draftText}
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, background: '#fff', borderRadius: 10, border: '0.5px solid var(--sep)', padding: '4px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 0', borderBottom: '0.5px solid var(--hair)', gap: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Entity</span>
            <select value={it.entity ?? ''} onChange={(event) => changeEntity(event.target.value)} disabled={!it.convexDocumentId || saving || readOnly} style={{
              maxWidth: 170, border: '0.5px solid var(--sep)', borderRadius: 7,
              background: '#fff', color: 'var(--ink)', padding: '5px 7px',
              fontSize: 12, fontFamily: 'var(--font)', outline: 'none',
            }}>
              <option value="" disabled>Unassigned</option>
              {state.entities.map(entity => (
                <option key={entity.id} value={entity.id}>{entity.name}</option>
              ))}
            </select>
          </div>
          {it.amount ? <Field label="Amount" value={`£${it.amount.toLocaleString()}${it.fullAmount ? ` (£${it.fullAmount} after)` : ''}`} /> : null}
          {it.dueDate ? <Field label="Due" value={new Date(it.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} /> : null}
          {it.issuer ? <Field label="Issuer" value={it.issuer} /> : null}
          {it.ref ? <Field label="Reference" value={it.ref} /> : null}
          {it.date ? <Field label="Filed" value={new Date(it.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} last /> : null}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: 14, borderTop: '0.5px solid var(--sep)', display: 'flex', gap: 8 }}>
        <button onClick={markHandled} disabled={saving || it.status === 'done' || readOnly} style={{
          flex: 1, padding: '8px 12px', borderRadius: 8,
          background: it.status === 'done' ? 'rgba(0,0,0,0.08)' : 'var(--ink)',
          color: it.status === 'done' ? 'var(--muted)' : '#fff', border: 0,
          cursor: saving || it.status === 'done' || readOnly ? 'default' : 'pointer',
          fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
        }}>{readOnly ? 'Preview mode' : saving ? 'Marking...' : it.status === 'done' ? 'Handled' : 'Mark handled'}</button>
      </div>
      {toast && <Toast message={toast} variant="success" />}
    </aside>
  );
}
