'use client';

import React, { useRef, useEffect } from 'react';
import { useDragDrop } from '@/lib/use-drag-drop';
import { Ic } from '@/components/icons';

interface FolderCardProps {
  id: string;
  name: string;
  color?: string;
  itemCount: number;
  onClick: () => void;
  onDropItem?: (itemId: string, folderId: string) => void;
}

export function FolderCard({ id, name, color, itemCount, onClick, onDropItem }: FolderCardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const { state, registerFolder, unregisterFolder } = useDragDrop();
  const isDragging = state.phase === 'dragging';
  const isOver = state.overFolderId === id;
  const isDropSuccess = state.dropSuccessFolderId === id;

  useEffect(() => {
    registerFolder(id, name, ref as React.RefObject<HTMLElement | null>);
    return () => unregisterFolder(id);
  }, [id, name, registerFolder, unregisterFolder]);

  // Prevent accidental onClick during drag
  const handleClick = () => {
    if (isDragging) return;
    onClick();
  };

  let borderStyle = '0.5px solid var(--sep)';
  let bgStyle = '#FAF9F5';
  let animStyle: string | undefined = undefined;

  if (isDropSuccess) {
    borderStyle = '2px solid oklch(0.55 0.14 150)';
    bgStyle = 'oklch(0.97 0.03 150)';
    animStyle = 'drop-success 0.6s ease-out';
  } else if (isOver) {
    borderStyle = '2px solid var(--accent)';
    bgStyle = 'oklch(0.96 0.04 252)';
  } else if (isDragging) {
    animStyle = 'pulse-glow 1.5s ease-in-out infinite';
  }

  return (
    <button
      ref={ref}
      onClick={handleClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: 12, borderRadius: 10,
        background: bgStyle,
        border: borderStyle,
        cursor: isDragging ? 'default' : 'pointer',
        fontFamily: 'var(--font)', textAlign: 'left',
        minWidth: 120, transition: 'border 0.15s, background 0.15s',
        animation: animStyle,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: color || 'var(--muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {Ic.doc(14, '#fff')}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{name}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </div>
    </button>
  );
}
