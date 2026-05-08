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
  title?: string;
  documentType?: string;
  category?: DocumentCategory;
  intakeCategory?: string;
  issuer?: string;
  fields?: { k: string; v: string }[];
}

interface CapturePreviewResponse {
  ok: boolean;
  title?: string;
  documentType?: string;
  category?: DocumentCategory;
  intakeCategory?: string;
  issuer?: string | null;
  entityId?: string | null;
  confidence?: number;
  reason?: string | null;
  fields?: { k: string; v: string }[];
}

type DocumentCategory = 'finance' | 'tax' | 'utilities' | 'legal' | 'insurance' | 'fines' | 'people' | 'operations' | 'other';

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
] satisfies Array<{ value: string; label: string; category: DocumentCategory }>;

const ACCEPTED_DOCUMENTS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
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
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls',
  '.xlsx',
].join(',');

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const VALID_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VALID_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const VALID_DOCUMENT_EXTENSIONS = new Set(['pdf', 'txt', 'csv', 'json', 'doc', 'docx', 'xls', 'xlsx']);

function supportedFile(file: File) {
  const extension = file.name.toLowerCase().split('.').pop();
  return (
    isImageFile(file) ||
    VALID_DOCUMENT_EXTENSIONS.has(extension ?? '')
  );
}

function isImageFile(file: File) {
  const extension = file.name.toLowerCase().split('.').pop();
  return VALID_IMAGE_MIMES.has(file.type) || VALID_IMAGE_EXTENSIONS.has(extension ?? '');
}

