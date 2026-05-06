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
  issuer?: string | null;
  entityId?: string | null;
  confidence?: number;
  reason?: string | null;
  fields?: { k: string; v: string }[];
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
    isImageFile(file) ||
    ['pdf', 'txt', 'csv', 'json', 'doc', 'docx'].includes(extension ?? '')
  );
}

function isImageFile(file: File) {
  const extension = file.name.toLowerCase().split('.').pop();
  return file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(extension ?? '');
}

function contentTypeFor(file: File, source: 'camera' | 'upload') {
  if (file.type) return file.type;
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'txt') return 'text/plain';
  if (extension === 'csv') return 'text/csv';
  if (extension === 'json') return 'application/json';
  if (extension === 'doc') return 'application/msword';
  if (extension === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (['png'].includes(extension ?? '')) return 'image/png';
  if (['webp'].includes(extension ?? '')) return 'image/webp';
  if (['gif'].includes(extension ?? '')) return 'image/gif';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'heif') return 'image/heif';
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const initialPickerOpenedRef = useRef(false);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  useEffect(() => {
    if (initialPickerOpenedRef.current || stage !== 'aim' || pages.length > 0) return;
    initialPickerOpenedRef.current = true;
    const id = window.setTimeout(() => {
      cameraInputRef.current?.click();
    }, 0);
    return () => window.clearTimeout(id);
  }, [pages.length, stage]);

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
    const files = selectedFiles.filter(file => supportedFile(file) && file.size <= MAX_FILE_BYTES);
    if (files.length === 0) {
      setError('Use images, PDFs, text files, or Word documents under 25 MB.');
      if (e.currentTarget) e.currentTarget.value = '';
      return;
    }

    setError(null);
    if (source === 'upload') setSessionSource('upload');
    setMappingStatus(files.some(isImageFile) ? 'Checking likely entity...' : null);
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

    try {
      const imagePages = await Promise.all(
        allFiles
          .filter(isImageFile)
          .slice(0, 3)
          .map(async file => ({
            name: file.name,
            dataUrl: await fileToPreviewDataUrl(file),
          })),
      );
      const pagesForAi = imagePages.filter(page => page.dataUrl);
      if (pagesForAi.length === 0) {
        setMappingStatus(null);
        return;
      }

      const res = await fetch('/api/ai/capture-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: pagesForAi,
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
      setPages(prev => prev.map((page, index) => {
        const inCurrentDocument = index < startIndex + count || count === allFiles.length;
        if (!inCurrentDocument) return page;
        return {
          ...page,
          title: data.title || page.title,
          type: data.documentType || page.type,
          issuer: data.issuer || (entity ? `Likely ${entity.name}` : page.issuer),
          entity: entity?._id ?? page.entity,
          confidence: data.confidence ?? page.confidence,
          fields: data.fields?.length ? data.fields : page.fields,
          action: data.reason || page.action,
        };
      }));
      setMappingStatus(entity
        ? `Matched to ${entity.name}${data.confidence !== undefined ? ` · ${Math.round(data.confidence * 100)}%` : ''}`
        : 'No confident entity match yet');
      window.setTimeout(() => setMappingStatus(null), 2500);
    } catch {
      setMappingStatus(null);
    }
  }

  async function handleFile() {
    if (!workspace || capturedFiles.length === 0) return;
    setStage('uploading');
    setError(null);

    try {
      const hintedEntity = pages.find(page => page.entity);
      const hintedEntityId = hintedEntity?.entity
        ? hintedEntity.entity as Id<'entities'>
        : undefined;
      const sessionId = await createCaptureSession({
        workspaceId: workspace._id,
        source: sessionSource,
        pageCount: capturedFiles.length,
        entityId: hintedEntityId,
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
        accept="image/*"
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

  // AIM stage
  if (stage === 'aim' || stage === 'capturing' || stage === 'extracting') {
    const busy = stage === 'capturing' || stage === 'extracting';
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
            {busy ? <Spinner /> : Ic.camera(32, '#fff')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)', letterSpacing: -0.3 }}>
            {busy ? 'Adding page...' : 'Add document'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.45, marginTop: 8, maxWidth: 280 }}>
            {pages.length > 0
              ? `${pages.length} page${pages.length > 1 ? 's' : ''} captured. Add another page or review before sending.`
              : 'Use the camera or choose an existing file. Add all pages first, then send once.'}
          </div>
          {!busy && (
            <div style={{ marginTop: 22, display: 'flex', gap: 8 }}>
              <button onClick={triggerCamera} style={{
                border: 0, borderRadius: 12,
                background: 'var(--ink)', color: '#fff', cursor: 'pointer',
                padding: '12px 15px', fontSize: 15, fontWeight: 700,
                fontFamily: 'var(--font)',
              }}>Open camera</button>
              <button onClick={triggerUpload} style={{
                border: '0.5px solid var(--sep)', borderRadius: 12,
                background: '#fff', color: 'var(--ink)', cursor: 'pointer',
                padding: '12px 15px', fontSize: 15, fontWeight: 700,
                fontFamily: 'var(--font)',
              }}>Upload file</button>
            </div>
          )}
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
              {Ic.sparkle(13, 'var(--accent)')} {mappingStatus}
            </div>
          )}

          {/* Entity assignment */}
          {(entities?.length ?? 0) > 0 && (
            <div style={{ padding: '12px 16px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Filed under</div>
              <button onClick={() => setShowEntityPicker(true)} style={{
                width: '100%', textAlign: 'left',
                padding: '12px 14px', borderRadius: 12,
                border: '1px solid var(--hair)', background: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font)',
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
                <div onClick={() => {
                  setPages(p => p.map((pg, idx) => idx === activeIdx ? { ...pg, entity: '' } : pg));
                  setShowEntityPicker(false);
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderBottom: (entities?.length ?? 0) > 0 ? '0.5px solid var(--hair)' : 'none',
                  cursor: 'pointer',
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: 'var(--sep)' }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>Let Julia infer</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Only from entities already in this workspace</div>
                  </div>
                  {!active.entity && Ic.check(18, 'var(--accent)', 2.5)}
                </div>
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

function Spinner() {
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" style={{ animation: 'spin 1s linear infinite' }}>
      <circle cx={16} cy={16} r={12} fill="none" stroke="var(--muted)" strokeWidth={2.5} opacity={0.3} />
      <path d="M16 4a12 12 0 0 1 12 12" fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
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

async function fileToPreviewDataUrl(file: File) {
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
