// Camera-first capture flow — opens straight to camera, AI extracts, swipe through fields.

const { T: T2, StatusPill: SP2, Btn: Btn2, DocPreview: DP2, EntityChip: EC2 } = window.UI;

function CaptureFlow({ onClose, onFiled }) {
  // Stages: aim | capturing | extracting | review | grouping | filed
  const [stage, setStage] = React.useState('aim');
  const [pages, setPages] = React.useState([]); // captured docs
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [editField, setEditField] = React.useState(null);
  const [showEntityPicker, setShowEntityPicker] = React.useState(false);

  const { ENTITIES } = window.SEC_DATA;

  // Pre-defined "what the AI extracted" for each captured page
  const fakeCaptures = [
    {
      preview: 'lambeth', type: 'Council tax', issuer: 'Lambeth Council',
      title: 'Council tax — Mar instalment',
      entity: 'flat-plaistow', confidence: 0.96,
      fields: [
        { k: 'Account', v: '8821-94-23' },
        { k: 'Property', v: '12 Plaistow Rd, Flat 2' },
        { k: 'Amount', v: '£214.00' },
        { k: 'Due', v: '28 May 2026' },
        { k: 'Reference', v: 'CT-2026-Q1' },
      ],
      action: 'Direct debit available — set up in 10 instalments?',
    },
    {
      preview: 'pcn', type: 'Parking ticket (PCN)', issuer: 'Lambeth Council',
      title: 'PCN — Streatham High Rd',
      entity: 'mercedes', confidence: 0.91,
      fields: [
        { k: 'Vehicle', v: 'LT21 ABC' },
        { k: 'Contravention', v: 'Parked in restricted street' },
        { k: 'Issued', v: '30 Apr 2026, 11:02' },
        { k: 'Amount', v: '£65 (£130 after 14 May)' },
        { k: 'Reference', v: 'LB23994821' },
      ],
      action: 'Two grounds for appeal look plausible. Draft one or pay £65 now?',
    },
  ];

  function trigger() {
    setStage('capturing');
    setTimeout(() => {
      setStage('extracting');
      setTimeout(() => {
        setPages(prev => {
          const next = [...prev, fakeCaptures[prev.length % fakeCaptures.length]];
          return next;
        });
        setStage('review');
        setActiveIdx(p => p);
      }, 1400);
    }, 350);
  }

  // First trigger on mount? No — user taps shutter.
  React.useEffect(() => {
    if (stage === 'review' && pages.length > 0) setActiveIdx(pages.length - 1);
  }, [pages.length]);

  const active = pages[activeIdx];
  const activeEntity = active && ENTITIES.find(e => e.id === active.entity);

  // ── AIM stage ─────────────────────────────────────────────
  if (stage === 'aim' || stage === 'capturing' || stage === 'extracting') {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', color: '#fff',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'inherit' }}>
        {/* viewfinder */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* simulated camera scene — receipt on a desk */}
          <div style={{ position: 'absolute', inset: 0,
            background: 'radial-gradient(120% 80% at 50% 60%, #2a2520 0%, #0a0908 70%)',
          }} />
          <div style={{
            position: 'absolute', left: '50%', top: '52%',
            transform: 'translate(-50%, -50%) rotate(-2.4deg)',
            width: '74%', boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
          }}>
            <DP2 kind="lambeth" height={360} />
          </div>

          {/* AI scan reticle */}
          <svg viewBox="0 0 200 360" preserveAspectRatio="none" style={{
            position: 'absolute', inset: '8% 8%', width: '84%', height: '84%',
            opacity: stage === 'aim' ? 0.85 : 0.4, pointerEvents: 'none',
          }}>
            {[[0,0],[200,0],[0,360],[200,360]].map(([x,y],i) => {
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
            {stage === 'aim' && <>{Ic.sparkle(13, '#fff')} Document detected · hold steady</>}
            {stage === 'capturing' && <>Captured</>}
            {stage === 'extracting' && <>
              <span style={{ width: 13, height: 13, borderRadius: 99,
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                animation: 'spin 0.7s linear infinite' }}/>
              Reading document…
            </>}
          </div>

          {/* close */}
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            width: 36, height: 36, borderRadius: 18,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)',
            border: 0, color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Ic.x(18, '#fff')}</button>

          {/* page count if any captured */}
          {pages.length > 0 && (
            <div style={{
              position: 'absolute', bottom: 16, left: 16,
              padding: '6px 10px 6px 6px', borderRadius: 8,
              background: 'rgba(255,255,255,0.92)', color: '#000',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
            }}>
              <div style={{ width: 32, height: 40 }}>
                <DP2 kind={pages[pages.length-1].preview} height={40} />
              </div>
              {pages.length} page{pages.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* shutter row */}
        <div style={{
          padding: '20px 32px 28px',
          background: 'linear-gradient(0deg, #000 60%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button style={{ width: 44, height: 44, borderRadius: 22, border: 0,
            background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Ic.flash(20, '#fff')}
          </button>

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
            fontSize: 13, fontWeight: 600, fontFamily: T2.font,
            opacity: pages.length > 0 ? 1 : 0.4,
          }}>
            Done
          </button>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── REVIEW stage ──────────────────────────────────────────
  if (stage === 'review' && active) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: T2.bg,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'inherit' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 12px 8px' }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: T2.accent,
            fontSize: 17, fontFamily: T2.font, display: 'flex', alignItems: 'center', gap: 2,
          }}>{Ic.back(18, T2.accent)} Cancel</button>
          <div style={{ fontSize: 15, fontWeight: 600, color: T2.ink }}>
            {pages.length > 1 ? `Page ${activeIdx + 1} of ${pages.length}` : 'Review'}
          </div>
          <button onClick={() => setStage('aim')} style={{
            background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: T2.accent,
            fontSize: 15, fontWeight: 500, fontFamily: T2.font,
          }}>+ Add</button>
        </div>

        {/* Document preview hero */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ position: 'relative' }}>
            <DP2 kind={active.preview} height={180} />
            <div style={{
              position: 'absolute', top: 10, left: 10,
              padding: '4px 8px', borderRadius: 6,
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {Ic.sparkle(11, '#fff')} {Math.round(active.confidence * 100)}% confident
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
          <div style={{ padding: '16px 16px 4px' }}>
            <div style={{ fontSize: 12, color: T2.muted, fontWeight: 600, letterSpacing: 0.5,
              textTransform: 'uppercase' }}>{active.type}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: T2.ink, letterSpacing: -0.3,
              marginTop: 4, lineHeight: 1.2, fontFamily: T2.fontDisplay }}>{active.title}</div>
            <div style={{ fontSize: 13, color: T2.muted, marginTop: 4 }}>from {active.issuer}</div>
          </div>

          {/* Entity assignment */}
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{ fontSize: 11, color: T2.muted, fontWeight: 600, letterSpacing: 0.5,
              textTransform: 'uppercase', marginBottom: 6 }}>Filed under</div>
            <button onClick={() => setShowEntityPicker(true)} style={{
              width: '100%', textAlign: 'left',
              padding: '12px 14px', borderRadius: 12,
              border: `1px solid ${T2.hair}`, background: T2.bgCard, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, fontFamily: T2.font,
            }}>
              <span style={{ width: 10, height: 10, borderRadius: 99, background: activeEntity?.color }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: T2.ink, fontWeight: 500 }}>{activeEntity?.name}</div>
                <div style={{ fontSize: 12, color: T2.muted }}>{activeEntity?.sub}</div>
              </div>
              <span style={{ fontSize: 13, color: T2.accent, fontWeight: 500 }}>Wrong?</span>
            </button>
          </div>

          {/* Extracted fields */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ fontSize: 11, color: T2.muted, fontWeight: 600, letterSpacing: 0.5,
              textTransform: 'uppercase', marginBottom: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Extracted</span>
              <span style={{ color: T2.accent, fontWeight: 500, letterSpacing: 0, textTransform: 'none', fontSize: 13 }}>Edit</span>
            </div>
            <div style={{ background: T2.bgCard, borderRadius: 12, overflow: 'hidden' }}>
              {active.fields.map((f, i) => (
                <div key={f.k} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '12px 14px',
                  borderBottom: i === active.fields.length - 1 ? 'none' : `0.5px solid ${T2.hair}`,
                }}>
                  <span style={{ fontSize: 13, color: T2.muted }}>{f.k}</span>
                  <span style={{ fontSize: 15, color: T2.ink, fontFamily: T2.font, fontVariantNumeric: 'tabular-nums' }}>{f.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI suggestion */}
          {active.action && (
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{
                background: T2.accentSoft, borderRadius: 12, padding: 14,
                display: 'flex', gap: 10,
              }}>
                <div style={{ marginTop: 1 }}>{Ic.sparkle(16, T2.accent)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: T2.ink, lineHeight: 1.4 }}>{active.action}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <Btn2 size="sm" variant="primary">Yes, do it</Btn2>
                    <Btn2 size="sm" variant="secondary">Not now</Btn2>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multi-page grouping suggestion */}
          {pages.length > 1 && (
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{
                background: T2.bgCard, borderRadius: 12, padding: 14, border: `0.5px dashed ${T2.sep}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                  color: T2.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {Ic.sparkle(13, T2.muted)} Looks like {pages.length} separate cases
                </div>
                <div style={{ fontSize: 13, color: T2.ink, marginTop: 6, lineHeight: 1.4 }}>
                  These came from one envelope but they're for different entities. I'll file them separately — sound good?
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
          <Btn2 full size="lg" variant="dark"
            icon={Ic.check(18, '#fff', 2.5)}
            onClick={() => { onFiled(pages); setStage('filed'); }}>
            Looks right · file {pages.length > 1 ? `all ${pages.length}` : 'it'}
          </Btn2>
        </div>

        {/* Entity picker sheet */}
        {showEntityPicker && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setShowEntityPicker(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              width: '100%', background: T2.bg,
              borderTopLeftRadius: 22, borderTopRightRadius: 22,
              padding: '12px 0 30px', maxHeight: '80%', overflowY: 'auto',
            }}>
              <div style={{ width: 38, height: 4, background: T2.sep, borderRadius: 99,
                margin: '4px auto 8px' }}/>
              <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: T2.ink }}>File under</div>
                <button onClick={() => setShowEntityPicker(false)} style={{ background: 'transparent',
                  border: 0, fontSize: 16, color: T2.accent, fontWeight: 600, cursor: 'pointer', fontFamily: T2.font }}>Done</button>
              </div>
              <div style={{ background: T2.bgCard, marginInline: 16, borderRadius: 12, overflow: 'hidden' }}>
                {ENTITIES.map((e, i) => {
                  const sel = e.id === active.entity;
                  return (
                    <div key={e.id} onClick={() => {
                      setPages(p => p.map((pg, idx) => idx === activeIdx ? { ...pg, entity: e.id } : pg));
                      setShowEntityPicker(false);
                    }} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      borderBottom: i === ENTITIES.length - 1 ? 'none' : `0.5px solid ${T2.hair}`,
                      cursor: 'pointer',
                    }}>
                      <span style={{ width: 10, height: 10, borderRadius: 99, background: e.color }}/>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, color: T2.ink, fontWeight: 500 }}>{e.name}</div>
                        <div style={{ fontSize: 12, color: T2.muted }}>{e.sub}</div>
                      </div>
                      {sel && Ic.check(18, T2.accent, 2.5)}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: '12px 16px 0' }}>
                <button style={{ width: '100%', padding: 14, borderRadius: 12, border: `1px dashed ${T2.sep}`,
                  background: 'transparent', color: T2.accent, fontSize: 15, fontWeight: 500, cursor: 'pointer',
                  fontFamily: T2.font }}>+ Add new entity</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // filed — just close
  return null;
}

window.CaptureFlow = CaptureFlow;
