'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { getIcon } from '@/components/icons';

interface DeleteEntityModalProps {
  entityId: Id<"entities">;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteEntityModal({ entityId, onClose, onDeleted }: DeleteEntityModalProps) {
  const cascadeInfo = useQuery(api.entities.getCascadeInfo, { entityId });
  const deleteEntity = useMutation(api.entities.deleteWithCascade);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!cascadeInfo) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      }} onClick={onClose}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: 24, width: 400,
          textAlign: 'center', color: 'var(--muted)', fontSize: 14,
        }} onClick={e => e.stopPropagation()}>
          Loading...
        </div>
      </div>
    );
  }

  const nameMatch = confirmName.trim().toLowerCase() === cascadeInfo.entityName.toLowerCase();

  async function handleDelete() {
    if (!nameMatch || deleting) return;
    setDeleting(true);
    try {
      await deleteEntity({ entityId });
      onDeleted();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 24, width: 420,
        maxWidth: 'calc(100vw - 32px)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, background: cascadeInfo.entityColor, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>{getIcon(cascadeInfo.entityIcon, 18, '#fff')}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Delete {cascadeInfo.entityName}?
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              This action cannot be undone.
            </div>
          </div>
        </div>

        {/* What will be deleted */}
        <div style={{
          background: 'oklch(0.97 0.01 25)', border: '1px solid oklch(0.90 0.04 25)',
          borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: 'oklch(0.45 0.12 25)', lineHeight: 1.6,
        }}>
          This will permanently delete:
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {cascadeInfo.documentCount > 0 && (
              <li><strong>{cascadeInfo.documentCount}</strong> document{cascadeInfo.documentCount !== 1 ? 's' : ''} (and all files, text chunks, processing jobs)</li>
            )}
            {cascadeInfo.folderCount > 0 && (
              <li><strong>{cascadeInfo.folderCount}</strong> folder{cascadeInfo.folderCount !== 1 ? 's' : ''}</li>
            )}
            {cascadeInfo.eventCount > 0 && (
              <li><strong>{cascadeInfo.eventCount}</strong> event{cascadeInfo.eventCount !== 1 ? 's' : ''}</li>
            )}
            {cascadeInfo.documentCount === 0 && cascadeInfo.folderCount === 0 && cascadeInfo.eventCount === 0 && (
              <li>The entity record and all associated data</li>
            )}
          </ul>
        </div>

        {/* Confirmation input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Type <strong style={{ color: 'var(--ink)' }}>{cascadeInfo.entityName}</strong> to confirm
          </label>
          <input
            value={confirmName}
            onChange={e => setConfirmName(e.target.value)}
            placeholder={cascadeInfo.entityName}
            autoFocus
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '1px solid var(--sep)', fontSize: 14, fontFamily: 'var(--font)',
              outline: 'none', boxSizing: 'border-box',
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleDelete(); }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--sep)',
            background: '#fff', color: 'var(--ink)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font)',
          }}>Cancel</button>
          <button onClick={handleDelete} disabled={!nameMatch || deleting} style={{
            padding: '8px 16px', borderRadius: 8, border: 0,
            background: nameMatch && !deleting ? 'oklch(0.55 0.20 25)' : 'var(--muted2)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: nameMatch && !deleting ? 'pointer' : 'default', fontFamily: 'var(--font)',
          }}>{deleting ? 'Deleting...' : 'Delete permanently'}</button>
        </div>
      </div>
    </div>
  );
}
