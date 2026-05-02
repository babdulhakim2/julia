'use client';

import React from 'react';
import type { Folder } from '@/lib/types';
import { Ic } from '@/components/icons';

interface MoveToFolderSheetProps {
  folders: Folder[];
  currentFolderId?: string;
  onMove: (folderId: string | null) => void;
  onClose: () => void;
}

export function MoveToFolderSheet({ folders, currentFolderId, onMove, onClose }: MoveToFolderSheetProps) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: 'var(--background)',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: '12px 0 30px', maxHeight: '60%', overflowY: 'auto',
      }}>
        <div style={{
          width: 38, height: 4, background: 'var(--sep)', borderRadius: 99,
          margin: '4px auto 8px',
        }} />
        <div style={{
          padding: '8px 16px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Move to folder</div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 0,
            fontSize: 16, color: 'var(--accent)', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font)',
          }}>Done</button>
        </div>
        <div style={{ background: '#fff', marginInline: 16, borderRadius: 12, overflow: 'hidden' }}>
          <div onClick={() => { onMove(null); onClose(); }} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderBottom: '0.5px solid var(--hair)', cursor: 'pointer',
          }}>
            {Ic.inbox(18, 'var(--muted)')}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>Unfiled (root)</div>
            </div>
            {!currentFolderId && Ic.check(18, 'var(--accent)', 2.5)}
          </div>
          {folders.map((f, i) => {
            const sel = currentFolderId === f.id;
            return (
              <div key={f.id} onClick={() => { onMove(f.id); onClose(); }} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderBottom: i === folders.length - 1 ? 'none' : '0.5px solid var(--hair)',
                cursor: 'pointer',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: f.color || 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {Ic.doc(12, '#fff')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>{f.name}</div>
                </div>
                {sel && Ic.check(18, 'var(--accent)', 2.5)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
