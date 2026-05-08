'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { CapturedPage } from '@/lib/types';
import { Ic } from '@/components/icons';
import { Btn } from '@/components/ui/button';
import { DocPreview } from '@/components/ui/doc-preview';
import { useActiveWorkspace } from '@/lib/admin-view';

interface CaptureFlowProps {
  onClose: () => void;
  onFiled: (pages: CapturedPage[]) => void;
}

interface LocalCapturedPage extends CapturedPage {
  previewUrl?: string;
  fileName: string;
  contentType: string;
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

const ACCEPTED_CAMERA_IMAGES = 'image/jpeg,image/png,image/webp';
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

function contentTypeFor(file: File, source: 'camera' | 'upload') {
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
  if (['png'].includes(extension ?? '')) return 'image/png';
  if (['webp'].includes(extension ?? '')) return 'image/webp';
  if (['gif'].includes(extension ?? '')) return 'image/gif';
  if (['jpg', 'jpeg'].includes(extension ?? '') || source === 'camera') return 'image/jpeg';
  return 'application/octet-stream';
}

export function CaptureFlow({ onClose, onFiled }: CaptureFlowProps) {
  const { workspace } = useActiveWorkspace();
  const entities = useQuery(
    api.entities.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip",
  );
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const storeDocumentFile = useMutation(api.files.storeDocumentFile);
  const createCaptureSession = useMutation(api.captureSessions.create);
  const createProcessingJob = useMutation(api.processingJobs.create);

  const [stage, setStage] = useState<'aim' | 'capturing' | 'extracting' | 'review' | 'uploading'>('aim');
  const [pages, setPages] = useState<LocalCapturedPage[]>([]);
  const [capturedFiles, setCapturedFiles] = useState<File[]>([]);
  const [sessionSource, setSessionSource] = useState<'camera' | 'upload'>('camera');
  const [activeIdx, setActiveIdx] = useState(0);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mappingStatus, setMappingStatus] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  function triggerCamera() {
    setSessionSource(current => current === 'upload' ? current : 'camera');
    cameraInputRef.current?.click();
  }

  function triggerUpload() {
    setSessionSource('upload');
    uploadInputRef.current?.click();
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>, source: 'camera' | 'upload') {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;
    const rejectedCount = selectedFiles.filter(file => !supportedFile(file) || file.size > MAX_FILE_BYTES).length;
    const files = selectedFiles.filter(file => supportedFile(file) && file.size <= MAX_FILE_BYTES);
    if (files.length === 0) {
      setError('Use JPG, PNG, WebP, GIF, PDF, text, CSV, JSON, Word, or Excel files under 25 MB. HEIC is not supported.');
      if (e.currentTarget) e.currentTarget.value = '';
      return;
    }

    setError(rejectedCount > 0 ? `Skipped ${rejectedCount} unsupported file${rejectedCount === 1 ? '' : 's'}. HEIC is not supported.` : null);
    if (source === 'upload') setSessionSource('upload');
    setMappingStatus('Julia is scanning for entity and category...');
    setStage('extracting');

    const allFiles = [...capturedFiles, ...files];
    setCapturedFiles(prev => [...prev, ...files]);

    const startIndex = pages.length;
    setPages(prev => {
      const created = files.map((file, index): LocalCapturedPage => {
        const contentType = contentTypeFor(file, source);
        const previewUrl = isImageFile(file) ? URL.createObjectURL(file) : undefined;
        if (previewUrl) objectUrlsRef.current.add(previewUrl);
        return {
          preview: 'lambeth',
          previewUrl,
          contentType,
          fileName: file.name || `capture-${prev.length + index + 1}.jpg`,
          type: 'Document page',
          issuer: 'Ready to send',
          title: file.name ? file.name.replace(/\.[^.]+$/, '') : `Captured page ${prev.length + index + 1}`,
          entity: '',
          category: undefined,
          intakeCategory: undefined,
          confidence: 0,
          fields: [],
        };
      });
      const next = [...prev, ...created];
      setActiveIdx(next.length - created.length);
      return next;
    });

    setTimeout(() => setStage('review'), 300);
    void classifyCapturePreview(allFiles, startIndex, files.length);

    // Reset input so same file can be selected again
    if (e.currentTarget) e.currentTarget.value = '';
  }

