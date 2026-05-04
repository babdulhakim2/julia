'use client';

import React, { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Ic } from '@/components/icons';
import { DocumentPreviewModal } from '@/components/shared/document-preview-modal';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  search: string;
  setSearch: (s: string) => void;
  semanticSearch?: boolean;
  semanticEntityId?: string;
}

interface SearchResult {
  chunkId: string;
  text: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  category: string;
  issuer?: string;
  score: number;
}

export function PageHeader({ title, subtitle, search, setSearch, semanticSearch = false, semanticEntityId }: PageHeaderProps) {
  const workspace = useQuery(api.workspaces.getMyWorkspace);
  const runSearch = useAction(api.search.semanticSearch);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchedFor, setSearchedFor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);

  async function submitSemanticSearch() {
    const query = search.trim();
    if (!semanticSearch || !query || !workspace) return;
    setSearching(true);
    setError(null);
    setSearchedFor(query);
    try {
      const response = await runSearch({
        workspaceId: workspace._id,
        entityId: semanticEntityId ? semanticEntityId as Id<'entities'> : undefined,
        query,
        limit: 8,
      });
      setResults(response.results as SearchResult[]);
      if (response.error) setError(response.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div style={{
      padding: '16px 24px 14px', borderBottom: '0.5px solid var(--sep)',
      display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 20,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: -0.3, fontFamily: 'var(--font-display)' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '6px 10px', borderRadius: 7,
        background: 'rgba(118,118,128,0.10)', minWidth: 240,
      }}>
        <button
          onClick={submitSemanticSearch}
          disabled={!semanticSearch || searching || !search.trim()}
          title={semanticSearch ? 'Search indexed documents' : 'Search'}
          style={{
            width: 20, height: 20, border: 0, background: 'transparent', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: semanticSearch && search.trim() && !searching ? 'pointer' : 'default',
            color: 'var(--muted)',
          }}
        >
          {searching ? <Spinner /> : Ic.search(14, 'var(--muted)')}
        </button>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submitSemanticSearch();
          }
        }} placeholder={semanticSearch ? 'Search indexed documents...' : 'Search docs, items, entities...'}
          style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--ink)' }} />
        {semanticSearch && (
          <span style={{ fontSize: 11, color: 'var(--muted2)', padding: '1px 5px',
            border: '0.5px solid var(--sep)', borderRadius: 4, fontFamily: 'ui-monospace, SF Mono, Menlo, monospace' }}>Enter</span>
        )}
      </div>

      {semanticSearch && (searchedFor || searching) && (
        <div style={{
          position: 'absolute', top: 'calc(100% - 6px)', right: 24, width: 420, maxHeight: 380,
          background: '#fff', border: '0.5px solid var(--sep)', borderRadius: 10,
          boxShadow: '0 16px 50px rgba(0,0,0,0.14)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 12px', borderBottom: '0.5px solid var(--hair)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {searching ? 'Searching documents' : `Results for "${searchedFor}"`}
            </div>
            <button onClick={() => { setSearchedFor(''); setResults([]); setError(null); }} style={{
              border: 0, background: 'transparent', cursor: 'pointer', padding: 2,
              display: 'flex', alignItems: 'center',
            }}>{Ic.x(14, 'var(--muted)')}</button>
          </div>
          {error ? (
            <div style={{ padding: 14, fontSize: 13, color: 'oklch(0.48 0.18 25)' }}>{error}</div>
          ) : searching ? (
            <div style={{ padding: 16, fontSize: 13, color: 'var(--muted)' }}>Searching indexed document chunks...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: 'var(--muted)' }}>No indexed document matches yet.</div>
          ) : (
            <div style={{ maxHeight: 326, overflowY: 'auto' }}>
              {results.map((result, index) => (
                <button key={`${result.chunkId}-${index}`} onClick={() => setPreviewDocumentId(result.documentId)} style={{
                  width: '100%', display: 'block', padding: '11px 12px', border: 0,
                  borderBottom: index === results.length - 1 ? 'none' : '0.5px solid var(--hair)',
                  background: 'transparent', textAlign: 'left', cursor: 'pointer',
                  fontFamily: 'var(--font)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--accent)', display: 'flex' }}>{Ic.doc(14, 'var(--accent)')}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {result.documentTitle}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--muted2)', fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(result.score * 100)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                    {result.issuer || result.documentType} · {result.category}
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--ink2)', lineHeight: 1.35, marginTop: 5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  } as React.CSSProperties}>
                    {result.text}
                  </div>
                </button>
              ))}
            </div>
          )}
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

function Spinner() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" style={{ animation: 'spin 1s linear infinite' }}>
      <circle cx={7} cy={7} r={5} fill="none" stroke="var(--muted)" strokeWidth={1.5} opacity={0.3} />
      <path d="M7 2a5 5 0 0 1 5 5" fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
