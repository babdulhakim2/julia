'use client';

import React, { useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { getIcon } from '@/components/icons';
import { DeleteEntityModal } from '@/components/shared/delete-entity-modal';

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

export function DesktopSettings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const workspace = useQuery(api.workspaces.getMyWorkspace);
  const entities = useQuery(
    api.entities.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip",
  );
  const createEntity = useMutation(api.entities.create);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [sub, setSub] = useState('');
  const [type, setType] = useState<typeof ENTITY_TYPES[number]>('business');
  const [deleteEntityId, setDeleteEntityId] = useState<Id<"entities"> | null>(null);

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
    <div style={{ padding: '24px 32px 40px', maxWidth: 800 }}>
      {/* Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        {user?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt="" style={{
            width: 56, height: 56, borderRadius: 99, objectFit: 'cover',
          }} />
        ) : (
          <div style={{
            width: 56, height: 56, borderRadius: 99, background: 'oklch(0.85 0.04 50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: 'var(--ink2)',
          }}>{initials}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{user?.fullName ?? 'Loading...'}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{user?.primaryEmailAddress?.emailAddress ?? ''}</div>
        </div>
        <button onClick={() => signOut({ redirectUrl: '/' })} style={{
          background: 'transparent', border: '0.5px solid var(--sep)', borderRadius: 8,
          padding: '6px 14px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
          color: 'var(--muted)', fontFamily: 'var(--font)',
        }}>Sign out</button>
      </div>

      {/* Entities */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Entities</div>
          <button onClick={() => setAdding(!adding)} style={{
            background: 'transparent', border: 0, cursor: 'pointer',
            fontSize: 12, color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font)',
          }}>{adding ? 'Cancel' : '+ Add entity'}</button>
        </div>

        {adding && (
          <div style={{
            background: '#FAF9F5', borderRadius: 10, padding: 14, marginBottom: 12,
            border: '0.5px solid var(--sep)',
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Entity name"
                style={{ flex: '1 1 180px', padding: '7px 10px', borderRadius: 7, border: '0.5px solid var(--sep)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
              <input value={sub} onChange={e => setSub(e.target.value)} placeholder="Description (optional)"
                style={{ flex: '1 1 180px', padding: '7px 10px', borderRadius: 7, border: '0.5px solid var(--sep)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
              <select value={type} onChange={e => setType(e.target.value as typeof ENTITY_TYPES[number])}
                style={{ flex: '0 1 150px', padding: '7px 10px', borderRadius: 7, border: '0.5px solid var(--sep)', fontSize: 13, fontFamily: 'var(--font)', background: '#fff' }}>
                {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={handleAdd} style={{
                padding: '7px 14px', borderRadius: 7, background: 'var(--ink)', color: '#fff',
                border: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
              }}>Add</button>
            </div>
          </div>
        )}

        <div style={{ background: '#FAF9F5', borderRadius: 10, border: '0.5px solid var(--sep)', overflow: 'hidden' }}>
          {(entities ?? []).map((e, i) => (
            <div key={e._id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              borderBottom: i === (entities?.length ?? 0) - 1 ? 'none' : '0.5px solid var(--hair)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, background: e.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{getIcon(e.icon, 14, '#fff')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{e.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{e.subtitle}</div>
              </div>
              <button onClick={() => setDeleteEntityId(e._id)} style={{
                background: 'transparent', border: 0, cursor: 'pointer', padding: 4,
                fontSize: 12, color: 'oklch(0.55 0.20 25)', fontWeight: 500, fontFamily: 'var(--font)',
              }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
      {deleteEntityId && (
        <DeleteEntityModal
          entityId={deleteEntityId}
          onClose={() => setDeleteEntityId(null)}
          onDeleted={() => { setDeleteEntityId(null); router.push('/files'); }}
        />
      )}
    </div>
  );
}
