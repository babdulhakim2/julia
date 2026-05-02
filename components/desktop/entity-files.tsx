'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Entity, Item, Folder } from '@/lib/types';
import { CATEGORIES } from '@/lib/data';
import { useStore } from '@/lib/store';
import { inPeriod, inDateRange, dRel } from '@/lib/utils';
import { Ic } from '@/components/icons';
import { CatChip } from '@/components/shared/cat-chip';
import { FolderCard } from '@/components/shared/folder-card';
import { DragDropProvider, useDragDrop } from '@/lib/use-drag-drop';
import { AutoOrganizeModal } from '@/components/shared/auto-organize-modal';
import { computeAutoOrganize } from '@/lib/auto-organize';
import { Toast } from '@/components/ui/toast';
import { STATUS_META } from '@/lib/data';

interface EntityFilesProps {
  entity: Entity;
  items: Item[];
  search: string;
  selectedId: string;
  onSelect: (id: string) => void;
  activeFolderId?: string | null;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: '#FAF9F5', borderRadius: 10, padding: '10px 12px',
      border: '0.5px solid var(--sep)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)', marginTop: 4, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>{value}</div>
    </div>
  );
}

function DraggableItemRow({ item, ent, selected, onSelect }: {
  item: Item; ent: Record<string, Entity>; selected: boolean; onSelect: (id: string) => void;
}) {
  const { startDrag, updatePosition, endDrag, state } = useDragDrop();
  const meta = STATUS_META[item.status];
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const justDraggedRef = useRef(false);

  useEffect(() => {
    if (state.phase !== 'dragging') {
      isDraggingRef.current = false;
    }
  }, [state.phase]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) > 3) {
        isDraggingRef.current = true;
        justDraggedRef.current = true;
        startDrag({ id: item.id, title: item.title }, e.clientX, e.clientY);
      }
      if (isDraggingRef.current) {
        updatePosition(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        endDrag();
        // Keep justDragged flag for a tick to prevent click
        setTimeout(() => { justDraggedRef.current = false; }, 50);
      }
      dragStartRef.current = null;
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [item.id, item.title, startDrag, updatePosition, endDrag]);

  const handleClick = () => {
    if (justDraggedRef.current) return;
    onSelect(item.id);
  };

  return (
    <button
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        display: 'grid', gridTemplateColumns: '32px 1fr 110px 110px',
        width: '100%', padding: '11px 24px', alignItems: 'center', gap: 0,
        background: selected ? 'var(--sel-bg)' : 'transparent', border: 0, borderBottom: '0.5px solid var(--hair)',
        fontFamily: 'var(--font)', textAlign: 'left',
        cursor: isDraggingRef.current ? 'grabbing' : 'grab',
        color: 'var(--ink)', userSelect: 'none',
      }}
      onMouseEnter={(ev) => { if (!selected) ev.currentTarget.style.background = 'var(--row-hover)'; }}
      onMouseLeave={(ev) => { if (!selected) ev.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 22, height: 28, borderRadius: 4, background: '#fff',
        border: '0.5px solid var(--sep)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{Ic.doc(12, 'var(--muted)')}</div>
      <div style={{ minWidth: 0, paddingRight: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{item.issuer || item.type}</div>
      </div>
      <div>
        {meta && (
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 99,
            fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color,
          }}>{meta.label}</span>
        )}
      </div>
      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
        {item.amount ? `£${item.amount.toLocaleString()}` : '—'}
      </div>
    </button>
  );
}

