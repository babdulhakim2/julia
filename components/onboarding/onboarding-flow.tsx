'use client';

import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Ic, getIcon } from '@/components/icons';
import { Btn } from '@/components/ui/button';
import { AddEntityForm, TYPE_PRESETS } from './add-entity-form';

interface OnboardingProps {
  onDone: () => void;
}

interface OnboardingEntity {
  name: string;
  kind: 'business' | 'property' | 'vehicle' | 'personal';
  subtitle: string;
  icon: string;
  color: string;
  identifiers: Record<string, string>;
}

const ENTITY_COLORS = [
  'oklch(0.62 0.13 28)', 'oklch(0.62 0.13 80)', 'oklch(0.62 0.10 200)',
  'oklch(0.55 0.10 250)', 'oklch(0.62 0.06 300)', 'oklch(0.55 0.14 150)',
];

function Channel({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--accent-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>
      </div>
    </div>
  );
}

export function OnboardingFlow({ onDone }: OnboardingProps) {
  const { user } = useUser();
  const createWorkspace = useMutation(api.workspaces.create);
  const createEntity = useMutation(api.entities.create);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [step, setStep] = useState(0);
  const [entities, setEntities] = useState<OnboardingEntity[]>([]);
  const [adding, setAdding] = useState<{ type: string; name: string; sub: string; info: Record<string, string> } | null>(null);
  const [saving, setSaving] = useState(false);

  function commitAdd() {
    if (!adding?.name?.trim()) return;
    const preset = TYPE_PRESETS[adding.type];
    const e: OnboardingEntity = {
      name: adding.name.trim(),
      kind: adding.type as OnboardingEntity['kind'],
      subtitle: adding.sub?.trim() || preset.subPlaceholder,
      icon: preset.icon,
      color: ENTITY_COLORS[entities.length % ENTITY_COLORS.length],
      identifiers: adding.info || {},
    };
    setEntities(es => [...es, e]);
    setAdding(null);
  }

  async function finish() {
    if (saving || entities.length === 0) return;
    setSaving(true);
    try {
      // 1. Create workspace
      const workspaceId = await createWorkspace({
        name: user?.fullName ? `${user.firstName}'s workspace` : 'My workspace',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      // 2. Create each entity
      for (const e of entities) {
        await createEntity({
          workspaceId,
          kind: e.kind,
          name: e.name,
          subtitle: e.subtitle,
          icon: e.icon,
          color: e.color,
          identifiers: e.identifiers,
        });
      }

      // 3. Complete onboarding
      await completeOnboarding();

      onDone();
    } catch (err) {
      console.error('Onboarding error:', err);
      setSaving(false);
    }
  }

  const firstName = user?.firstName ?? 'there';

  if (step === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
        background: 'var(--background)', padding: '64px 24px 40px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            {Ic.sparkle(28, '#fff')}
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--ink)', letterSpacing: -1,
            lineHeight: 1.05, fontFamily: 'var(--font-display)' }}>
            Hi {firstName}.<br/>I&apos;m your secretary.
          </div>
          <div style={{ fontSize: 17, color: 'var(--muted)', marginTop: 16, lineHeight: 1.4 }}>
            You take photos. I file, remind, and draft replies. A real human checks anything I&apos;m unsure about &mdash; within 10 minutes.
          </div>
        </div>
        <Btn full size="lg" variant="dark" onClick={() => setStep(1)}>Get set up</Btn>
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
          We&apos;ll text you on WhatsApp too.
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
        background: 'var(--background)', padding: '48px 0 28px' }}>
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Step 1 of 3</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 6, letterSpacing: -0.5, fontFamily: 'var(--font-display)' }}>
            What does your post pile up about?
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, lineHeight: 1.4 }}>
            Add anything that gets letters: businesses, properties, vehicles. Tap to remove.
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          {/* Suggestion for Personal */}
          {entities.length === 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Suggestions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button onClick={() => setEntities([{
                  name: 'Personal',
                  kind: 'personal',
                  subtitle: 'You & family',
                  icon: 'user',
                  color: 'oklch(0.62 0.06 300)',
                  identifiers: {},
                }])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 8px 10px',
                    background: '#fff', border: '0.5px solid var(--sep)', borderRadius: 10,
                    cursor: 'pointer', fontFamily: 'var(--font)', transition: 'background 0.15s',
                  }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'oklch(0.62 0.06 300)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {getIcon('user', 14, '#fff')}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.2 }}>Personal</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.2 }}>You & family</div>
                  </div>
                  <div style={{ marginLeft: 2, color: 'var(--accent)', flexShrink: 0 }}>{Ic.plus(14, 'var(--accent)', 2)}</div>
                </button>
              </div>
            </div>
          )}

          {entities.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
              {entities.map((e, i) => (
                <div key={`${e.name}-${i}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderBottom: i === entities.length - 1 ? 'none' : '0.5px solid var(--hair)',
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: e.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {getIcon(e.icon, 18, '#fff')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{e.subtitle}</div>
                  </div>
                  <button onClick={() => setEntities(es => es.filter((_, idx) => idx !== i))}
                    style={{ background: 'transparent', border: 0, color: 'var(--muted2)', cursor: 'pointer', padding: 4 }}>
                    {Ic.x(18, 'var(--muted2)')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!adding && (
            <button onClick={() => setAdding({ type: 'business', name: '', sub: '', info: {} })}
              style={{ width: '100%', padding: 14, marginTop: entities.length ? 10 : 0, borderRadius: 12,
                border: '1px dashed var(--sep)', background: 'transparent',
                color: 'var(--accent)', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>{Ic.plus(16, 'var(--accent)', 2.4)} Add {entities.length ? 'another' : 'first entity'}</button>
          )}

          {adding && <AddEntityForm value={adding} onChange={setAdding} onCancel={() => setAdding(null)} onCommit={commitAdd} />}

          <div style={{
            marginTop: 16, padding: 14, background: 'var(--accent-soft)', borderRadius: 12,
            display: 'flex', gap: 10,
          }}>
            <div style={{ marginTop: 1 }}>{Ic.sparkle(15, 'var(--accent)')}</div>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>
              Add registration / VAT / licence details now if you have them, or skip &mdash; I&apos;ll prompt you when the first letter comes in.
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 16px 0' }}>
          <Btn full size="lg" variant="dark" onClick={() => setStep(2)} disabled={entities.length === 0}>
            Continue with {entities.length} {entities.length === 1 ? 'entity' : 'entities'}
          </Btn>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
        background: 'var(--background)', padding: '48px 0 28px' }}>
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Step 2 of 3</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 6, letterSpacing: -0.5, fontFamily: 'var(--font-display)' }}>
            Empty the drawer.
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, lineHeight: 1.4 }}>
            Take photos of every paper currently piling up. We&apos;ll sort them all in 24 hours &mdash; that&apos;s the magic moment.
          </div>
        </div>

        <div style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 18,
            border: '1px dashed var(--sep)', textAlign: 'center',
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              {Ic.camera(30, '#fff')}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>Snap a stack</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
              Just keep snapping &mdash; we&apos;ll figure out which page goes with which.
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Or, send by</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Channel icon={Ic.paperclip(16, 'var(--accent)')} title="WhatsApp" sub="+44 7700 900100" />
              <Channel icon={Ic.doc(16, 'var(--accent)')} title="Email forward" sub="inbox@secretary.app" />
              <Channel icon={Ic.mic(16, 'var(--accent)')} title="Voice notes" sub="Same WhatsApp number" />
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8 }}>
          <Btn variant="secondary" size="lg" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</Btn>
          <Btn variant="dark" size="lg" style={{ flex: 2 }} onClick={finish} disabled={saving}>
            {saving ? 'Setting up...' : "I'll start now"}
          </Btn>
        </div>
      </div>
    );
  }

  return null;
}
