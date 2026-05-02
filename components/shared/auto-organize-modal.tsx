'use client';

import React, { useState, useEffect } from 'react';
import { Ic } from '@/components/icons';
import type { FolderSummary } from '@/lib/auto-organize';

interface AutoOrganizeModalProps {
  folderSummaries: FolderSummary[];
  movesCount: number;
  newFoldersCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AutoOrganizeModal({
  folderSummaries,
  movesCount,
  newFoldersCount,
  onConfirm,
  onCancel,
}: AutoOrganizeModalProps) {
  const [phase, setPhase] = useState<'thinking' | 'proposal'>('thinking');

  useEffect(() => {
    const timer = setTimeout(() => setPhase('proposal'), 1500);
    return () => clearTimeout(timer);
  }, []);

  const allOrganized = movesCount === 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: 'modal-backdrop 0.2s ease-out forwards',
    }}>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal content */}
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: 420, maxHeight: '80vh',
        background: '#fff', borderRadius: 16,
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        animation: 'modal-slide-up 0.3s ease-out forwards',
        fontFamily: 'var(--font)',
      }}>
        {phase === 'thinking' ? (
          <ThinkingPhase />
        ) : (
          <ProposalPhase
            folderSummaries={folderSummaries}
            movesCount={movesCount}
            newFoldersCount={newFoldersCount}
            allOrganized={allOrganized}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  );
}

function ThinkingPhase() {
  return (
    <div style={{
      padding: '48px 32px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 16,
    }}>
      <div style={{ animation: 'sparkle-rotate 2s linear infinite' }}>
        {Ic.sparkle(32, 'var(--accent)')}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
        Analyzing your files...
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent)',
            animation: `thinking-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

function ProposalPhase({
  folderSummaries, movesCount, newFoldersCount, allOrganized, onConfirm, onCancel,
}: {
  folderSummaries: FolderSummary[];
  movesCount: number;
  newFoldersCount: number;
  allOrganized: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div style={{ padding: '20px 20px 12px', borderBottom: '0.5px solid var(--hair)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Ic.sparkle(18, 'var(--accent)')}
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Auto-organize</span>
        </div>
        {!allOrganized && (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
            {newFoldersCount > 0
              ? `Create ${newFoldersCount} folder${newFoldersCount > 1 ? 's' : ''} and sort ${movesCount} item${movesCount > 1 ? 's' : ''}`
              : `Sort ${movesCount} item${movesCount > 1 ? 's' : ''} into existing folders`
            }
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {allOrganized ? (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            {Ic.check(28, 'oklch(0.55 0.14 150)', 2.5)}
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
              Everything is already organized!
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              All items are filed into their appropriate folders.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {folderSummaries.map(fs => (
              <div key={fs.folderId} style={{
                padding: '10px 12px', borderRadius: 10,
                background: '#FAF9F5', border: '0.5px solid var(--sep)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5,
                    background: fs.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {Ic.doc(10, '#fff')}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{fs.folderName}</span>
                  {fs.isNew && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                      background: 'var(--accent-soft)', padding: '1px 6px',
                      borderRadius: 99, textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>NEW</span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
                    {fs.items.length} item{fs.items.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 28 }}>
                  {fs.items.slice(0, 5).map(it => (
                    <div key={it.id} style={{
                      fontSize: 12, color: 'var(--ink2)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {it.title}
                    </div>
                  ))}
                  {fs.items.length > 5 && (
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      + {fs.items.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 20px 16px', borderTop: '0.5px solid var(--hair)',
        display: 'flex', gap: 10,
      }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '11px 16px', borderRadius: 10,
          border: '0.5px solid var(--sep)', background: '#fff',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font)', color: 'var(--ink)',
        }}>
          Cancel
        </button>
        {!allOrganized && (
          <button onClick={onConfirm} style={{
            flex: 1, padding: '11px 16px', borderRadius: 10,
            border: 0, background: 'var(--ink)', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font)',
          }}>
            Looks good — organize
          </button>
        )}
      </div>
    </>
  );
}
