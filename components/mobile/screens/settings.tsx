'use client';

import React, { useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { getIcon, Ic } from '@/components/icons';
import { NavBar } from '@/components/ui/nav-bar';
import { NavBtn } from '@/components/ui/nav-btn';
import { ListGroup } from '@/components/ui/list-group';
import { DeleteEntityModal } from '@/components/shared/delete-entity-modal';
import { AddEntityForm, TYPE_PRESETS, type AddEntityFormValue } from '@/components/onboarding/add-entity-form';

const ENTITY_COLORS = [
  'oklch(0.62 0.13 28)', 'oklch(0.62 0.13 80)', 'oklch(0.62 0.10 200)',
  'oklch(0.55 0.10 250)', 'oklch(0.62 0.06 300)', 'oklch(0.55 0.14 150)',
];

interface MobileSettingsProps {
  onBack: () => void;
}

export function MobileSettings({ onBack }: MobileSettingsProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const workspace = useQuery(api.workspaces.getMyWorkspace);
  const entities = useQuery(
    api.entities.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip",
  );
  const createEntity = useMutation(api.entities.create);

  const [adding, setAdding] = useState<AddEntityFormValue | null>(null);
  const [deleteEntityId, setDeleteEntityId] = useState<Id<"entities"> | null>(null);

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  async function handleAdd() {
    if (!adding?.name.trim() || !workspace) return;
    const preset = TYPE_PRESETS[adding.type] ?? TYPE_PRESETS.business;
    await createEntity({
      workspaceId: workspace._id,
      kind: adding.type as 'business' | 'property' | 'vehicle' | 'personal',
      name: adding.name.trim(),
      subtitle: adding.sub.trim() || preset.subPlaceholder,
      icon: preset.icon,
      color: ENTITY_COLORS[(entities?.length ?? 0) % ENTITY_COLORS.length],
      identifiers: adding.info,
    });
    setAdding(null);
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
            <button onClick={() => setDeleteEntityId(e._id)} style={{
              background: 'transparent', border: 0, cursor: 'pointer',
              fontSize: 13, color: 'oklch(0.55 0.20 25)', fontWeight: 500, fontFamily: 'var(--font)',
            }}>Delete</button>
          </div>
        ))}
        {adding ? (
          <div style={{ padding: '4px 14px 14px' }}>
            <AddEntityForm
              value={adding}
              onChange={setAdding}
              onCancel={() => setAdding(null)}
              onCommit={handleAdd}
            />
          </div>
        ) : (
          <div onClick={() => setAdding({ type: 'business', name: '', sub: '', info: {} })} style={{
            padding: '12px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            color: 'var(--accent)', fontSize: 15, fontWeight: 500,
          }}>
            {Ic.plus(16, 'var(--accent)', 2.4)} Add entity
          </div>
        )}
      </ListGroup>

      {deleteEntityId && (
        <DeleteEntityModal
          entityId={deleteEntityId}
          onClose={() => setDeleteEntityId(null)}
          onDeleted={() => { setDeleteEntityId(null); router.push('/docs'); }}
        />
      )}
    </div>
  );
}
