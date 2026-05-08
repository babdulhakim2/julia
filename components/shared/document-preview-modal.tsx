'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Ic } from '@/components/icons';
import { CATEGORIES } from '@/lib/data';
import { useActiveWorkspace } from '@/lib/admin-view';

interface DocumentPreviewModalProps {
  documentId: string;
  onClose: () => void;
}

const INTAKE_OPTIONS = [
  { value: 'takings.card', label: 'Income / card takings', category: 'finance' },
  { value: 'takings.cash', label: 'Income / cash takings', category: 'finance' },
  { value: 'expense.supplier', label: 'Expenditure / supplier receipt', category: 'finance' },
  { value: 'expense.utility', label: 'Utility bill', category: 'utilities' },
  { value: 'expense.other', label: 'Other expenditure', category: 'finance' },
  { value: 'tax.hmrc', label: 'HMRC / tax', category: 'tax' },
  { value: 'tax.council', label: 'Council tax / rates', category: 'tax' },
  { value: 'vehicle.pcn', label: 'PCN / fine', category: 'fines' },
  { value: 'vehicle.mot', label: 'MOT', category: 'operations' },
  { value: 'vehicle.insurance', label: 'Vehicle insurance', category: 'insurance' },
  { value: 'legal.licence', label: 'Licence / legal', category: 'legal' },
  { value: 'property.mortgage', label: 'Mortgage / property', category: 'finance' },
  { value: 'property.service', label: 'Service charge / ground rent', category: 'finance' },
  { value: 'correspondence.bank', label: 'Bank letter / statement', category: 'finance' },
  { value: 'correspondence.insurance', label: 'Insurance letter', category: 'insurance' },
  { value: 'correspondence.other', label: 'Other admin letter', category: 'operations' },
  { value: 'unknown', label: 'Needs review', category: 'other' },
] satisfies Array<{ value: string; label: string; category: Doc<'documents'>['category'] }>;

