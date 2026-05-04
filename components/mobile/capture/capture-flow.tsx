'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { CapturedPage } from '@/lib/types';
import { Ic } from '@/components/icons';
import { Btn } from '@/components/ui/button';
import { DocPreview } from '@/components/ui/doc-preview';

interface CaptureFlowProps {
  onClose: () => void;
  onFiled: (pages: CapturedPage[]) => void;
}

interface LocalCapturedPage extends CapturedPage {
  previewUrl: string;
  fileName: string;
}

export function CaptureFlow({ onClose, onFiled }: CaptureFlowProps) {
  const workspace = useQuery(api.workspaces.getMyWorkspace);
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
  const [activeIdx, setActiveIdx] = useState(0);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  // Use the file input as a camera stand-in (on mobile it opens camera with capture attr)
  function trigger() {
    fileInputRef.current?.click();
  }

  function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setError(null);
    setStage('extracting');

    setCapturedFiles(prev => [...prev, ...files]);

    setPages(prev => {
      const created = files.map((file, index): LocalCapturedPage => {
        const previewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.add(previewUrl);
        return {
          preview: 'lambeth',
          previewUrl,
          fileName: file.name || `capture-${prev.length + index + 1}.jpg`,
          type: 'Document page',
          issuer: 'Ready to send',
          title: file.name ? file.name.replace(/\.[^.]+$/, '') : `Captured page ${prev.length + index + 1}`,
          entity: entities?.[0]?._id ?? '',
          confidence: 0,
          fields: [],
        };
      });
      const next = [...prev, ...created];
      setActiveIdx(next.length - created.length);
      return next;
    });

    setTimeout(() => setStage('review'), 300);

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFile() {
    if (!workspace || capturedFiles.length === 0) return;
    setStage('uploading');
    setError(null);

    try {
      const hintedEntityId = pages[0]?.entity
        ? pages[0].entity as Id<'entities'>
        : undefined;
      const sessionId = await createCaptureSession({
        workspaceId: workspace._id,
        source: 'camera',
        pageCount: capturedFiles.length,
        entityId: hintedEntityId,
      });

      for (let i = 0; i < capturedFiles.length; i++) {
        const file = capturedFiles[i];
        const uploadUrl = await generateUploadUrl();

        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'image/jpeg' },
          body: file,
        });

        if (!uploadRes.ok) throw new Error('Upload failed');
        const { storageId } = await uploadRes.json();

        await storeDocumentFile({
          workspaceId: workspace._id,
          captureSessionId: sessionId,
          storageId,
          fileName: file.name || `capture-${i + 1}.jpg`,
          contentType: file.type || 'image/jpeg',
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
    if (target) {
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

  // Hidden file input for camera/gallery
  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      capture="environment"
      multiple
      onChange={handleCapture}
      style={{ display: 'none' }}
    />
  );

  // AIM stage
  if (stage === 'aim' || stage === 'capturing' || stage === 'extracting') {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', color: '#fff',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'inherit' }}>
        {hiddenInput}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0,
            background: 'radial-gradient(120% 80% at 50% 60%, #2a2520 0%, #0a0908 70%)',
          }} />
          <div style={{
            position: 'absolute', left: '50%', top: '52%',
            transform: 'translate(-50%, -50%) rotate(-2.4deg)',
            width: '74%', boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
          }}>
            <DocPreview kind="lambeth" height={360} />
          </div>

          {/* AI scan reticle */}
          <svg viewBox="0 0 200 360" preserveAspectRatio="none" style={{
            position: 'absolute', inset: '8% 8%', width: '84%', height: '84%',
            opacity: stage === 'aim' ? 0.85 : 0.4, pointerEvents: 'none',
          }}>
            {([[0,0],[200,0],[0,360],[200,360]] as [number,number][]).map(([x,y],i) => {
              const sx = x === 0 ? 1 : -1, sy = y === 0 ? 1 : -1;
              return (
                <path key={i} d={`M${x+sx*2} ${y+sy*22} L${x+sx*2} ${y+sy*2} L${x+sx*22} ${y+sy*2}`}
                  stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              );
            })}
          </svg>

          {/* status banner */}
          <div style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            padding: '8px 14px', borderRadius: 999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap',
          }}>
            {stage === 'aim' && <>{Ic.sparkle(13, '#fff')} Tap to capture document</>}
            {stage === 'capturing' && <>Captured</>}
            {stage === 'extracting' && <>
              <span className="animate-spin" style={{ width: 13, height: 13, borderRadius: 99,
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }}/>
              Capturing...
            </>}
          </div>

          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            width: 36, height: 36, borderRadius: 18,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)',
            border: 0, color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Ic.x(18, '#fff')}</button>

          {pages.length > 0 && (
            <div style={{
              position: 'absolute', bottom: 16, left: 16,
              padding: '6px 10px 6px 6px', borderRadius: 8,
              background: 'rgba(255,255,255,0.92)', color: '#000',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
            }}>
              <div style={{ width: 32, height: 40 }}>
                <PagePreview page={pages[pages.length - 1]} height={40} />
              </div>
              {pages.length} page{pages.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div style={{
          padding: '20px 32px 28px',
          background: 'linear-gradient(0deg, #000 60%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ width: 44, height: 44 }} />

          <button onClick={trigger} disabled={stage !== 'aim'} style={{
            width: 76, height: 76, borderRadius: 38,
            background: 'transparent', border: '4px solid #fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 120ms', transform: stage === 'capturing' ? 'scale(0.92)' : 'scale(1)',
          }}>
            <div style={{ width: 60, height: 60, borderRadius: 30, background: '#fff' }} />
          </button>

          <button onClick={() => pages.length > 0 && setStage('review')} style={{
            width: 44, height: 44, borderRadius: 22, border: 0,
            background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
            opacity: pages.length > 0 ? 1 : 0.4,
          }}>
            Done
          </button>
        </div>
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
          <button onClick={() => setStage('aim')} style={{
            background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: 'var(--accent)',
            fontSize: 15, fontWeight: 500, fontFamily: 'var(--font)',
          }}>+ Add</button>
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
              <button key={page.previewUrl} onClick={() => setActiveIdx(index)} style={{
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

          {/* Entity assignment */}
          {activeEntity && (
            <div style={{ padding: '12px 16px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Filed under</div>
              <button onClick={() => setShowEntityPicker(true)} style={{
                width: '100%', textAlign: 'left',
                padding: '12px 14px', borderRadius: 12,
                border: '1px solid var(--hair)', background: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font)',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: activeEntity.color }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>{activeEntity.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{activeEntity.subtitle}</div>
                </div>
                <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>Wrong?</span>
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
            <Btn size="lg" variant="secondary" style={{ flex: 1 }} onClick={() => setStage('aim')}>
              Add page
            </Btn>
            <Btn size="lg" variant="dark" style={{ flex: 1.4 }}
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