  async function classifyCapturePreview(allFiles: File[], startIndex: number, count: number) {
    if (!entities || entities.length === 0) {
      setMappingStatus(null);
      return;
    }

    setPreviewing(true);
    try {
      const imagePages = await Promise.all(
        allFiles
          .slice(0, 3)
          .map(fileToPreviewPayload),
      );
      if (imagePages.length === 0) {
        setMappingStatus(null);
        return;
      }

      const res = await fetch('/api/ai/capture-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: imagePages,
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

      const entity = data.entityId
        ? entities.find(item => item._id === data.entityId)
        : null;
      const nextCategory = data.category ?? categoryForIntake(data.intakeCategory);
      setPages(prev => prev.map((page, index) => {
        const inCurrentDocument = index < startIndex + count || count === allFiles.length;
        if (!inCurrentDocument) return page;
        return {
          ...page,
          title: data.title || page.title,
          type: data.documentType || page.type,
          category: nextCategory || page.category,
          intakeCategory: data.intakeCategory || page.intakeCategory,
          issuer: data.issuer || (entity ? `Likely ${entity.name}` : page.issuer),
          entity: entity?._id ?? page.entity,
          confidence: data.confidence ?? page.confidence,
          fields: data.fields?.length ? data.fields : page.fields,
          action: data.reason || page.action,
        };
      }));
      const categoryLabel = labelForIntake(data.intakeCategory) ?? labelForCategory(nextCategory);
      setMappingStatus(entity
        ? `Matched to ${entity.name}${categoryLabel ? ` · ${categoryLabel}` : ''}${data.confidence !== undefined ? ` · ${Math.round(data.confidence * 100)}%` : ''}`
        : `Picked ${categoryLabel ?? 'a category'}, but needs an entity`);
      window.setTimeout(() => setMappingStatus(null), 2500);
    } catch {
      setMappingStatus(null);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleFile() {
    if (!workspace || capturedFiles.length === 0) return;
    setStage('uploading');
    setError(null);

    try {
      const hintedEntity = pages.find(page => page.entity);
      const hintedCategory = pages.find(page => page.category || page.intakeCategory);
      const hintedEntityId = hintedEntity?.entity
        ? hintedEntity.entity as Id<'entities'>
        : undefined;
      const sessionId = await createCaptureSession({
        workspaceId: workspace._id,
        source: sessionSource,
        pageCount: capturedFiles.length,
        entityId: hintedEntityId,
        category: hintedCategory?.category as DocumentCategory | undefined,
        intakeCategory: hintedCategory?.intakeCategory,
      });

      for (let i = 0; i < capturedFiles.length; i++) {
        const file = capturedFiles[i];
        const contentType = contentTypeFor(file, sessionSource);
        const uploadUrl = await generateUploadUrl();

        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': contentType },
          body: file,
        });

        if (!uploadRes.ok) throw new Error('Upload failed');
        const { storageId } = await uploadRes.json();

        await storeDocumentFile({
          workspaceId: workspace._id,
          captureSessionId: sessionId,
          storageId,
          fileName: file.name || `capture-${i + 1}.jpg`,
          contentType,
          byteSize: file.size,
          pageNumber: i + 1,
        });
      }

      // Start processing
      await createProcessingJob({
        workspaceId: workspace._id,
        kind: 'document_ingest',
        captureSessionId: sessionId,
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash',
      });

      onFiled(pages.map(page => ({
        preview: page.preview,
        type: page.type,
        issuer: page.issuer,
        title: page.title,
        entity: page.entity,
        category: page.category,
        intakeCategory: page.intakeCategory,
        confidence: page.confidence,
        fields: page.fields,
        action: page.action,
      })));
    } catch (err) {
      console.error('Capture upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStage('review');
    }
  }

  function removePage(index: number) {
    const target = pages[index];
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
      objectUrlsRef.current.delete(target.previewUrl);
    }
    const next = pages.filter((_, i) => i !== index);
    setPages(next);
    setActiveIdx(current => Math.max(0, Math.min(current >= index ? current - 1 : current, next.length - 1)));
    if (next.length === 0) setStage('aim');
    setCapturedFiles(prev => prev.filter((_, i) => i !== index));
  }

  const active = pages[activeIdx];
  const activeEntity = active && (entities ?? []).find(e => e._id === active.entity);

  // Hidden inputs: camera goes straight to native capture; upload opens the regular file picker.
  const hiddenInput = (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPTED_CAMERA_IMAGES}
        capture="environment"
        multiple
        onChange={event => handleFiles(event, 'camera')}
        style={{ display: 'none' }}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept={ACCEPTED_DOCUMENTS}
        multiple
        onChange={event => handleFiles(event, 'upload')}
        style={{ display: 'none' }}
      />
    </>
  );

