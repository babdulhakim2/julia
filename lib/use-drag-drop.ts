'use client';

import React, { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Ic } from '@/components/icons';

// Types
export interface DragItem {
  id: string;
  title: string;
}

interface FolderTarget {
  id: string;
  name: string;
  ref: React.RefObject<HTMLElement | null>;
}

interface DragDropState {
  item: DragItem | null;
  position: { x: number; y: number };
  overFolderId: string | null;
  dropSuccessFolderId: string | null;
  phase: 'idle' | 'dragging';
}

interface DragDropContextValue {
  state: DragDropState;
  startDrag: (item: DragItem, x: number, y: number) => void;
  updatePosition: (x: number, y: number) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  registerFolder: (id: string, name: string, ref: React.RefObject<HTMLElement | null>) => void;
  unregisterFolder: (id: string) => void;
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

// Provider
interface DragDropProviderProps {
  children: ReactNode;
  onDrop: (itemId: string, folderId: string, folderName: string) => void;
}

export function DragDropProvider({ children, onDrop }: DragDropProviderProps) {
  const [state, setState] = useState<DragDropState>({
    item: null,
    position: { x: 0, y: 0 },
    overFolderId: null,
    dropSuccessFolderId: null,
    phase: 'idle',
  });

  const posRef = useRef({ x: 0, y: 0 });
  const foldersRef = useRef<Map<string, FolderTarget>>(new Map());
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<'idle' | 'dragging'>('idle');
  const itemRef = useRef<DragItem | null>(null);
  const tickRef = useRef<() => void>(() => {});

  const hitTest = useCallback(() => {
    const { x, y } = posRef.current;
    let found: string | null = null;
    foldersRef.current.forEach((folder) => {
      if (folder.ref.current) {
        const rect = folder.ref.current.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          found = folder.id;
        }
      }
    });
    return found;
  }, []);

  const tick = useCallback(() => {
    if (phaseRef.current !== 'dragging') return;
    const overFolderId = hitTest();
    setState(s => ({
      ...s,
      position: { ...posRef.current },
      overFolderId,
    }));
    rafRef.current = requestAnimationFrame(tickRef.current);
  }, [hitTest]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const startDrag = useCallback((item: DragItem, x: number, y: number) => {
    posRef.current = { x, y };
    phaseRef.current = 'dragging';
    itemRef.current = item;
    setState({
      item,
      position: { x, y },
      overFolderId: null,
      dropSuccessFolderId: null,
      phase: 'dragging',
    });
    rafRef.current = requestAnimationFrame(tickRef.current);
  }, []);

  const updatePosition = useCallback((x: number, y: number) => {
    posRef.current = { x, y };
  }, []);

  const endDrag = useCallback(() => {
    const overFolderId = hitTest();
    phaseRef.current = 'idle';
    cancelAnimationFrame(rafRef.current);

    if (overFolderId && itemRef.current) {
      const folder = foldersRef.current.get(overFolderId);
      const folderName = folder?.name || '';
      onDrop(itemRef.current.id, overFolderId, folderName);
      setState(s => ({
        ...s,
        item: null,
        phase: 'idle',
        overFolderId: null,
        dropSuccessFolderId: overFolderId,
      }));
      setTimeout(() => {
        setState(s => ({ ...s, dropSuccessFolderId: null }));
      }, 600);
    } else {
      setState(s => ({
        ...s,
        item: null,
        phase: 'idle',
        overFolderId: null,
      }));
    }
    itemRef.current = null;
  }, [hitTest, onDrop]);

  const cancelDrag = useCallback(() => {
    phaseRef.current = 'idle';
    cancelAnimationFrame(rafRef.current);
    itemRef.current = null;
    setState(s => ({
      ...s,
      item: null,
      phase: 'idle',
      overFolderId: null,
    }));
  }, []);

  const registerFolder = useCallback((id: string, name: string, ref: React.RefObject<HTMLElement | null>) => {
    foldersRef.current.set(id, { id, name, ref });
  }, []);

  const unregisterFolder = useCallback((id: string) => {
    foldersRef.current.delete(id);
  }, []);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => { cancelAnimationFrame(rafRef.current); };
  }, []);

  const contextValue: DragDropContextValue = {
    state,
    startDrag,
    updatePosition,
    endDrag,
    cancelDrag,
    registerFolder,
    unregisterFolder,
  };

  return React.createElement(
    DragDropContext.Provider,
    { value: contextValue },
    children,
    state.phase === 'dragging' && state.item ? React.createElement(FloatingPreview, {
      title: state.item.title,
      x: state.position.x,
      y: state.position.y,
    }) : null,
  );
}

// Floating preview card rendered via portal
function FloatingPreview({ title, x, y }: { title: string; x: number; y: number }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    React.createElement('div', {
      style: {
        position: 'fixed',
        left: x + 12,
        top: y - 20,
        pointerEvents: 'none' as const,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
        border: '0.5px solid rgba(255,255,255,0.6)',
        transform: 'rotate(-2deg)',
        maxWidth: 220,
        fontFamily: 'var(--font)',
      },
    },
      React.createElement('div', {
        style: {
          width: 20, height: 26, borderRadius: 4, background: '#fff',
          border: '0.5px solid var(--sep)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        },
      }, Ic.doc(11, 'var(--muted)')),
      React.createElement('div', {
        style: {
          fontSize: 12, fontWeight: 500, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        },
      }, title),
    ),
    document.body,
  );
}

// Consumer hook
export function useDragDrop() {
  const ctx = useContext(DragDropContext);
  if (!ctx) throw new Error('useDragDrop must be used within DragDropProvider');
  return ctx;
}
