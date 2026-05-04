'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Ic } from '@/components/icons';

interface DocumentPreviewModalProps {
  documentId: string;
  onClose: () => void;
}

function formatCurrency(amountMinor: number, currency: string) {
  const symbol = currency === 'GBP' ? '\u00a3' : currency === 'USD' ? '$' : currency === 'EUR' ? '\u20ac' : `${currency} `;
  return `${symbol}${(amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DocumentPreviewModal({ documentId, onClose }: DocumentPreviewModalProps) {
  const [expanded, setExpanded] = useState(false);
  const doc = useQuery(api.documents.getById, { documentId: documentId as Id<'documents'> });
  const files = useQuery(api.files.listByDocumentId, { documentId: documentId as Id<'documents'> });

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
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 900, maxHeight: '85vh',
        background: '#fff', borderRadius: 14,
        display: 'flex', overflow: 'hidden',
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
            <button onClick={onClose} style={{
              background: 'transparent', border: 0, cursor: 'pointer', padding: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {Ic.x(16, 'var(--muted)')}
            </button>
          </div>

          {!doc ? (
            <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
          ) : (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, fontFamily: 'var(--font-display)' }}>
                  {doc.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {doc.documentType}
                </div>
              </div>

              {doc.summary && (
                <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                  {doc.summary}
                </div>
              )}

              <div style={{ background: '#FAF9F5', borderRadius: 8, padding: '4px 12px', border: '0.5px solid var(--sep)' }}>
                {doc.issuer && <MetaRow label="Issuer" value={doc.issuer} />}
                {doc.reference && <MetaRow label="Reference" value={doc.reference} />}
                {doc.amount && <MetaRow label="Amount" value={formatCurrency(doc.amount.amountMinor, doc.amount.currency)} />}
                {doc.issuedAt && <MetaRow label="Issued" value={fmtDate(doc.issuedAt)} />}
                {doc.dueAt && <MetaRow label="Due" value={fmtDate(doc.dueAt)} />}
                <MetaRow label="Category" value={doc.category} />
                <MetaRow label="Status" value={doc.status} last />
              </div>

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
          )}
        </div>

      </div>
    </div>
  );
}

function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: last ? 'none' : '0.5px solid var(--hair)', gap: 10,
    }}>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