  // AIM stage: a lightweight action sheet over the current mobile screen.
  if (stage === 'aim') {
    return (
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 80,
        background: 'rgba(0,0,0,0.34)',
        display: 'flex', alignItems: 'flex-end',
        borderRadius: 'inherit', overflow: 'hidden',
      }}>
        {hiddenInput}
        <div onClick={event => event.stopPropagation()} style={{
          width: '100%',
          background: 'var(--background)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: '10px 16px 30px',
          boxShadow: '0 -18px 50px rgba(0,0,0,0.22)',
          animation: 'capture-sheet-in 180ms ease-out',
        }}>
          <style>{`@keyframes capture-sheet-in { from { transform: translateY(24px); opacity: 0.7; } to { transform: translateY(0); opacity: 1; } }`}</style>
          <div style={{ width: 38, height: 4, borderRadius: 99, background: 'var(--sep)', margin: '4px auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Add to Julia</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                Take a photo or upload an existing file.
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 16, border: 0,
              background: '#fff', color: 'var(--muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {Ic.x(16, 'var(--muted)')}
            </button>
          </div>
          {error && (
            <div style={{
              marginBottom: 10, padding: '9px 11px', borderRadius: 10,
              background: 'oklch(0.96 0.04 25)', color: 'oklch(0.45 0.18 25)',
              fontSize: 12.5, fontWeight: 600,
            }}>
              {error}
            </div>
          )}
          <div style={{
            background: '#fff', borderRadius: 14, overflow: 'hidden',
            border: '0.5px solid var(--sep)',
          }}>
            <CaptureOption
              icon={Ic.camera(20, 'var(--accent)')}
              title="Take photo"
              sub="Open the camera and add one or more pages"
              onClick={triggerCamera}
            />
            <CaptureOption
              icon={Ic.doc(20, 'var(--accent)')}
              title="Upload file"
              sub="Images, PDF, text, CSV, Word, or Excel"
              onClick={triggerUpload}
              last
            />
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'capturing' || stage === 'extracting') {
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'var(--background)', color: 'var(--ink)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'inherit' }}>
        {hiddenInput}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0' }}>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 18,
            background: '#fff', border: '0.5px solid var(--sep)', color: 'var(--ink)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Ic.x(18, 'var(--ink)')}</button>
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '32px 28px', textAlign: 'center',
        }}>
          <div style={{
            width: 74, height: 74, borderRadius: 24,
            background: 'var(--ink)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 18,
          }}>
            <Spinner />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)', letterSpacing: -0.3 }}>
            Adding page...
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.45, marginTop: 8, maxWidth: 280 }}>
            {pages.length > 0
              ? `${pages.length} page${pages.length > 1 ? 's' : ''} captured. Add another page or review before sending.`
              : 'Use the camera or choose an existing file. Add all pages first, then send once.'}
          </div>
        </div>

        {pages.length > 0 && (
          <div style={{ padding: '12px 16px 30px', display: 'flex', gap: 8 }}>
            <Btn size="lg" variant="secondary" style={{ flex: 1 }} onClick={triggerCamera}>
              Add photo
            </Btn>
            <Btn size="lg" variant="secondary" style={{ flex: 1 }} onClick={triggerUpload}>
              Add file
            </Btn>
            <Btn size="lg" variant="dark" style={{ flex: 1.2 }} onClick={() => setStage('review')}>
              Review
            </Btn>
          </div>
        )}
      </div>
    );
  }

  // UPLOADING stage
  if (stage === 'uploading') {
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'var(--background)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'inherit' }}>
        <Spinner />
        <div style={{ marginTop: 16, fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
          Uploading and processing...
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)' }}>
          {pages.length} page{pages.length > 1 ? 's' : ''}
        </div>
      </div>
    );
  }

  // REVIEW stage
  if (stage === 'review' && active) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'var(--background)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'inherit' }}>
        {hiddenInput}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 12px 8px' }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: 'var(--accent)',
            fontSize: 17, fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 2,
          }}>{Ic.back(18, 'var(--accent)')} Cancel</button>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
            {pages.length > 1 ? `Page ${activeIdx + 1} of ${pages.length}` : 'Review'}
          </div>
          <button onClick={triggerUpload} style={{
            background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: 'var(--accent)',
            fontSize: 15, fontWeight: 500, fontFamily: 'var(--font)',
          }}>+ File</button>
        </div>

        <div style={{ padding: '0 16px' }}>
          <div style={{ position: 'relative' }}>
            <PagePreview page={active} height={180} />
            <div style={{
              position: 'absolute', top: 10, left: 10,
              padding: '4px 8px', borderRadius: 6,
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {Ic.sparkle(11, '#fff')} {active.confidence > 0 ? `${Math.round(active.confidence * 100)}% confident` : 'Captured'}
            </div>
          </div>
        </div>

        {pages.length > 1 && (
          <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 16px 0' }}>
            {pages.map((page, index) => (
              <button key={page.previewUrl ?? `${page.fileName}-${index}`} onClick={() => setActiveIdx(index)} style={{
                width: 48, height: 62, borderRadius: 7, padding: 0, overflow: 'hidden',
                border: index === activeIdx ? '2px solid var(--accent)' : '0.5px solid var(--sep)',
                background: '#fff', flexShrink: 0, cursor: 'pointer',
              }}>
                <PagePreview page={page} height={62} />
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
          <div style={{ padding: '16px 16px 4px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{active.type}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.3, marginTop: 4, lineHeight: 1.2, fontFamily: 'var(--font-display)' }}>{active.title}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{active.issuer}</div>
          </div>

          {error && (
            <div style={{ margin: '10px 16px 0', padding: '10px 12px', borderRadius: 10,
              background: 'oklch(0.96 0.04 25)', color: 'oklch(0.45 0.18 25)',
              fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}

          {mappingStatus && (
            <div style={{ margin: '10px 16px 0', padding: '10px 12px', borderRadius: 10,
              background: 'var(--accent-soft)', color: 'var(--ink)',
              fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
              {previewing ? <ScanningDots /> : Ic.sparkle(13, 'var(--accent)')} {mappingStatus}
            </div>
          )}

          {previewing && (
            <div style={{
              margin: '10px 16px 0',
              borderRadius: 12,
              border: '0.5px solid var(--sep)',
              background: '#fff',
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 40, height: 52, borderRadius: 9,
                background: 'linear-gradient(180deg, #fff 0%, #F2F4F8 100%)',
                border: '0.5px solid var(--sep)',
                position: 'relative', overflow: 'hidden',
                flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', left: 0, right: 0, top: 0, height: 3,
                  background: 'var(--accent)',
                  animation: 'mobile-scan-line 1.15s ease-in-out infinite',
                }} />
                <style>{`@keyframes mobile-scan-line { 0% { transform: translateY(0); opacity: .35; } 50% { transform: translateY(48px); opacity: 1; } 100% { transform: translateY(0); opacity: .35; } }`}</style>
              </div>
              <div>
                <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 800 }}>Scanning document</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.35 }}>
                  Julia is matching the business and document type. You can adjust it when this finishes.
                </div>
              </div>
            </div>
          )}

          {/* Entity assignment */}
          {(entities?.length ?? 0) > 0 && (
            <div style={{ padding: '12px 16px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Filed under</div>
              <button disabled={previewing} onClick={() => setShowEntityPicker(true)} style={{
                width: '100%', textAlign: 'left',
                padding: '12px 14px', borderRadius: 12,
                border: '1px solid var(--hair)', background: '#fff', cursor: previewing ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font)',
                opacity: previewing ? 0.55 : 1,
              }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: activeEntity?.color ?? 'var(--sep)' }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>{activeEntity?.name ?? 'Not assigned'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{activeEntity?.subtitle ?? 'Julia will only infer from known entities'}</div>
                </div>
                <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{activeEntity ? 'Wrong?' : 'Choose'}</span>
              </button>
            </div>
          )}

          <div style={{ padding: '12px 16px 0' }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
              Category
              <select disabled={previewing} value={active.intakeCategory ?? ''} onChange={event => {
                const option = INTAKE_OPTIONS.find(item => item.value === event.target.value);
                setPages(prev => prev.map((page, index) => index === activeIdx
                  ? { ...page, intakeCategory: event.target.value, category: option?.category }
                  : page));
              }} style={{
                marginTop: 6,
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--hair)',
                background: '#fff',
                color: 'var(--ink)',
                fontSize: 15,
                fontFamily: 'var(--font)',
                outline: 'none',
                opacity: previewing ? 0.55 : 1,
              }}>
                <option value="" disabled>Choose category</option>
                {INTAKE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Extracted fields */}
          {active.fields.length > 0 && (
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Extracted</span>
                <span style={{ color: 'var(--accent)', fontWeight: 500, letterSpacing: 0, textTransform: 'none', fontSize: 13 }}>Edit</span>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
                {active.fields.map((f, i) => (
                  <div key={f.k} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    padding: '12px 14px',
                    borderBottom: i === active.fields.length - 1 ? 'none' : '0.5px solid var(--hair)',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{f.k}</span>
                    <span style={{ fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--font)', fontVariantNumeric: 'tabular-nums' }}>{f.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI suggestion */}
          {active.action && (
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{
                background: 'var(--accent-soft)', borderRadius: 12, padding: 14,
                display: 'flex', gap: 10,
              }}>
                <div style={{ marginTop: 1 }}>{Ic.sparkle(16, 'var(--accent)')}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>{active.action}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <Btn size="sm" variant="primary">Yes, do it</Btn>
                    <Btn size="sm" variant="secondary">Not now</Btn>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '12px 16px 30px',
          background: 'linear-gradient(0deg, rgba(242,242,247,1) 60%, rgba(242,242,247,0))',
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn size="lg" variant="secondary" style={{ flex: 0.9 }} onClick={triggerCamera}>
              Photo
            </Btn>
            <Btn size="lg" variant="secondary" style={{ flex: 0.9 }} onClick={triggerUpload}>
              File
            </Btn>
            <Btn size="lg" variant="dark" style={{ flex: 1.2 }}
              icon={Ic.check(18, '#fff', 2.5)}
              onClick={handleFile}>
              Send {pages.length}
            </Btn>
          </div>
          <button onClick={() => removePage(activeIdx)} style={{
            marginTop: 8, width: '100%', border: 0, background: 'transparent',
            color: 'var(--muted)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
            cursor: 'pointer',
          }}>Remove this page</button>
        </div>

        {/* Entity picker sheet */}
        {showEntityPicker && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setShowEntityPicker(false)}>
            <div onClick={ev => ev.stopPropagation()} style={{
              width: '100%', background: 'var(--background)',
              borderTopLeftRadius: 22, borderTopRightRadius: 22,
              padding: '12px 0 30px', maxHeight: '80%', overflowY: 'auto',
            }}>
              <div style={{ width: 38, height: 4, background: 'var(--sep)', borderRadius: 99,
                margin: '4px auto 8px' }}/>
              <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>File under</div>
                <button onClick={() => setShowEntityPicker(false)} style={{ background: 'transparent',
                  border: 0, fontSize: 16, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>Done</button>
              </div>
              <div style={{ background: '#fff', marginInline: 16, borderRadius: 12, overflow: 'hidden' }}>
                {(entities ?? []).map((ent, i) => {
                  const sel = ent._id === active.entity;
                  return (
                    <div key={ent._id} onClick={() => {
                      setPages(p => p.map((pg, idx) => idx === activeIdx ? { ...pg, entity: ent._id } : pg));
                      setShowEntityPicker(false);
                    }} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      borderBottom: i === (entities?.length ?? 0) - 1 ? 'none' : '0.5px solid var(--hair)',
                      cursor: 'pointer',
                    }}>
                      <span style={{ width: 10, height: 10, borderRadius: 99, background: ent.color }}/>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>{ent.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{ent.subtitle}</div>
                      </div>
                      {sel && Ic.check(18, 'var(--accent)', 2.5)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function CaptureOption({
  icon,
  title,
  sub,
  onClick,
  last,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', border: 0, background: 'transparent',
      padding: '14px 14px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: last ? 'none' : '0.5px solid var(--hair)',
      fontFamily: 'var(--font)', textAlign: 'left',
    }}>
      <span style={{
        width: 38, height: 38, borderRadius: 11,
        background: 'var(--accent-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, color: 'var(--ink)', fontWeight: 700 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.35 }}>{sub}</span>
      </span>
    </button>
  );
}

function Spinner() {
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" style={{ animation: 'spin 1s linear infinite' }}>
      <circle cx={16} cy={16} r={12} fill="none" stroke="var(--muted)" strokeWidth={2.5} opacity={0.3} />
      <path d="M16 4a12 12 0 0 1 12 12" fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

function ScanningDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, width: 24, justifyContent: 'center' }}>
      {[0, 1, 2].map(index => (
        <span
          key={index}
          style={{
            width: 4,
            height: 4,
            borderRadius: 99,
            background: 'var(--accent)',
            animation: `mobile-scan-dot 900ms ease-in-out ${index * 120}ms infinite`,
          }}
        />
      ))}
      <style>{`@keyframes mobile-scan-dot { 0%, 100% { transform: translateY(0); opacity: .35; } 45% { transform: translateY(-3px); opacity: 1; } }`}</style>
    </span>
  );
}

function PagePreview({ page, height }: { page: LocalCapturedPage; height: number }) {
  if (page.previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={page.previewUrl}
        alt={page.title}
        style={{ width: '100%', height, objectFit: 'cover', borderRadius: 8, display: 'block' }}
      />
    );
  }
  return <DocPreview kind={page.preview} height={height} />;
}

async function fileToPreviewPayload(file: File) {
  return {
    name: file.name,
    contentType: contentTypeFor(file, 'upload'),
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

function categoryForIntake(value?: string | null): DocumentCategory | undefined {
  return INTAKE_OPTIONS.find(option => option.value === value)?.category;
}

function labelForIntake(value?: string | null) {
  return INTAKE_OPTIONS.find(option => option.value === value)?.label;
}

function labelForCategory(value?: DocumentCategory) {
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