export function EntityFiles({ entity, items, search, selectedId, onSelect, activeFolderId }: EntityFilesProps) {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState('all');
  const [period, setPeriod] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showAutoOrganize, setShowAutoOrganize] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant?: 'default' | 'success' } | null>(null);

  const folders = state.folders.filter(f => f.entityId === entity.id);

  const periods = [
    { id: 'all', label: 'All time' },
    { id: '2026', label: '2026' },
    { id: '2026-Q2', label: 'Q2 26' },
    { id: '2026-Q1', label: 'Q1 26' },
    { id: '2025', label: '2025' },
    { id: 'custom', label: 'Custom' },
  ];

  const filtered = items.filter(i =>
    (period === 'custom'
      ? (customStart && customEnd ? inDateRange(i.date, customStart, customEnd) : true)
      : inPeriod(i.date, period)) &&
    (search === '' || i.title.toLowerCase().includes(search.toLowerCase()) || (i.issuer || '').toLowerCase().includes(search.toLowerCase()))
  );
  const byCat: Record<string, Item[]> = {};
  CATEGORIES.forEach(c => (byCat[c.id] = []));
  filtered.forEach(it => { (byCat[it.category] = byCat[it.category] || []).push(it); });
  const cats = CATEGORIES.filter(c => (byCat[c.id] || []).length > 0);
  const tabItems = tab === 'all' ? filtered : (byCat[tab] || []);
  const total = filtered.reduce((s, i) => s + (i.amount || 0), 0);
  const ent = Object.fromEntries(state.entities.map(e => [e.id, e]));

  const displayItems = activeFolderId
    ? tabItems.filter(i => i.folderId === activeFolderId)
    : tabItems;
  const unfiledItems = tabItems.filter(i => !i.folderId);
  const activeFolder = activeFolderId ? folders.find(f => f.id === activeFolderId) : null;

  function showToast(message: string, variant?: 'default' | 'success') {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 2500);
  }

  function handleDrop(itemId: string, folderId: string, folderName: string) {
    dispatch({ type: 'MOVE_ITEM_TO_FOLDER', itemId, folderId });
    showToast(`Moved to ${folderName}`, 'success');
  }

  function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    const folder: Folder = {
      id: `f-${Date.now()}`,
      entityId: entity.id,
      name: newFolderName.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    dispatch({ type: 'ADD_FOLDER', folder });
    setNewFolderName('');
    setCreatingFolder(false);
  }

  function handleAutoOrganize() {
    setShowAutoOrganize(true);
  }

  // Compute auto-organize result for modal
  const autoOrganizeResult = showAutoOrganize
    ? computeAutoOrganize(items, folders, entity.id)
    : null;

  function handleAutoOrganizeConfirm() {
    if (!autoOrganizeResult) return;
    // Create new folders
    autoOrganizeResult.newFolders.forEach(folder => {
      dispatch({ type: 'ADD_FOLDER', folder });
    });
    // Move items
    autoOrganizeResult.moves.forEach(({ itemId, folderId }) => {
      dispatch({ type: 'MOVE_ITEM_TO_FOLDER', itemId, folderId });
    });
    setShowAutoOrganize(false);
    showToast(`Organized ${autoOrganizeResult.moves.length} items`, 'success');
  }

  return (
    <DragDropProvider onDrop={handleDrop}>
      <div>
        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          padding: '14px 24px 0', gap: 14 }}>
          <Stat label="Open items" value={items.filter(i => i.status !== 'done').length} />
          <Stat label="This period" value={`£${total.toLocaleString()}`} />
          <Stat label="Total filed" value={items.length} />
          <Stat label="Last activity" value={items.length ? dRel(items.map(i => i.date).filter(Boolean).sort().slice(-1)[0]) : '—'} />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 24px 0', alignItems: 'center' }}>
          <button onClick={() => setCreatingFolder(!creatingFolder)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 6, border: '0.5px solid var(--sep)',
            background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font)', color: 'var(--ink)',
          }}>
            {Ic.plus(12, 'var(--ink)', 2)} Folder
          </button>
          <button onClick={handleAutoOrganize} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 6, border: '0.5px solid var(--sep)',
            background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font)', color: 'var(--ink)',
          }}>
            {Ic.sparkle(12, 'var(--accent)')} Auto-organize
          </button>
          {activeFolderId && (
            <button onClick={() => router.push(`/files/${entity.id}`)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6, border: 0,
              background: 'var(--accent)', color: '#fff', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
            }}>
              {Ic.back(12, '#fff')} All files
            </button>
          )}
        </div>

        {/* New folder inline */}
        {creatingFolder && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 24px 0', alignItems: 'center' }}>
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              style={{
                padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--sep)',
                fontSize: 13, fontFamily: 'var(--font)', outline: 'none', flex: 1,
              }}
            />
            <button onClick={handleCreateFolder} style={{
              padding: '6px 12px', borderRadius: 6, border: 0, background: 'var(--ink)',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            }}>Create</button>
            <button onClick={() => { setCreatingFolder(false); setNewFolderName(''); }} style={{
              padding: '6px 12px', borderRadius: 6, border: '0.5px solid var(--sep)',
              background: '#fff', color: 'var(--ink)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font)',
            }}>Cancel</button>
          </div>
        )}

        {/* Period tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '14px 24px 0' }}>
          {periods.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)} style={{
              padding: '4px 11px', borderRadius: 6, border: 0, cursor: 'pointer',
              background: period === p.id ? 'var(--ink)' : 'transparent',
              color: period === p.id ? '#fff' : 'var(--ink2)',
              fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
            }}>{p.label}</button>
          ))}
        </div>

        {/* Custom date inputs */}
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 10, padding: '10px 24px 0', alignItems: 'center' }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', fontSize: 12, fontFamily: 'var(--font)' }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', fontSize: 12, fontFamily: 'var(--font)' }} />
          </div>
        )}

        {/* Category chips */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, padding: '14px 24px 0', overflowX: 'auto' }}>
          <CatChip selected={tab === 'all'} onClick={() => setTab('all')} label="All" color="var(--muted)" count={filtered.length} />
          {cats.map(c => (
            <CatChip key={c.id} selected={tab === c.id} onClick={() => setTab(tab === c.id ? 'all' : c.id)} label={c.name} color={c.color} count={byCat[c.id].length} />
          ))}
        </div>

        {/* Breadcrumb when inside a folder */}
        {activeFolder && (
          <div style={{ padding: '12px 24px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <button onClick={() => router.push(`/files/${entity.id}`)} style={{
              background: 'transparent', border: 0, cursor: 'pointer',
              color: 'var(--accent)', fontWeight: 500, fontFamily: 'var(--font)',
            }}>{entity.name}</button>
            <span style={{ color: 'var(--muted)' }}>/</span>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{activeFolder.name}</span>
          </div>
        )}

        {/* Folders grid */}
        {!activeFolderId && folders.length > 0 && (
          <div style={{ padding: '14px 24px 0' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Folders · {folders.length}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {folders.map(f => {
                const folderItemCount = tabItems.filter(i => i.folderId === f.id).length;
                return (
                  <FolderCard
                    key={f.id}
                    id={f.id}
                    name={f.name}
                    color={f.color}
                    itemCount={folderItemCount}
                    onClick={() => router.push(`/files/${entity.id}?folder=${f.id}`)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Items */}
        {activeFolderId ? (
          <>
            <div style={{ padding: '14px 24px 0', fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Items · {displayItems.length}
            </div>
            <div>
              <div style={{
                display: 'grid', gridTemplateColumns: '32px 1fr 110px 110px',
                padding: '8px 24px', borderBottom: '0.5px solid var(--sep)',
                fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                background: '#fff', position: 'sticky', top: 0, zIndex: 1,
              }}>
                <span></span>
                <span>Title</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Amount</span>
              </div>
              {displayItems.map(it => (
                <DraggableItemRow key={it.id} item={it} ent={ent} selected={selectedId === it.id} onSelect={onSelect} />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Unfiled items */}
            {unfiledItems.length > 0 && (
              <>
                <div style={{ padding: '14px 24px 0', fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {folders.length > 0 ? `Unfiled · ${unfiledItems.length}` : `Items · ${tabItems.length}`}
                </div>
                <div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '32px 1fr 110px 110px',
                    padding: '8px 24px', borderBottom: '0.5px solid var(--sep)',
                    fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                    background: '#fff', position: 'sticky', top: 0, zIndex: 1,
                  }}>
                    <span></span>
                    <span>Title</span>
                    <span>Status</span>
                    <span style={{ textAlign: 'right' }}>Amount</span>
                  </div>
                  {(folders.length > 0 ? unfiledItems : tabItems).map(it => (
                    <DraggableItemRow key={it.id} item={it} ent={ent} selected={selectedId === it.id} onSelect={onSelect} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Info card */}
        {entity?.info && Object.keys(entity.info).length > 0 && (
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>About</div>
            <div style={{
              background: '#FAF9F5', borderRadius: 10, padding: '4px 14px',
              border: '0.5px solid var(--sep)',
            }}>
              {Object.entries(entity.info).map(([k, v], i, arr) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: i === arr.length - 1 ? 'none' : '0.5px solid var(--hair)' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{k}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && <Toast message={toast.message} variant={toast.variant} />}

        {/* Auto-organize modal */}
        {showAutoOrganize && autoOrganizeResult && (
          <AutoOrganizeModal
            folderSummaries={autoOrganizeResult.folderSummaries}
            movesCount={autoOrganizeResult.moves.length}
            newFoldersCount={autoOrganizeResult.newFolders.length}
            onConfirm={handleAutoOrganizeConfirm}
            onCancel={() => setShowAutoOrganize(false)}
          />
        )}
      </div>
    </DragDropProvider>
  );
}
