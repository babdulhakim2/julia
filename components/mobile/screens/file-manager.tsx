'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { inPeriod, inDateRange } from '@/lib/utils';
import { CATEGORIES } from '@/lib/data';
import { Ic, getIcon } from '@/components/icons';
import { NavBar } from '@/components/ui/nav-bar';
import { NavBtn } from '@/components/ui/nav-btn';
import { ListGroup } from '@/components/ui/list-group';
import { CatChip } from '@/components/shared/cat-chip';
import { MoveToFolderSheet } from '@/components/shared/move-to-folder-sheet';
import { DragDropProvider, useDragDrop } from '@/lib/use-drag-drop';
import { useTouchDrag } from '@/lib/use-touch-drag';
import { AutoOrganizeModal } from '@/components/shared/auto-organize-modal';
import { computeAutoOrganize } from '@/lib/auto-organize';
import { Toast } from '@/components/ui/toast';
import { DocumentPreviewModal } from '@/components/shared/document-preview-modal';
import { DocumentThumb } from '@/components/shared/document-thumb';
import { BookkeepingPanel } from '@/components/shared/bookkeeping-panel';
import type { Folder, Item } from '@/lib/types';

interface FileManagerProps {
  entityId: string;
  onBack: () => void;
  onOpenItem: (id: string) => void;
}

