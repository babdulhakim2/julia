'use client';

import React, { useState, useRef } from 'react';
import { Ic } from '@/components/icons';
import { useStore } from '@/lib/store';
import type { Item } from '@/lib/types';

interface UploadModalProps {
  onClose: () => void;
}

interface FileEntry {
  name: string;
  stage: 'uploading' | 'extracting' | 'done';
}

function Channel2({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={{
      padding: 12, borderRadius: 9, border: '0.5px solid var(--sep)', background: '#FAF9F5',
    }}>
      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'oklch(0.95 0.04 252)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
    </div>
  );
}

export function DesktopUploadModal({ onClose }: UploadModalProps) {
  const { state, dispatch } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList: FileList) {
    const newFiles: FileEntry[] = Array.from(fileList).map(f => ({ name: f.name, stage: 'uploading' as const }));
    setFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach((entry, idx) => {
      const baseIdx = files.length + idx;
      // Simulate upload
      setTimeout(() => {
        setFiles(prev => prev.map((f, i) => i === baseIdx ? { ...f, stage: 'extracting' } : f));
        // Simulate extraction
        setTimeout(() => {
          setFiles(prev => prev.map((f, i) => i === baseIdx ? { ...f, stage: 'done' } : f));
          // Create item
          const item: Item = {
            id: `up-${Date.now()}-${idx}`,
            entity: state.entities[0]?.id || null,
            category: 'finance',
            type: 'Document',
            title: entry.name.replace(/\.[^.]+$/, ''),
            date: new Date().toISOString().slice(0, 10),
            status: 'needs_review',
            confidence: 0.7,
            capturedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          };
          dispatch({ type: 'ADD_ITEM', item });
        }, 1200);
      }, 500);
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(20,20,20,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 520, background: '#fff', borderRadius: 14,
        boxShadow: '0 30px 80px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--sep)',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', flex: 1, fontFamily: 'var(--font-display)' }}>Add to Secretary</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 4 }}>{Ic.x(18, 'var(--muted)')}</button>
        </div>

        <div style={{ padding: 20 }}>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            style={{
              border: dragOver ? '2px solid var(--accent)' : '1.5px dashed var(--sep)',
              borderRadius: 12, padding: '34px 20px',
              textAlign: 'center',
              background: dragOver ? 'rgba(0,122,255,0.04)' : '#FAF9F5',
              transition: 'border 0.15s, background 0.15s',
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--ink)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              {Ic.camera(22, '#fff')}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
              {dragOver ? 'Drop to upload' : 'Drop letters, PDFs, or photos here'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>I&apos;ll figure out which entity, the type, the amount, the deadline.</div>
            <button onClick={() => fileInputRef.current?.click()} style={{
              marginTop: 12, padding: '6px 14px', borderRadius: 7,
              background: 'var(--accent)', color: '#fff', border: 0, cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
            }}>Choose files</button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={e => { if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files); }}
              style={{ display: 'none' }}
            />
          </div>

          {/* File progress list */}
          {files.length > 0 && (
            <div style={{ marginTop: 14, borderRadius: 10, border: '0.5px solid var(--sep)', overflow: 'hidden' }}>
              {files.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  borderBottom: i === files.length - 1 ? 'none' : '0.5px solid var(--hair)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {f.stage === 'done' ? (
                      <span style={{ color: 'oklch(0.55 0.14 150)', fontSize: 12, fontWeight: 600 }}>✓ Filed</span>
                    ) : (
                      <>
                        <Spinner />
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                          {f.stage === 'uploading' ? 'Uploading…' : 'Extracting…'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <Channel2 icon={Ic.paperclip(14, 'var(--accent)')} title="WhatsApp" sub="+44 7700 900100" />
            <Channel2 icon={Ic.doc(14, 'var(--accent)')} title="Email" sub="julia@inbox.secretary.app" />
            <Channel2 icon={Ic.cal(14, 'var(--accent)')} title="Drive sync" sub="Auto-import folder" />
          </div>
        </div>
      </div>
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
