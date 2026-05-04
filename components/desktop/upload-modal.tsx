'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Ic } from '@/components/icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

interface UploadModalProps {
  onClose: () => void;
}

interface FileEntry {
  name: string;
  stage: 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
}

const ACCEPTED_DOCUMENTS = [
  'image/*',
  '.pdf',
  '.txt',
  '.csv',
  '.json',
  '.doc',
  '.docx',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',');

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function supportedFile(file: File) {
  const extension = file.name.toLowerCase().split('.').pop();
  return (
    file.type.startsWith('image/') ||
    ['pdf', 'txt', 'csv', 'json', 'doc', 'docx'].includes(extension ?? '')
  );
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
  const workspace = useQuery(api.workspaces.getMyWorkspace);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const storeDocumentFile = useMutation(api.files.storeDocumentFile);
  const createCaptureSession = useMutation(api.captureSessions.create);
  const createProcessingJob = useMutation(api.processingJobs.create);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<Id<'captureSessions'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeSession = useQuery(
    api.captureSessions.get,
    activeSessionId ? { sessionId: activeSessionId } : 'skip',
  );

  useEffect(() => {
    if (!activeSession) return;
    if (activeSession.status === 'filed' || activeSession.status === 'needs_review') {
      setFiles(prev => prev.map(f => f.stage === 'processing' ? { ...f, stage: 'done' } : f));
    }
    if (activeSession.status === 'failed') {
      setFiles(prev => prev.map(f => f.stage === 'processing'
        ? { ...f, stage: 'error', error: activeSession.errorMessage ?? 'Processing failed' }
        : f));
    }
  }, [activeSession]);

  async function handleFiles(fileList: FileList) {
    setError(null);
    if (!workspace) {
      setError('Finish onboarding before uploading documents.');
      return;
    }

    const fileArray = Array.from(fileList).filter(file => supportedFile(file) && file.size <= MAX_FILE_BYTES);
    if (fileArray.length === 0) {
      setError('Use images, PDFs, text files, or Word documents under 25 MB.');
      return;
    }
    const newEntries: FileEntry[] = fileArray.map(f => ({
      name: f.name,
      stage: 'uploading' as const,
    }));
    const baseIdx = files.length;
    setFiles(prev => [...prev, ...newEntries]);

    try {
      // Create capture session
      const sessionId = await createCaptureSession({
        workspaceId: workspace._id,
        source: 'upload',
        pageCount: fileArray.length,
      });
      setActiveSessionId(sessionId);

      // Upload each file
      let uploadedCount = 0;
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const idx = baseIdx + i;

        try {
          // Get upload URL
          const uploadUrl = await generateUploadUrl();

          // Upload the file
          const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed: ${uploadRes.status}`);
          }

          const { storageId } = await uploadRes.json();

          // Store file reference
          await storeDocumentFile({
            workspaceId: workspace._id,
            captureSessionId: sessionId,
            storageId,
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            byteSize: file.size,
            pageNumber: i + 1,
          });
          uploadedCount += 1;

          setFiles(prev =>
            prev.map((f, fi) =>
              fi === idx ? { ...f, stage: 'processing' } : f,
            ),
          );
        } catch (err) {
          setFiles(prev =>
            prev.map((f, fi) =>
              fi === idx
                ? { ...f, stage: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
                : f,
            ),
          );
        }
      }

      if (uploadedCount === 0) {
        throw new Error('No files uploaded successfully');
      }

      // Kick off document ingest processing job
      await createProcessingJob({
        workspaceId: workspace._id,
        kind: 'document_ingest',
        captureSessionId: sessionId,
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload pipeline failed';
      setError(message);
      setFiles(prev => prev.map((f, fi) => fi >= baseIdx && f.stage !== 'done'
        ? { ...f, stage: 'error', error: message }
        : f));
    }
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
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', flex: 1, fontFamily: 'var(--font-display)' }}>Add to Julia</div>
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
              accept={ACCEPTED_DOCUMENTS}
              onChange={e => { if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files); }}
              style={{ display: 'none' }}
            />
          </div>

          {error && (
            <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 8,
              background: 'oklch(0.96 0.04 25)', color: 'oklch(0.45 0.18 25)',
              fontSize: 12.5, fontWeight: 600 }}>
              {error}
            </div>
          )}

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
                      <span style={{ color: 'oklch(0.55 0.14 150)', fontSize: 12, fontWeight: 600 }}>Processed</span>
                    ) : f.stage === 'error' ? (
                      <span title={f.error} style={{ color: 'oklch(0.55 0.20 25)', fontSize: 12, fontWeight: 600 }}>Error</span>
                    ) : (
                      <>
                        <Spinner />
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                          {f.stage === 'uploading' ? 'Uploading...' : 'Processing...'}
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
            <Channel2 icon={Ic.doc(14, 'var(--accent)')} title="Email" sub="inbox@julia.app" />
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