export function FileManager({ entityId, onBack, onOpenItem }: FileManagerProps) {
  const { state, dispatch } = useStore();
  const e = state.entities.find(x => x.id === entityId);
  const all = state.items.filter(i => i.entity === entityId);
  const folders = state.folders.filter(f => f.entityId === entityId);

  const [period, setPeriod] = useState('all');
  const [category, setCategory] = useState('all');
  const [view, setView] = useState<'folders' | 'list'>('folders');
  const [search, setSearch] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [moveItemId, setMoveItemId] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showAutoOrganize, setShowAutoOrganize] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant?: 'default' | 'success' } | null>(null);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);

  if (!e) return null;

  function handleOpenItem(id: string) {
    const item = state.items.find(i => i.id === id);
    if (item?.convexDocumentId) {
      setPreviewDocumentId(item.convexDocumentId);
    } else {
      onOpenItem(id);
    }
  }

  const periods = [
    { id: 'all', label: 'All time' },
    { id: '2026', label: '2026' },
    { id: '2026-Q2', label: 'Q2 26' },
    { id: '2026-Q1', label: 'Q1 26' },
    { id: '2025', label: '2025' },
    { id: 'custom', label: 'Custom' },
  ];

  const filtered = all.filter(it =>
    (period === 'custom'
      ? (customStart && customEnd ? inDateRange(it.date, customStart, customEnd) : true)
      : inPeriod(it.date, period)) &&
    (search === '' ||
      it.title.toLowerCase().includes(search.toLowerCase()) ||
      (it.issuer || '').toLowerCase().includes(search.toLowerCase()) ||
      (it.ref || '').toLowerCase().includes(search.toLowerCase()) ||
      it.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase())))
  );

  const byCat: Record<string, typeof filtered> = {};
  CATEGORIES.forEach(c => (byCat[c.id] = []));
  filtered.forEach(it => { (byCat[it.category] = byCat[it.category] || []).push(it); });

  const visibleCats = CATEGORIES.filter(c => (byCat[c.id] || []).length > 0);
  const total = filtered.reduce((s, i) => s + (i.amount || 0), 0);

  const catFiltered = category === 'all' ? filtered : filtered.filter(i => i.category === category);
  const activeFolder = activeFolderId ? folders.find(f => f.id === activeFolderId) : null;
  const displayItems = activeFolderId
    ? catFiltered.filter(i => i.folderId === activeFolderId)
    : catFiltered;
  const unfiledItems = catFiltered.filter(i => !i.folderId);

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
      entityId,
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

  const autoOrganizeResult = showAutoOrganize
    ? computeAutoOrganize(all, folders, entityId)
    : null;

  function handleAutoOrganizeConfirm() {
    if (!autoOrganizeResult) return;
    autoOrganizeResult.newFolders.forEach(folder => {
      dispatch({ type: 'ADD_FOLDER', folder });
    });
    autoOrganizeResult.moves.forEach(({ itemId, folderId }) => {
      dispatch({ type: 'MOVE_ITEM_TO_FOLDER', itemId, folderId });
    });
    setShowAutoOrganize(false);
    showToast(`Organized ${autoOrganizeResult.moves.length} items`, 'success');
  }

  const moveItem = moveItemId ? state.items.find(i => i.id === moveItemId) : null;

  return (
    <DragDropProvider onDrop={handleDrop}>
      <div style={{ paddingBottom: 120 }}>
        <NavBar
          title={activeFolder ? activeFolder.name : e.name}
          leading={
            <NavBtn onClick={activeFolder ? () => setActiveFolderId(null) : onBack}>
              {Ic.back(20, 'var(--accent)')} {activeFolder ? e.name : 'Docs'}
            </NavBtn>
          }
          trailing={
            <button onClick={() => setView(v => v === 'folders' ? 'list' : 'folders')}
              style={{ background: 'transparent', border: 0, padding: 6, cursor: 'pointer' }}>
              {view === 'folders' ? Ic.doc(20, 'var(--accent)') : Ic.building(20, 'var(--accent)')}
            </button>
          }
        />

        {/* Hero */}
        {!activeFolder && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: e.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getIcon(e.icon, 20, '#fff')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: -0.4, fontFamily: 'var(--font-display)', lineHeight: 1.15 }}>{e.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{filtered.length} items · £{total.toLocaleString()} this period</div>
              </div>
            </div>
            {Object.keys(e.info || {}).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {Object.entries(e.info).slice(0, 6).map(([k, v]) => (
                  <div key={k} style={{
                    padding: '6px 8px', borderRadius: 8, background: '#fff',
                    border: '0.5px solid var(--hair)', minWidth: 0,
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{k}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!activeFolder && e.type === 'business' && (
          <BookkeepingPanel entityId={e.id} entityName={e.name} compact />
        )}

        {/* Toolbar */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 10px' }}>
          <button onClick={() => setCreatingFolder(!creatingFolder)} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 999, border: '0.5px solid var(--sep)',
            background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font)', color: 'var(--ink)', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {Ic.plus(11, 'var(--ink)', 2)} Folder
          </button>
          <button onClick={handleAutoOrganize} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 999, border: '0.5px solid var(--sep)',
            background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font)', color: 'var(--ink)', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {Ic.sparkle(11, 'var(--accent)')} Auto-organize
          </button>
        </div>

        {/* New folder inline */}
        {creatingFolder && (
          <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8 }}>
            <input
              value={newFolderName}
              onChange={ev => setNewFolderName(ev.target.value)}
              placeholder="Folder name"
              autoFocus
              onKeyDown={ev => ev.key === 'Enter' && handleCreateFolder()}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, border: '0.5px solid var(--sep)',
                fontSize: 14, fontFamily: 'var(--font)', outline: 'none',
              }}
            />
            <button onClick={handleCreateFolder} style={{
              padding: '8px 14px', borderRadius: 8, border: 0, background: 'var(--ink)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            }}>Create</button>
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
            background: 'rgba(118,118,128,0.12)', borderRadius: 10 }}>
            {Ic.search(16, 'var(--muted)')}
            <input value={search} onChange={ev => setSearch(ev.target.value)} placeholder="Search this entity"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 15, fontFamily: 'var(--font)', color: 'var(--ink)' }}/>
          </div>
        </div>

        {/* Time slicer */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 12px' }}>
          {periods.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)} style={{
              padding: '6px 12px', borderRadius: 999, border: 0, cursor: 'pointer',
              background: period === p.id ? 'var(--ink)' : '#E9E9EE',
              color: period === p.id ? '#fff' : 'var(--ink)',
              fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font)',
            }}>{p.label}</button>
          ))}
        </div>

        {/* Custom date inputs */}
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', alignItems: 'center' }}>
            <input type="date" value={customStart} onChange={ev => setCustomStart(ev.target.value)}
              style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '0.5px solid var(--sep)', fontSize: 14, fontFamily: 'var(--font)' }} />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>to</span>
            <input type="date" value={customEnd} onChange={ev => setCustomEnd(ev.target.value)}
              style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '0.5px solid var(--sep)', fontSize: 14, fontFamily: 'var(--font)' }} />
          </div>
        )}

        {/* Category filter */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 14px' }}>
          <CatChip selected={category === 'all'} onClick={() => setCategory('all')} label="All" color="var(--muted)" />
          {visibleCats.map(c => (
            <CatChip key={c.id} selected={category === c.id} onClick={() => setCategory(category === c.id ? 'all' : c.id)} label={c.name} color={c.color} />
          ))}
        </div>

        {/* Folders section */}
        {!activeFolderId && folders.length > 0 && (
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Folders · {folders.length}
            </div>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
              {folders.map(f => {
                const count = catFiltered.filter(i => i.folderId === f.id).length;
                return (
                  <MobileFolderTarget key={f.id} id={f.id} name={f.name} onClick={() => setActiveFolderId(f.id)}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: f.color || 'var(--muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {Ic.doc(12, '#fff')}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{count} items</div>
                  </MobileFolderTarget>
                );
              })}
            </div>
          </div>
        )}

        {view === 'folders' ? (
          activeFolderId ? (
            <FlatListWithMove
              items={displayItems}
              onOpenItem={handleOpenItem}
              onMoveItem={(id) => setMoveItemId(id)}
            />
          ) : (
            <>
              {folders.length > 0 && unfiledItems.length > 0 && (
                <div style={{ padding: '0 16px 8px', fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Unfiled · {unfiledItems.length}
                </div>
              )}
              <FolderGrid cats={visibleCats} byCat={byCat} category={category}
                onOpenItem={handleOpenItem}
                items={folders.length > 0 ? unfiledItems : catFiltered}
                hasFolders={folders.length > 0}
                onMoveItem={(id) => setMoveItemId(id)}
              />
            </>
          )
        ) : (
          <FlatListWithMove
            items={activeFolderId ? displayItems : catFiltered}
            onOpenItem={handleOpenItem}
            onMoveItem={(id) => setMoveItemId(id)}
          />
        )}

        {/* Move to folder sheet */}
        {moveItemId && (
          <MoveToFolderSheet
            folders={folders}
            currentFolderId={moveItem?.folderId}
            onMove={(folderId) => {
              dispatch({ type: 'MOVE_ITEM_TO_FOLDER', itemId: moveItemId, folderId });
              setMoveItemId(null);
              showToast(`Moved to folder`, 'success');
            }}
            onClose={() => setMoveItemId(null)}
          />
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

        {/* Document preview modal */}
        {previewDocumentId && (
          <DocumentPreviewModal
            documentId={previewDocumentId}
            onClose={() => setPreviewDocumentId(null)}
          />
        )}
      </div>
    </DragDropProvider>
  );
}

// Mobile folder target that registers with DragDrop context
function MobileFolderTarget({ id, name, onClick, children }: {
  id: string; name: string; onClick: () => void; children: React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { state, registerFolder, unregisterFolder } = useDragDrop();
  const isDragging = state.phase === 'dragging';
  const isOver = state.overFolderId === id;
  const isDropSuccess = state.dropSuccessFolderId === id;

  useEffect(() => {
    registerFolder(id, name, ref as React.RefObject<HTMLElement | null>);
    return () => unregisterFolder(id);
  }, [id, name, registerFolder, unregisterFolder]);

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
      onClick={isDragging ? undefined : onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 5,
        padding: 10, borderRadius: 10,
        background: bgStyle, border: borderStyle,
        cursor: isDragging ? 'default' : 'pointer',
        fontFamily: 'var(--font)', textAlign: 'left',
        minWidth: 110, flexShrink: 0,
        transition: 'border 0.15s, background 0.15s',
        animation: animStyle,
      }}
    >
      {children}
    </button>
  );
}

// Touch-draggable item row
function TouchDraggableItem({ item, onOpenItem, children }: {
  item: { id: string; title: string };
  onOpenItem: (id: string) => void;
  children: React.ReactNode;
}) {
  const { startDrag, updatePosition, endDrag } = useDragDrop();

  const touchHandlers = useTouchDrag({
    onLongPressStart: (x, y) => {
      startDrag({ id: item.id, title: item.title }, x, y);
    },
    onTouchMove: (x, y) => {
      updatePosition(x, y);
    },
    onTouchEnd: () => {
      endDrag();
    },
    onTap: () => {
      onOpenItem(item.id);
    },
  });

  return (
    <div {...touchHandlers} style={{ touchAction: 'pan-y' }}>
      {children}
    </div>
  );
}

function FolderGrid({ cats, byCat, category, onOpenItem, items, hasFolders, onMoveItem }: {
  cats: typeof CATEGORIES;
  byCat: Record<string, Item[]>;
  category: string;
  onOpenItem: (id: string) => void;
  items: Item[];
  hasFolders: boolean;
  onMoveItem: (id: string) => void;
}) {
  if (hasFolders) {
    if (items.length === 0) {
      return <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>All items are filed into folders.</div>;
    }
    return (
      <ListGroup>
        {items.map((it, i) => (
          <TouchDraggableItem key={it.id} item={it} onOpenItem={onOpenItem}>
            <div style={{
              padding: '12px 14px', cursor: 'pointer',
              borderBottom: i === items.length - 1 ? 'none' : '0.5px solid var(--hair)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div onClick={() => onOpenItem(it.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{ width: 32, height: 42, flexShrink: 0 }}>
                  <DocumentThumb documentId={it.convexDocumentId} fallbackKind={it.preview || 'lambeth'} height={42} title={it.title} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }}>{it.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{it.type} · {it.date}</div>
                </div>
                {it.amount && <div style={{ fontSize: 14, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>£{it.amount}</div>}
              </div>
              <button onClick={() => onMoveItem(it.id)} style={{
                background: 'transparent', border: 0, cursor: 'pointer', padding: 4, flexShrink: 0,
              }}>
                {Ic.doc(16, 'var(--accent)')}
              </button>
            </div>
          </TouchDraggableItem>
        ))}
      </ListGroup>
    );
  }

  const visible = category === 'all' ? cats : cats.filter(c => c.id === category);
  return (
    <div>
      {visible.map(c => {
        const list = byCat[c.id] || [];
        const total = list.reduce((s, i) => s + (i.amount || 0), 0);
        return (
          <div key={c.id} style={{ marginBottom: 18 }}>
            <div style={{ padding: '0 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 5, background: c.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getIcon(c.icon, 13, '#fff')}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.1 }}>{c.name}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {list.length} {list.length === 1 ? 'item' : 'items'}</span>
              {total > 0 && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto', paddingRight: 16 }}>£{total.toLocaleString()}</span>}
            </div>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '4px 16px 4px' }}>
              {list.slice(0, 6).map((it) => (
                <button key={it.id} onClick={() => onOpenItem(it.id)} style={{
                  width: 138, flexShrink: 0, background: '#fff', borderRadius: 12, border: 0,
                  cursor: 'pointer', padding: 8, textAlign: 'left', fontFamily: 'var(--font)',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ height: 88, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                    <DocumentThumb documentId={it.convexDocumentId} fallbackKind={it.preview || 'lambeth'} height={88} title={it.title} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.25,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{it.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{(it.date || '').slice(5, 10).replace('-', '/')}</span>
                    {it.amount && <span style={{ fontVariantNumeric: 'tabular-nums' }}>£{it.amount}</span>}
                  </div>
                </button>
              ))}
              {list.length > 6 && (
                <button style={{ width: 84, flexShrink: 0, background: 'transparent',
                  border: '1px dashed var(--sep)', borderRadius: 12, color: 'var(--muted)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  + {list.length - 6} more
                </button>
              )}
            </div>
          </div>
        );
      })}
      {visible.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Nothing here for this period yet.
        </div>
      )}
    </div>
  );
}

function FlatListWithMove({ items, onOpenItem, onMoveItem }: {
  items: Item[];
  onOpenItem: (id: string) => void;
  onMoveItem: (id: string) => void;
}) {
  if (items.length === 0) return (
    <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No matching items.</div>
  );
  return (
    <ListGroup>
      {items.map((it, i) => (
        <TouchDraggableItem key={it.id} item={it} onOpenItem={onOpenItem}>
          <div style={{
            padding: '12px 14px', cursor: 'pointer',
            borderBottom: i === items.length - 1 ? 'none' : '0.5px solid var(--hair)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div onClick={() => onOpenItem(it.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div style={{ width: 32, height: 42, flexShrink: 0 }}>
                <DocumentThumb documentId={it.convexDocumentId} fallbackKind={it.preview || 'lambeth'} height={42} title={it.title} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }}>{it.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{it.type} · {it.date}</div>
              </div>
              {it.amount && <div style={{ fontSize: 14, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>£{it.amount}</div>}
            </div>
            <button onClick={() => onMoveItem(it.id)} style={{
              background: 'transparent', border: 0, cursor: 'pointer', padding: 4, flexShrink: 0,
            }}>
              {Ic.doc(16, 'var(--accent)')}
            </button>
          </div>
        </TouchDraggableItem>
      ))}
    </ListGroup>
  );
}