function formatCurrency(amountMinor: number, currency: string) {
  const symbol = currency === 'GBP' ? '\u00a3' : currency === 'USD' ? '$' : currency === 'EUR' ? '\u20ac' : `${currency} `;
  return `${symbol}${(amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export function DocumentPreviewModal({ documentId, onClose }: DocumentPreviewModalProps) {
  const { isViewingClient } = useActiveWorkspace();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [closingAfterDelete, setClosingAfterDelete] = useState(false);
  const doc = useQuery(api.documents.getById, closingAfterDelete ? 'skip' : { documentId: documentId as Id<'documents'> });
  const files = useQuery(api.files.listByDocumentId, closingAfterDelete ? 'skip' : { documentId: documentId as Id<'documents'> });
  const entities = useQuery(
    api.entities.listByWorkspace,
    doc ? { workspaceId: doc.workspaceId } : 'skip',
  );
  const updateDocument = useMutation(api.documents.update);
  const deleteDocument = useMutation(api.documents.remove);

  async function handleDeleteDocument() {
    if (deleting || isViewingClient) return;
    setDeleting(true);
    setClosingAfterDelete(true);
    try {
      await deleteDocument({ documentId: documentId as Id<'documents'> });
      onClose();
    } catch (error) {
      setClosingAfterDelete(false);
      throw error;
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (expanded) setExpanded(false);
        else onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, expanded]);

  const firstFile = files?.[0];
  const isPdf = firstFile?.contentType === 'application/pdf';
  const isImage = firstFile?.contentType?.startsWith('image/');

  const previewContent = (
    <>
      {!files ? (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
      ) : isPdf && firstFile?.url ? (
        <iframe src={firstFile.url} style={{ width: '100%', height: '100%', border: 0, minHeight: expanded ? 0 : 500 }} />
      ) : isImage && firstFile?.url ? (
        <img
          src={firstFile.url}
          alt={doc?.title ?? 'Document'}
          style={{
            maxWidth: '100%',
            maxHeight: expanded ? '95vh' : '80vh',
            objectFit: 'contain',
          }}
        />
      ) : firstFile?.url ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>
            {Ic.doc(40, 'var(--muted)')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            {firstFile.contentType}
          </div>
          <a href={firstFile.url} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-block', padding: '8px 16px', borderRadius: 7,
            background: 'var(--accent)', color: '#fff', textDecoration: 'none',
            fontSize: 13, fontWeight: 600,
          }}>Download file</a>
        </div>
      ) : (
        <div style={{ color: 'var(--muted)', fontSize: 13, padding: 40, textAlign: 'center' }}>
          No file preview available
        </div>
      )}
    </>
  );

  // Fullscreen view — preview only, with a top toolbar
  if (expanded) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#1a1a1a',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'rgba(0,0,0,0.4)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {Ic.doc(16, 'rgba(255,255,255,0.7)')}
            <span style={{
              fontSize: 14, fontWeight: 600, color: '#fff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {doc?.title ?? 'Document'}
            </span>
            {doc?.documentType && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {doc.documentType}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button onClick={() => setExpanded(false)} title="Exit fullscreen" style={{
              width: 32, height: 32, borderRadius: 6, border: 0, cursor: 'pointer',
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {Ic.collapse(16, '#fff')}
            </button>
            <button onClick={onClose} title="Close" style={{
              width: 32, height: 32, borderRadius: 6, border: 0, cursor: 'pointer',
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {Ic.x(16, '#fff')}
            </button>
          </div>
        </div>
        {/* Full preview */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'auto', background: '#1a1a1a',
        }}>
          {previewContent}
        </div>
      </div>
    );
  }

  // Default split view
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div className="flex flex-col sm:flex-row" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 900, maxHeight: '85vh',
        background: '#fff', borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Preview area */}
        <div style={{
          flex: 1, minWidth: 0, background: '#f5f5f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
        }}>
          {previewContent}
          {/* Preview controls — expand + close (close only visible on mobile where sidebar is hidden) */}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            display: 'flex', gap: 4,
          }}>
            <button onClick={() => setExpanded(true)} title="Fullscreen" style={{
              width: 32, height: 32, borderRadius: 6, border: 0, cursor: 'pointer',
              background: 'rgba(0,0,0,0.06)', color: 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {Ic.expand(15, 'var(--muted)')}
            </button>
            <button className="sm:hidden" onClick={onClose} title="Close" style={{
              width: 32, height: 32, borderRadius: 6, border: 0, cursor: 'pointer',
              background: 'rgba(0,0,0,0.06)', color: 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {Ic.x(15, 'var(--muted)')}
            </button>
          </div>
        </div>

        {/* Metadata sidebar — hidden on small screens */}
        <div className="hidden sm:flex" style={{
          width: 280, borderLeft: '0.5px solid var(--sep)',
          flexDirection: 'column', overflowY: 'auto', flexShrink: 0,
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '0.5px solid var(--sep)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Document details
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={isViewingClient}
                style={{
                  border: '0.5px solid var(--sep)',
                  borderRadius: 7,
                  background: '#fff',
                  color: 'oklch(0.50 0.16 25)',
                  padding: '5px 8px',
                  fontSize: 11.5,
                  fontWeight: 800,
                  fontFamily: 'var(--font)',
                  cursor: isViewingClient ? 'default' : 'pointer',
                  opacity: isViewingClient ? 0.45 : 1,
                }}
              >
                Delete
              </button>
              <button onClick={onClose} style={{
                background: 'transparent', border: 0, cursor: 'pointer', padding: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {Ic.x(16, 'var(--muted)')}
              </button>
            </div>
          </div>

          {!doc ? (
            <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
          ) : (
            <EditableDocumentDetails
              key={`${doc._id}-${doc.updatedAt}-desktop`}
              doc={doc}
              files={files}
              entities={entities ?? []}
              updateDocument={updateDocument}
              readOnly={isViewingClient}
              onDelete={() => setConfirmDelete(true)}
            />
          )}
        </div>

        <div className="sm:hidden" style={{
          borderTop: '0.5px solid var(--sep)',
          maxHeight: '42vh',
          overflowY: 'auto',
          background: '#fff',
        }}>
          {!doc ? (
            <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
          ) : (
            <EditableDocumentDetails
              key={`${doc._id}-${doc.updatedAt}-mobile`}
              doc={doc}
              files={files}
              entities={entities ?? []}
              updateDocument={updateDocument}
              readOnly={isViewingClient}
              onDelete={() => setConfirmDelete(true)}
            />
          )}
        </div>

      </div>
      {confirmDelete && (
        <ConfirmDeleteDocument
          title={doc?.title}
          deleting={deleting}
          onCancel={() => {
            if (!deleting) setConfirmDelete(false);
          }}
          onConfirm={handleDeleteDocument}
        />
      )}
    </div>
  );
}

type UpdateDocumentMutation = (args: {
  documentId: Id<'documents'>;
  status?: Doc<'documents'>['status'];
  entityId?: Id<'entities'>;
  category?: Doc<'documents'>['category'];
  intakeCategory?: string;
  title?: string;
  documentType?: string;
  issuer?: string;
  reference?: string;
  amount?: { amountMinor: number; currency: string };
  issuedAt?: number;
  dueAt?: number;
}) => Promise<unknown>;

function EditableDocumentDetails({
  doc,
  files,
  entities,
  updateDocument,
  readOnly,
  onDelete,
}: {
  doc: Doc<'documents'>;
  files?: Array<{ _id: Id<'documentFiles'>; contentType: string; url: string | null }>;
  entities: Array<Doc<'entities'>>;
  updateDocument: UpdateDocumentMutation;
  readOnly: boolean;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [documentType, setDocumentType] = useState(doc.documentType);
  const [issuer, setIssuer] = useState(doc.issuer ?? '');
  const [reference, setReference] = useState(doc.reference ?? '');
  const [amount, setAmount] = useState(doc.amount ? String(doc.amount.amountMinor / 100) : '');
  const [issuedAt, setIssuedAt] = useState(doc.issuedAt ? inputDate(doc.issuedAt) : '');
  const [dueAt, setDueAt] = useState(doc.dueAt ? inputDate(doc.dueAt) : '');
  const [saving, setSaving] = useState<string | null>(null);

  async function save(field: string, patch: Omit<Parameters<UpdateDocumentMutation>[0], 'documentId'>) {
    setSaving(field);
    try {
      await updateDocument({ documentId: doc._id, ...patch });
    } finally {
      setSaving(null);
    }
  }

  async function saveAmount() {
    if (!amount.trim()) return;
    const pounds = Number(amount);
    if (!Number.isFinite(pounds) || pounds < 0) {
      setAmount(doc.amount ? String(doc.amount.amountMinor / 100) : '');
      return;
    }
    await save('amount', {
      amount: {
        amountMinor: Math.round(pounds * 100),
        currency: doc.amount?.currency ?? 'GBP',
      },
    });
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => save('status', { status: 'done' })}
          disabled={readOnly || saving === 'status' || doc.status === 'done'}
          style={{
            flex: 1,
            border: 0,
            borderRadius: 8,
            background: doc.status === 'done' ? 'oklch(0.92 0.04 150)' : 'var(--ink)',
            color: doc.status === 'done' ? 'oklch(0.40 0.12 150)' : '#fff',
            padding: '9px 10px',
            fontSize: 12.5,
            fontWeight: 800,
            fontFamily: 'var(--font)',
            cursor: readOnly || saving === 'status' || doc.status === 'done' ? 'default' : 'pointer',
            opacity: readOnly ? 0.45 : 1,
          }}
        >
          {saving === 'status' ? 'Marking...' : doc.status === 'done' ? 'Handled' : 'Mark handled'}
        </button>
        <button
          onClick={onDelete}
          disabled={readOnly}
          style={{
            width: 42,
            border: '0.5px solid var(--sep)',
            borderRadius: 8,
            background: '#fff',
            color: 'oklch(0.50 0.16 25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: readOnly ? 'default' : 'pointer',
            opacity: readOnly ? 0.45 : 1,
          }}
          title={readOnly ? 'Preview mode' : 'Delete document'}
        >
          {Ic.x(15, 'oklch(0.50 0.16 25)')}
        </button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <EditableText label="Title" value={title} onChange={setTitle} onBlur={() => title.trim() && title !== doc.title ? save('title', { title: title.trim() }) : undefined} saving={saving === 'title'} />
        <EditableText label="Type" value={documentType} onChange={setDocumentType} onBlur={() => documentType.trim() && documentType !== doc.documentType ? save('type', { documentType: documentType.trim() }) : undefined} saving={saving === 'type'} />
      </div>

      {doc.summary && (
        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
          {doc.summary}
        </div>
      )}

      {doc.outcomeMessage && (
        <div style={{
          background: 'var(--accent-soft)', color: 'var(--ink)',
          borderRadius: 8, padding: 10,
          fontSize: 12.5, lineHeight: 1.45,
          border: '0.5px solid var(--sep)',
        }}>
          {doc.outcomeMessage}
        </div>
      )}

      <div style={{ background: '#FAF9F5', borderRadius: 8, padding: 10, border: '0.5px solid var(--sep)', display: 'grid', gap: 9 }}>
        <label style={fieldLabelStyle}>
          Entity
          <select value={doc.entityId ?? ''} onChange={event => {
            if (event.target.value) save('entity', { entityId: event.target.value as Id<'entities'> });
          }} style={fieldInputStyle}>
            <option value="" disabled>Unassigned</option>
            {entities.map(entity => (
              <option key={entity._id} value={entity._id}>{entity.name}</option>
            ))}
          </select>
        </label>
        <label style={fieldLabelStyle}>
          Category
          <select value={doc.category} onChange={event => save('category', { category: event.target.value as Doc<'documents'>['category'] })} style={fieldInputStyle}>
            {CATEGORIES.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
            <option value="other">Other</option>
          </select>
        </label>
        <label style={fieldLabelStyle}>
          Document kind
          <select value={doc.intakeCategory ?? ''} onChange={event => {
            const option = INTAKE_OPTIONS.find(item => item.value === event.target.value);
            save('intakeCategory', {
              intakeCategory: event.target.value,
              category: option?.category,
            });
          }} style={fieldInputStyle}>
            <option value="" disabled>Choose kind</option>
            {INTAKE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <EditableText label="Issuer" value={issuer} onChange={setIssuer} onBlur={() => issuer !== (doc.issuer ?? '') ? save('issuer', { issuer: issuer.trim() }) : undefined} saving={saving === 'issuer'} />
        <EditableText label="Reference" value={reference} onChange={setReference} onBlur={() => reference !== (doc.reference ?? '') ? save('reference', { reference: reference.trim() }) : undefined} saving={saving === 'reference'} />
        <EditableText label="Amount" value={amount} onChange={setAmount} onBlur={saveAmount} saving={saving === 'amount'} inputMode="decimal" prefix={doc.amount ? formatCurrency(doc.amount.amountMinor, doc.amount.currency) : undefined} />
        <EditableText label="Issued" type="date" value={issuedAt} onChange={setIssuedAt} onBlur={() => issuedAt ? save('issued', { issuedAt: dateToTimestamp(issuedAt) }) : undefined} saving={saving === 'issued'} />
        <EditableText label="Due" type="date" value={dueAt} onChange={setDueAt} onBlur={() => dueAt ? save('due', { dueAt: dateToTimestamp(dueAt) }) : undefined} saving={saving === 'due'} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
          <span style={{ color: 'var(--muted)' }}>Status</span>
          <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{doc.status}</span>
        </div>
      </div>

      {doc.draftResponse && (
        <div style={{
          background: '#fff', borderRadius: 8, padding: 12,
          border: '0.5px solid var(--sep)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: 'var(--accent)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
          }}>
            {Ic.sparkle(11, 'var(--accent)')} Draft ready
          </div>
          {doc.draftReason && (
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 8 }}>
              {doc.draftReason}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {doc.draftResponse}
          </div>
        </div>
      )}

      {files && files.length > 1 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Pages ({files.length})
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {files.map((f, i) => (
              <div key={f._id} style={{
                width: 48, height: 64, borderRadius: 4, overflow: 'hidden',
                border: '0.5px solid var(--sep)', background: '#f5f5f0',
              }}>
                {f.contentType?.startsWith('image/') && f.url ? (
                  <img src={f.url} alt={`Page ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 10, color: 'var(--muted)' }}>
                    {i + 1}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditableText({
  label,
  value,
  onChange,
  onBlur,
  saving,
  type = 'text',
  inputMode,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  saving?: boolean;
  type?: 'text' | 'date';
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  prefix?: string;
}) {
  return (
    <label style={fieldLabelStyle}>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span>{label}</span>
        {saving && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Saving</span>}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={event => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={prefix}
        style={fieldInputStyle}
      />
    </label>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 5,
  fontSize: 11,
  color: 'var(--muted)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  border: '0.5px solid var(--sep)',
  borderRadius: 7,
  background: '#fff',
  color: 'var(--ink)',
  padding: '7px 8px',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font)',
  outline: 'none',
  textTransform: 'none',
  letterSpacing: 0,
};

function inputDate(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function dateToTimestamp(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day, 12);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function ConfirmDeleteDocument({
  title,
  deleting,
  onCancel,
  onConfirm,
}: {
  title?: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div onClick={onCancel} style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      background: 'rgba(0,0,0,0.36)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
    }}>
      <div onClick={event => event.stopPropagation()} style={{
        width: 'min(380px, 100%)',
        borderRadius: 14,
        background: '#fff',
        boxShadow: '0 24px 70px rgba(0,0,0,0.24)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 18px 12px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Delete this document?
          </div>
          <div style={{ marginTop: 7, fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>
            {title ? `"${title}"` : 'This document'} and its files, reminders, calendar items, search chunks, and linked bookkeeping entries will be removed.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 18px' }}>
          <button onClick={onCancel} disabled={deleting} style={{
            flex: 1,
            border: '0.5px solid var(--sep)',
            borderRadius: 9,
            background: '#fff',
            color: 'var(--ink)',
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 800,
            fontFamily: 'var(--font)',
            cursor: deleting ? 'default' : 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} style={{
            flex: 1,
            border: 0,
            borderRadius: 9,
            background: 'oklch(0.50 0.16 25)',
            color: '#fff',
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 800,
            fontFamily: 'var(--font)',
            cursor: deleting ? 'default' : 'pointer',
            opacity: deleting ? 0.65 : 1,
          }}>
            {deleting ? 'Deleting' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
