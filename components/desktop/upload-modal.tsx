'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Ic } from '@/components/icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useActiveWorkspace } from '@/lib/admin-view';

interface UploadModalProps {
  onClose: () => void;
}

interface FileEntry {
  file: File;
  name: string;
  stage: 'ready' | 'uploading' | 'processing' | 'done' | 'error';
  previewUrl?: string;
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

export function DesktopUploadModal({ onClose }: UploadModalProps) {
  const { workspace } = useActiveWorkspace();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const storeDocumentFile = useMutation(api.files.storeDocumentFile);
  const createCaptureSession = useMutation(api.captureSessions.create);
  const createProcessingJob = useMutation(api.processingJobs.create);
  const entities = useQuery(
    api.entities.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : 'skip',
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<Id<'captureSessions'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState('');
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

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  function handleFiles(fileList: FileList) {
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
    const newEntries: FileEntry[] = fileArray.map(f => {
      const previewUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined;
      if (previewUrl) objectUrlsRef.current.add(previewUrl);
      return {
        file: f,
        name: f.name,
        stage: 'ready' as const,
        previewUrl,
      };
    });
    setFiles(prev => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setFiles(prev => {
      const entry = prev[index];
      if (entry?.previewUrl) {
        URL.revokeObjectURL(entry.previewUrl);
        objectUrlsRef.current.delete(entry.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  async function submitFiles() {
    setError(null);
    if (!workspace) {
      setError('Finish onboarding before uploading documents.');
      return;
    }

    const uploadEntries = files
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.stage === 'ready' || entry.stage === 'error');
    if (uploadEntries.length === 0 || submitting) return;
    setSubmitting(true);
    const uploadIndexes = new Set(uploadEntries.map(({ index }) => index));
    setFiles(prev => prev.map((f, index) => uploadIndexes.has(index) ? { ...f, stage: 'uploading' as const, error: undefined } : f));

    try {
      const sessionId = await createCaptureSession({
        workspaceId: workspace._id,
        source: 'upload',
        pageCount: uploadEntries.length,
        entityId: selectedEntityId ? selectedEntityId as Id<'entities'> : undefined,
      });
      setActiveSessionId(sessionId);

      let uploadedCount = 0;
      for (let i = 0; i < uploadEntries.length; i++) {
        const { entry, index } = uploadEntries[i];
        const file = entry.file;

        try {
          const uploadUrl = await generateUploadUrl();

          const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed: ${uploadRes.status}`);
          }

          const { storageId } = await uploadRes.json();

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
              fi === index ? { ...f, stage: 'processing' } : f,
            ),
          );
        } catch (err) {
          setFiles(prev =>
            prev.map((f, fi) =>
              fi === index
                ? { ...f, stage: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
                : f,
            ),
          );
        }
      }

      if (uploadedCount === 0) {
        throw new Error('No files uploaded successfully');
      }

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
      setFiles(prev => prev.map((f) => f.stage !== 'done'
        ? { ...f, stage: 'error', error: message }
        : f));
    } finally {
      setSubmitting(false);
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
              {dragOver ? 'Drop pages here' : 'Drop pages for one document here'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Add all pages first. Julia will only process after you send them.</div>
            <button onClick={() => fileInputRef.current?.click()} style={{
              marginTop: 12, padding: '6px 14px', borderRadius: 7,
              background: 'var(--accent)', color: '#fff', border: 0, cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
            }}>{files.length > 0 ? 'Add more pages' : 'Choose pages'}</button>
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
                  <div style={{
                    width: 30, height: 38, borderRadius: 5, border: '0.5px solid var(--sep)',
                    overflow: 'hidden', background: '#fff', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {f.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      Ic.doc(14, 'var(--muted)')
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Page {i + 1}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {f.stage === 'ready' ? (
                      <button onClick={() => removeFile(i)} style={{
                        border: 0, background: 'transparent', color: 'var(--muted)',
                        cursor: 'pointer', padding: 3, display: 'flex',
                      }}>{Ic.x(14, 'var(--muted)')}</button>
                    ) : f.stage === 'done' ? (
                      <span style={{ color: 'oklch(0.55 0.14 150)', fontSize: 12, fontWeight: 600 }}>Processed</span>
                    ) : f.stage === 'error' ? (
                      <>
                        <span title={f.error} style={{ color: 'oklch(0.55 0.20 25)', fontSize: 12, fontWeight: 600 }}>Error</span>
                        <button onClick={() => removeFile(i)} style={{
                          border: 0, background: 'transparent', color: 'var(--muted)',
                          cursor: 'pointer', padding: 3, display: 'flex',
                        }}>{Ic.x(14, 'var(--muted)')}</button>
                      </>
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

          {files.length > 0 && (entities?.length ?? 0) > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                File under
              </div>
              <select value={selectedEntityId} onChange={event => setSelectedEntityId(event.target.value)} style={{
                width: '100%', border: '0.5px solid var(--sep)', borderRadius: 8,
                background: '#fff', color: 'var(--ink)', padding: '9px 10px',
                fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
              }}>
                <option value="">Let Julia infer it</option>
                {(entities ?? []).map(entity => (
                  <option key={entity._id} value={entity._id}>{entity.name}</option>
                ))}
              </select>
            </div>
          )}

          {files.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {files.length} page{files.length === 1 ? '' : 's'} queued as one document
              </div>
              <button onClick={submitFiles} disabled={submitting || files.every(f => f.stage !== 'ready' && f.stage !== 'error')} style={{
                padding: '8px 14px', borderRadius: 8, border: 0,
                background: submitting ? 'var(--muted2)' : 'var(--ink)', color: '#fff',
                fontSize: 12.5, fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
                fontFamily: 'var(--font)',
              }}>{submitting ? 'Sending...' : 'Send to Julia'}</button>
            </div>
          )}
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
