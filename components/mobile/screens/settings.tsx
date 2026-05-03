'use client';

import React, { useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getIcon, Ic } from '@/components/icons';
import { NavBar } from '@/components/ui/nav-bar';
import { NavBtn } from '@/components/ui/nav-btn';
import { ListGroup } from '@/components/ui/list-group';

const ENTITY_TYPES = ['business', 'property', 'vehicle', 'personal'] as const;
const ENTITY_COLORS = [
  'oklch(0.62 0.13 28)', 'oklch(0.62 0.13 80)', 'oklch(0.62 0.10 200)',
  'oklch(0.55 0.10 250)', 'oklch(0.62 0.06 300)', 'oklch(0.55 0.14 150)',
];

const ICON_MAP: Record<string, string> = {
  business: 'building',
  property: 'home',
  vehicle: 'car',
  personal: 'user',
};

interface MobileSettingsProps {
  onBack: () => void;
}

export function MobileSettings({ onBack }: MobileSettingsProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const workspace = useQuery(api.workspaces.getMyWorkspace);
  const entities = useQuery(
    api.entities.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip",
  );
  const createEntity = useMutation(api.entities.create);
  const archiveEntity = useMutation(api.entities.archive);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [sub, setSub] = useState('');
  const [type, setType] = useState<typeof ENTITY_TYPES[number]>('business');

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  async function handleAdd() {
    if (!name.trim() || !workspace) return;
    await createEntity({
      workspaceId: workspace._id,
      kind: type,
      name: name.trim(),
      subtitle: sub.trim() || undefined,
      icon: ICON_MAP[type] || 'building',
      color: ENTITY_COLORS[(entities?.length ?? 0) % ENTITY_COLORS.length],
    });
    setName('');
    setSub('');
    setAdding(false);
  }

  return (
    <div style={{ paddingBottom: 120 }}>
      <NavBar title="Settings"
        leading={<NavBtn onClick={onBack}>{Ic.back(20, 'var(--accent)')} Back</NavBtn>}
      />

      {/* Profile card */}
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{
          background: '#fff', borderRadius: 12, padding: 16,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt="" style={{
              width: 50, height: 50, borderRadius: 99, objectFit: 'cover',
            }} />
          ) : (
            <div style={{
              width: 50, height: 50, borderRadius: 99, background: 'oklch(0.85 0.04 50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: 'var(--ink2)',
            }}>{initials}</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>{user?.fullName ?? 'Loading...'}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{user?.primaryEmailAddress?.emailAddress ?? ''}</div>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div style={{ padding: '0 16px 8px' }}>
        <button onClick={() => signOut({ redirectUrl: '/' })} style={{
          width: '100%', padding: '12px 0', borderRadius: 12, border: 0,
          background: '#fff', color: 'oklch(0.55 0.20 25)', fontSize: 15,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
        }}>Sign out</button>
      </div>

      {/* Entities */}
      <ListGroup header={`Entities · ${entities?.length ?? 0}`}>
        {(entities ?? []).map((e, i) => (
          <div key={e._id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderBottom: i === (entities?.length ?? 0) - 1 && !adding ? 'none' : '0.5px solid var(--hair)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: e.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{getIcon(e.icon, 16, '#fff')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{e.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{e.subtitle}</div>
            </div>
            <button onClick={() => archiveEntity({ entityId: e._id })} style={{
              background: 'transparent', border: 0, cursor: 'pointer',
              fontSize: 13, color: 'oklch(0.55 0.20 25)', fontWeight: 500, fontFamily: 'var(--font)',
            }}>Remove</button>
          </div>
        ))}
        {adding ? (
          <div style={{ padding: 14 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Entity name"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--sep)', fontSize: 15, fontFamily: 'var(--font)', outline: 'none', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select value={type} onChange={e => setType(e.target.value as typeof ENTITY_TYPES[number])}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--sep)', fontSize: 14, fontFamily: 'var(--font)', background: '#fff' }}>
                {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={sub} onChange={e => setSub(e.target.value)} placeholder="Description"
                style={{ flex: 2, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--sep)', fontSize: 15, fontFamily: 'var(--font)', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAdding(false)} style={{
                flex: 1, padding: '9px 0', borderRadius: 8, border: '0.5px solid var(--sep)',
                background: '#fff', color: 'var(--ink)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              }}>Cancel</button>
              <button onClick={handleAdd} style={{
                flex: 1, padding: '9px 0', borderRadius: 8, border: 0,
                background: 'var(--ink)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              }}>Add</button>
            </div>
          </div>
        ) : (
          <div onClick={() => setAdding(true)} style={{
            padding: '12px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            color: 'var(--accent)', fontSize: 15, fontWeight: 500,
          }}>
            {Ic.plus(16, 'var(--accent)', 2.4)} Add entity
          </div>
        )}
      </ListGroup>
    </div>
  );
}