function contentTypeFor(file: File) {
  if (VALID_IMAGE_MIMES.has(file.type) || file.type === 'application/pdf' || file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/vnd.ms-excel' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return file.type;
  }
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'txt') return 'text/plain';
  if (extension === 'csv') return 'text/csv';
  if (extension === 'json') return 'application/json';
  if (extension === 'doc') return 'application/msword';
  if (extension === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (extension === 'xls') return 'application/vnd.ms-excel';
  if (extension === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
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
  const [mappingStatus, setMappingStatus] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | ''>('');
  const [selectedIntakeCategory, setSelectedIntakeCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const activeSession = useQuery(
    api.captureSessions.get,
    activeSessionId ? { sessionId: activeSessionId } : 'skip',
  );

  useEffect(() => {
    if (!activeSession) return;
    if (activeSession.status === 'filed' || activeSession.status === 'needs_review') {
      setFiles(prev => prev.map(f => f.stage === 'processing' ? { ...f, stage: 'done' } : f));
      const id = window.setTimeout(onClose, 900);
      return () => window.clearTimeout(id);
    }
    if (activeSession.status === 'failed') {
      setFiles(prev => prev.map(f => f.stage === 'processing'
        ? { ...f, stage: 'error', error: activeSession.errorMessage ?? 'Processing failed' }
        : f));
    }
  }, [activeSession, onClose]);

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

    const selected = Array.from(fileList);
    const rejectedCount = selected.filter(file => !supportedFile(file) || file.size > MAX_FILE_BYTES).length;
    const fileArray = selected.filter(file => supportedFile(file) && file.size <= MAX_FILE_BYTES);
    if (fileArray.length === 0) {
      setError('Use JPG, PNG, WebP, GIF, PDF, text, CSV, JSON, Word, or Excel files under 25 MB. HEIC is not supported.');
      return;
    }
    const newEntries: FileEntry[] = fileArray.map(f => {
      const previewUrl = isImageFile(f) ? URL.createObjectURL(f) : undefined;
      if (previewUrl) objectUrlsRef.current.add(previewUrl);
      return {
        file: f,
        name: f.name,
        stage: 'ready' as const,
        previewUrl,
      };
    });
    setFiles(prev => [...prev, ...newEntries]);
    setError(rejectedCount > 0 ? `Skipped ${rejectedCount} unsupported file${rejectedCount === 1 ? '' : 's'}. HEIC is not supported.` : null);
    void classifyCapturePreview(fileArray);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function classifyCapturePreview(fileArray: File[]) {
    if (!entities || entities.length === 0) return;
    setPreviewing(true);
    setMappingStatus('Julia is checking the likely entity and category...');
    try {
      const pages = await Promise.all(
        fileArray.slice(0, 3).map(fileToPreviewPayload),
      );
      const res = await fetch('/api/ai/capture-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages,
          entities: entities.map(entity => ({
            id: entity._id,
            kind: entity.kind,
            name: entity.name,
            subtitle: entity.subtitle,
            identifiers: entity.identifiers,
          })),
        }),
      });
      const data = await res.json() as CapturePreviewResponse;
      if (!res.ok || !data.ok) throw new Error('Preview classification failed');
      if (data.entityId && entities.some(entity => entity._id === data.entityId)) {
        setSelectedEntityId(data.entityId);
      }
      const nextCategory = data.category ?? categoryForIntake(data.intakeCategory);
      if (nextCategory) setSelectedCategory(nextCategory);
      if (data.intakeCategory) setSelectedIntakeCategory(data.intakeCategory);
      setFiles(prev => prev.map(entry => ({
        ...entry,
        title: data.title || entry.title,
        documentType: data.documentType || entry.documentType,
        category: nextCategory || entry.category,
        intakeCategory: data.intakeCategory || entry.intakeCategory,
        issuer: data.issuer || entry.issuer,
        fields: data.fields?.length ? data.fields : entry.fields,
      })));
      const entity = data.entityId ? entities.find(item => item._id === data.entityId) : null;
      const categoryLabel = labelForIntake(data.intakeCategory) ?? labelForCategory(nextCategory);
      setMappingStatus(entity
        ? `Julia thinks this belongs to ${entity.name}${categoryLabel ? ` · ${categoryLabel}` : ''}${data.confidence !== undefined ? ` · ${Math.round(data.confidence * 100)}%` : ''}`
        : `Julia picked ${categoryLabel ?? 'a category'}, but needs an entity.`);
    } catch {
      setMappingStatus(null);
    } finally {
      setPreviewing(false);
    }
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
        category: selectedCategory || undefined,
        intakeCategory: selectedIntakeCategory || undefined,
      });
      setActiveSessionId(sessionId);

      let uploadedCount = 0;
      for (let i = 0; i < uploadEntries.length; i++) {
        const { entry, index } = uploadEntries[i];
        const file = entry.file;

        try {
          const uploadUrl = await generateUploadUrl();
          const contentType = contentTypeFor(file);

          const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': contentType },
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
            contentType,
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

          {(previewing || mappingStatus || files.some(file => file.title || file.documentType || file.issuer)) && (
            <div style={{
              marginTop: 12, border: '0.5px solid var(--sep)',
              borderRadius: 10, background: '#fff', overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 12px', borderBottom: '0.5px solid var(--hair)',
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12.5, color: 'var(--ink)', fontWeight: 700,
              }}>
                {previewing ? <ScanningDots /> : Ic.sparkle(13, 'var(--accent)')} {mappingStatus ?? 'Julia checked the upload'}
              </div>
              {previewing && (
                <div style={{
                  padding: '12px 12px',
                  display: 'grid',
                  gridTemplateColumns: '38px 1fr',
                  gap: 10,
                  alignItems: 'center',
                  borderBottom: '0.5px solid var(--hair)',
                  background: '#FAF9F5',
                }}>
                  <div style={{
                    width: 38, height: 46, borderRadius: 8,
                    background: 'linear-gradient(180deg, #fff 0%, #F2F4F8 100%)',
                    border: '0.5px solid var(--sep)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', left: 0, right: 0, top: 0, height: 3,
                      background: 'var(--accent)',
                      animation: 'scan-line 1.15s ease-in-out infinite',
                    }} />
                    <style>{`@keyframes scan-line { 0% { transform: translateY(0); opacity: .35; } 50% { transform: translateY(42px); opacity: 1; } 100% { transform: translateY(0); opacity: .35; } }`}</style>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 800 }}>Scanning document</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      Entity and category controls unlock when Julia finishes checking.
                    </div>
                  </div>
                </div>
              )}
              {(entities?.length ?? 0) > 0 && (
                <div style={{ padding: 12, display: 'grid', gap: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                    File under
                    <select disabled={previewing} value={selectedEntityId} onChange={event => setSelectedEntityId(event.target.value)} style={{
                      width: '100%', border: '0.5px solid var(--sep)', borderRadius: 8,
                      background: '#fff', color: 'var(--ink)', padding: '8px 10px',
                      fontSize: 13, fontFamily: 'var(--font)', outline: 'none', marginTop: 6,
                      opacity: previewing ? 0.55 : 1,
                    }}>
                      <option value="" disabled>Choose an entity</option>
                      {(entities ?? []).map(entity => (
                        <option key={entity._id} value={entity._id}>{entity.name}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Category
                    <select disabled={previewing} value={selectedIntakeCategory} onChange={event => {
                      const option = INTAKE_OPTIONS.find(item => item.value === event.target.value);
                      setSelectedIntakeCategory(event.target.value);
                      setSelectedCategory(option?.category ?? '');
                    }} style={{
                      width: '100%', border: '0.5px solid var(--sep)', borderRadius: 8,
                      background: '#fff', color: 'var(--ink)', padding: '8px 10px',
                      fontSize: 13, fontFamily: 'var(--font)', outline: 'none', marginTop: 6,
                      opacity: previewing ? 0.55 : 1,
                    }}>
                      <option value="" disabled>Choose category</option>
                      {INTAKE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
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
                    <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.title || f.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                      Page {i + 1}{f.documentType ? ` · ${f.documentType}` : ''}{f.intakeCategory ? ` · ${labelForIntake(f.intakeCategory) ?? f.intakeCategory}` : ''}
                    </div>
                    {f.issuer && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.issuer}
                      </div>
                    )}
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

function ScanningDots() {
  return (
    <span style={{ width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: 99,
        background: 'var(--accent)',
        animation: 'scan-pulse 0.9s ease-in-out infinite',
      }} />
      <style>{`@keyframes scan-pulse { 0%, 100% { transform: scale(.65); opacity: .45; } 50% { transform: scale(1.15); opacity: 1; } }`}</style>
    </span>
  );
}

async function fileToPreviewPayload(file: File) {
  return {
    name: file.name,
    contentType: contentTypeFor(file),
    dataUrl: isImageFile(file)
      ? await fileToPreviewImageDataUrl(file)
      : file.size <= 8 * 1024 * 1024
        ? await readFileAsDataUrl(file)
        : undefined,
  };
}

async function fileToPreviewImageDataUrl(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });

    const maxSide = 1200;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return await readFileAsDataUrl(file);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch {
    return await readFileAsDataUrl(file);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function categoryForIntake(value?: string | null): DocumentCategory | '' {
  return INTAKE_OPTIONS.find(option => option.value === value)?.category ?? '';
}

function labelForIntake(value?: string | null) {
  return INTAKE_OPTIONS.find(option => option.value === value)?.label;
}

function labelForCategory(value?: DocumentCategory | '') {
  if (!value) return undefined;
  const labels: Record<DocumentCategory, string> = {
    finance: 'Finance',
    tax: 'Tax',
    utilities: 'Utilities',
    legal: 'Legal',
    insurance: 'Insurance',
    fines: 'Fines',
    people: 'People',
    operations: 'Operations',
    other: 'Other',
  };
  return labels[value];
}
