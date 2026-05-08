'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { Entity, Item, Folder } from '@/lib/types';
import { CATEGORIES } from '@/lib/data';
import { useStore } from '@/lib/store';
import { inPeriod, inDateRange, dRel } from '@/lib/utils';
import { Ic, getIcon } from '@/components/icons';
import { CatChip } from '@/components/shared/cat-chip';
import { FolderCard } from '@/components/shared/folder-card';
import { DragDropProvider, useDragDrop } from '@/lib/use-drag-drop';
import { AutoOrganizeModal } from '@/components/shared/auto-organize-modal';
import { computeAutoOrganize } from '@/lib/auto-organize';
import { Toast } from '@/components/ui/toast';
import { STATUS_META } from '@/lib/data';
import { DocumentThumb } from '@/components/shared/document-thumb';
import { BookkeepingPanel } from '@/components/shared/bookkeeping-panel';
import { useActiveWorkspace } from '@/lib/admin-view';

interface EntityFilesProps {
  entity: Entity;
  items: Item[];
  search: string;
  selectedId: string;
  onSelect: (id: string) => void;
  activeFolderId?: string | null;
}

type DocsView = 'grid' | 'list';

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

function useMouseDocumentDrag(item: Pick<Item, 'id' | 'title'>) {
  const { startDrag, updatePosition, endDrag, state } = useDragDrop();
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
        window.setTimeout(() => { justDraggedRef.current = false; }, 50);
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
  }, [endDrag, item.id, item.title, startDrag, updatePosition]);

  return {
    onMouseDown: handleMouseDown,
    suppressClick: () => justDraggedRef.current,
  };
}

function RowActionButton({
  children,
  disabled,
  title,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  title: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: 7,
        border: '0.5px solid var(--sep)', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function DraggableItemRow({ item, selected, onSelect, onReassess, onDelete, reassessing, readOnly }: {
  item: Item;
  selected: boolean;
  onSelect: (id: string) => void;
  onReassess: (item: Item) => void;
  onDelete: (item: Item) => void;
  reassessing: boolean;
  readOnly: boolean;
}) {
  const meta = STATUS_META[item.status];
  const drag = useMouseDocumentDrag(item);

  const handleClick = () => {
    if (drag.suppressClick()) return;
    onSelect(item.id);
  };

  return (
    <div
      onMouseDown={drag.onMouseDown}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      style={{
        display: 'grid', gridTemplateColumns: '32px 1fr 110px 110px 76px',
        width: '100%', padding: '11px 24px', alignItems: 'center', gap: 0,
        background: selected ? 'var(--sel-bg)' : 'transparent', border: 0, borderBottom: '0.5px solid var(--hair)',
        fontFamily: 'var(--font)', textAlign: 'left',
        cursor: 'grab',
        color: 'var(--ink)', userSelect: 'none',
      }}
      onMouseEnter={(ev) => { if (!selected) ev.currentTarget.style.background = 'var(--row-hover)'; }}
      onMouseLeave={(ev) => { if (!selected) ev.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 22, height: 28, borderRadius: 4, background: '#fff',
        border: '0.5px solid var(--sep)', overflow: 'hidden',
      }}>
        <DocumentThumb documentId={item.convexDocumentId} fallbackKind={item.preview} height={28} title={item.title} />
      </div>
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5 }}>
        <RowActionButton
          title={readOnly ? 'Preview mode' : 'Reassess document'}
          disabled={readOnly || reassessing || !item.convexDocumentId}
          onClick={(event) => {
            event.stopPropagation();
            onReassess(item);
          }}
        >
          {reassessing ? Ic.clock(14, 'var(--muted)') : Ic.sparkle(14, 'var(--accent)')}
        </RowActionButton>
        <RowActionButton
          title={readOnly ? 'Preview mode' : 'Delete document'}
          disabled={readOnly}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(item);
          }}
        >
          {Ic.x(13, 'oklch(0.50 0.16 25)')}
        </RowActionButton>
      </div>
    </div>
  );
}

function DocumentGridCard({
  item,
  selected,
  onSelect,
  onReassess,
  onDelete,
  reassessing,
  readOnly,
}: {
  item: Item;
  selected: boolean;
  onSelect: (id: string) => void;
  onReassess: (item: Item) => void;
  onDelete: (item: Item) => void;
  reassessing: boolean;
  readOnly: boolean;
}) {
  const meta = STATUS_META[item.status];
  const drag = useMouseDocumentDrag(item);
  const handleClick = () => {
    if (drag.suppressClick()) return;
    onSelect(item.id);
  };

  return (
    <div
      onMouseDown={drag.onMouseDown}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      style={{
        minWidth: 0,
        borderRadius: 10,
        border: selected ? '1px solid var(--accent)' : '0.5px solid var(--sep)',
        background: selected ? 'var(--sel-bg)' : '#fff',
        cursor: 'grab',
        overflow: 'hidden',
        boxShadow: selected ? '0 0 0 3px var(--accent-soft)' : '0 1px 0 rgba(0,0,0,0.02)',
      }}
    >
      <div style={{
        height: 126,
        background: '#F4F3EF',
        borderBottom: '0.5px solid var(--hair)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <DocumentThumb documentId={item.convexDocumentId} fallbackKind={item.preview || 'lambeth'} height={126} title={item.title} />
        {meta && (
          <span style={{
            position: 'absolute', left: 8, top: 8,
            maxWidth: 'calc(100% - 70px)',
            padding: '3px 8px', borderRadius: 99,
            fontSize: 11, fontWeight: 700,
            background: meta.bg, color: meta.color,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {meta.label}
          </span>
        )}
        <div style={{
          position: 'absolute', right: 7, top: 7,
          display: 'flex', gap: 5,
        }}>
          <RowActionButton
            title={readOnly ? 'Preview mode' : 'Reassess document'}
            disabled={readOnly || reassessing || !item.convexDocumentId}
            onClick={(event) => {
              event.stopPropagation();
              onReassess(item);
            }}
          >
            {reassessing ? Ic.clock(14, 'var(--muted)') : Ic.sparkle(14, 'var(--accent)')}
          </RowActionButton>
          <RowActionButton
            title={readOnly ? 'Preview mode' : 'Delete document'}
            disabled={readOnly}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(item);
            }}
          >
            {Ic.x(13, 'oklch(0.50 0.16 25)')}
          </RowActionButton>
        </div>
      </div>
      <div style={{ padding: '10px 10px 11px', display: 'grid', gap: 6 }}>
        <div style={{
          fontSize: 13,
          color: 'var(--ink)',
          fontWeight: 700,
          lineHeight: 1.25,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } as React.CSSProperties}>
          {item.title}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 11.5,
          color: 'var(--muted)',
          minWidth: 0,
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.issuer || item.type}</span>
          <span style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{item.date ? shortDateLabel(item.date) : 'No date'}</span>
        </div>
        {(item.amount || item.dueDate) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            {item.amount ? (
              <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                £{item.amount.toLocaleString()}
              </span>
            ) : <span />}
            {item.dueDate && (
              <span style={{ fontSize: 11.5, color: meta?.color ?? 'var(--muted)', fontWeight: 700 }}>
                Due {shortDateLabel(item.dueDate)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EntityFiles({ entity, items, search, selectedId, onSelect, activeFolderId }: EntityFilesProps) {
  const { state, dispatch } = useStore();
  const { workspace, isViewingClient } = useActiveWorkspace();
  const createProcessingJob = useMutation(api.processingJobs.create);
  const deleteDocument = useMutation(api.documents.remove);
  const router = useRouter();
  const [tab, setTab] = useState('all');
  const [period, setPeriod] = useState('all');
  const [view, setView] = useState<DocsView>('grid');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showAutoOrganize, setShowAutoOrganize] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant?: 'default' | 'success' } | null>(null);
  const [reassessingIds, setReassessingIds] = useState<Set<string>>(() => new Set());
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    (search === '' ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      (i.issuer || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.ref || '').toLowerCase().includes(search.toLowerCase()) ||
      i.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase())))
  );
  const byCat: Record<string, Item[]> = {};
  CATEGORIES.forEach(c => (byCat[c.id] = []));
  filtered.forEach(it => { (byCat[it.category] = byCat[it.category] || []).push(it); });
  const cats = CATEGORIES.filter(c => (byCat[c.id] || []).length > 0);
  const tabItems = tab === 'all' ? filtered : (byCat[tab] || []);
  const total = filtered.reduce((s, i) => s + (i.amount || 0), 0);
  const displayItems = activeFolderId
    ? tabItems.filter(i => i.folderId === activeFolderId)
    : tabItems;
  const unfiledItems = tabItems.filter(i => !i.folderId);
  const activeFolder = activeFolderId ? folders.find(f => f.id === activeFolderId) : null;
  const listItems = activeFolderId
    ? displayItems
    : folders.length > 0
      ? unfiledItems
      : tabItems;

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

  async function handleReassess(item: Item) {
    if (!workspace || !item.convexDocumentId || reassessingIds.has(item.id) || isViewingClient) return;
    setReassessingIds(prev => new Set(prev).add(item.id));
    try {
      await createProcessingJob({
        workspaceId: workspace._id,
        kind: 'extract',
        documentId: item.convexDocumentId as Id<'documents'>,
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash',
      });
      showToast('Reassessment started. Julia will update any new deadlines or bookkeeping.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start reassessment';
      showToast(message);
    } finally {
      setReassessingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteItem || deleting || isViewingClient) return;
    setDeleting(true);
    try {
      if (deleteItem.convexDocumentId) {
        await deleteDocument({ documentId: deleteItem.convexDocumentId as Id<'documents'> });
      }
      dispatch({ type: 'REMOVE_ITEM', id: deleteItem.id });
      setDeleteItem(null);
      showToast('Deleted', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete document';
      showToast(message);
    } finally {
      setDeleting(false);
    }
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
        {!activeFolderId && entity?.info && Object.keys(entity.info).length > 0 && (
          <div style={{ padding: '14px 24px 0' }}>
            <div style={{
              display: 'flex', alignItems: 'stretch', gap: 8, flexWrap: 'wrap',
              background: '#FAF9F5', border: '0.5px solid var(--sep)', borderRadius: 10,
              padding: 10,
            }}>
              {Object.entries(entity.info).slice(0, 8).map(([k, v]) => (
                <div key={k} style={{
                  padding: '6px 9px', borderRadius: 7, background: '#fff',
                  border: '0.5px solid var(--hair)', minWidth: 120,
                }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{k}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!activeFolderId && (
          <BookkeepingPanel entityId={entity.id} entityName={entity.name} />
        )}

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          padding: '18px 24px 0', gap: 14 }}>
          <Stat label="Open items" value={items.filter(i => i.status !== 'done').length} />
          <Stat label="This period" value={`£${total.toLocaleString()}`} />
          <Stat label="Total filed" value={items.length} />
          <Stat label="Last activity" value={items.length ? dRel(items.map(i => i.date).filter(Boolean).sort().slice(-1)[0]) : '—'} />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, padding: '18px 24px 0', alignItems: 'center', flexWrap: 'wrap' }}>
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
            <button onClick={() => router.push(`/docs/${entity.id}`)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6, border: 0,
              background: 'var(--accent)', color: '#fff', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
            }}>
              {Ic.back(12, '#fff')} All docs
            </button>
          )}
          <div style={{
            marginLeft: 'auto',
            display: 'flex',
            padding: 2,
            borderRadius: 8,
            border: '0.5px solid var(--sep)',
            background: '#fff',
          }}>
            {(['grid', 'list'] as const).map(option => (
              <button key={option} onClick={() => setView(option)} style={{
                border: 0,
                borderRadius: 6,
                background: view === option ? 'var(--ink)' : 'transparent',
                color: view === option ? '#fff' : 'var(--muted)',
                padding: '5px 8px',
                fontSize: 11.5,
                fontWeight: 800,
                fontFamily: 'var(--font)',
                cursor: 'pointer',
              }}>
                {option === 'grid' ? 'Grid' : 'List'}
              </button>
            ))}
          </div>
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
            <button onClick={() => router.push(`/docs/${entity.id}`)} style={{
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
                    onClick={() => router.push(`/docs/${entity.id}?folder=${f.id}`)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Items */}
        {view === 'grid' ? (
          <DesktopDocumentGrid
            activeFolderName={activeFolder?.name}
            folders={folders}
            cats={cats}
            byCat={byCat}
            tab={tab}
            tabItems={tabItems}
            displayItems={displayItems}
            unfiledItems={unfiledItems}
            activeFolderId={activeFolderId}
            selectedId={selectedId}
            onSelect={onSelect}
            onReassess={handleReassess}
            onDelete={setDeleteItem}
            reassessingIds={reassessingIds}
            readOnly={isViewingClient}
          />
        ) : (
          <DesktopDocumentList
            label={activeFolderId ? `Items · ${displayItems.length}` : folders.length > 0 ? `Unfiled · ${unfiledItems.length}` : `Items · ${tabItems.length}`}
            items={listItems}
            selectedId={selectedId}
            onSelect={onSelect}
            onReassess={handleReassess}
            onDelete={setDeleteItem}
            reassessingIds={reassessingIds}
            readOnly={isViewingClient}
          />
        )}

        {/* Toast */}
        {toast && <Toast message={toast.message} variant={toast.variant} />}

        {deleteItem && (
          <ConfirmDeleteItem
            title={deleteItem.title}
            hasDocument={Boolean(deleteItem.convexDocumentId)}
            deleting={deleting}
            onCancel={() => {
              if (!deleting) setDeleteItem(null);
            }}
            onConfirm={handleDeleteConfirm}
          />
        )}

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

function DesktopDocumentList({
  label,
  items,
  selectedId,
  onSelect,
  onReassess,
  onDelete,
  reassessingIds,
  readOnly,
}: {
  label: string;
  items: Item[];
  selectedId: string;
  onSelect: (id: string) => void;
  onReassess: (item: Item) => void;
  onDelete: (item: Item) => void;
  reassessingIds: Set<string>;
  readOnly: boolean;
}) {
  return (
    <>
      <div style={{ padding: '18px 24px 0', fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      {items.length === 0 ? (
        <EmptyDocsState />
      ) : (
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 110px 110px 76px',
            padding: '8px 24px', borderBottom: '0.5px solid var(--sep)',
            fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
            background: '#fff', position: 'sticky', top: 0, zIndex: 1,
          }}>
            <span></span>
            <span>Title</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Amount</span>
            <span></span>
          </div>
          {items.map(it => (
            <DraggableItemRow
              key={it.id}
              item={it}
              selected={selectedId === it.id}
              onSelect={onSelect}
              onReassess={onReassess}
              onDelete={onDelete}
              reassessing={reassessingIds.has(it.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </>
  );
}

function DesktopDocumentGrid({
  activeFolderName,
  folders,
  cats,
  byCat,
  tab,
  tabItems,
  displayItems,
  unfiledItems,
  activeFolderId,
  selectedId,
  onSelect,
  onReassess,
  onDelete,
  reassessingIds,
  readOnly,
}: {
  activeFolderName?: string;
  folders: Folder[];
  cats: typeof CATEGORIES;
  byCat: Record<string, Item[]>;
  tab: string;
  tabItems: Item[];
  displayItems: Item[];
  unfiledItems: Item[];
  activeFolderId?: string | null;
  selectedId: string;
  onSelect: (id: string) => void;
  onReassess: (item: Item) => void;
  onDelete: (item: Item) => void;
  reassessingIds: Set<string>;
  readOnly: boolean;
}) {
  if (activeFolderId) {
    return (
      <DocumentGridSection
        title={activeFolderName ?? 'Folder'}
        count={displayItems.length}
        items={displayItems}
        selectedId={selectedId}
        onSelect={onSelect}
        onReassess={onReassess}
        onDelete={onDelete}
        reassessingIds={reassessingIds}
        readOnly={readOnly}
      />
    );
  }

  if (folders.length > 0) {
    return unfiledItems.length > 0 ? (
      <DocumentGridSection
        title="Unfiled"
        count={unfiledItems.length}
        items={unfiledItems}
        selectedId={selectedId}
        onSelect={onSelect}
        onReassess={onReassess}
        onDelete={onDelete}
        reassessingIds={reassessingIds}
        readOnly={readOnly}
      />
    ) : (
      <EmptyDocsState text="All matching items are filed into folders." />
    );
  }

  if (tab !== 'all') {
    return (
      <DocumentGridSection
        title={CATEGORIES.find(c => c.id === tab)?.name ?? 'Items'}
        count={tabItems.length}
        items={tabItems}
        selectedId={selectedId}
        onSelect={onSelect}
        onReassess={onReassess}
        onDelete={onDelete}
        reassessingIds={reassessingIds}
        readOnly={readOnly}
      />
    );
  }

  if (cats.length === 0) return <EmptyDocsState />;

  return (
    <div>
      {cats.map(category => (
        <DocumentGridSection
          key={category.id}
          title={category.name}
          count={(byCat[category.id] ?? []).length}
          items={byCat[category.id] ?? []}
          selectedId={selectedId}
          onSelect={onSelect}
          onReassess={onReassess}
          onDelete={onDelete}
          reassessingIds={reassessingIds}
          readOnly={readOnly}
          color={category.color}
          icon={category.icon}
        />
      ))}
    </div>
  );
}

function DocumentGridSection({
  title,
  count,
  items,
  selectedId,
  onSelect,
  onReassess,
  onDelete,
  reassessingIds,
  readOnly,
  color,
  icon,
}: {
  title: string;
  count: number;
  items: Item[];
  selectedId: string;
  onSelect: (id: string) => void;
  onReassess: (item: Item) => void;
  onDelete: (item: Item) => void;
  reassessingIds: Set<string>;
  readOnly: boolean;
  color?: string;
  icon?: string;
}) {
  return (
    <section style={{ padding: '18px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {icon && color && (
          <div style={{
            width: 24, height: 24, borderRadius: 6, background: color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {getIcon(icon, 13, '#fff')}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title} · {count}
        </div>
      </div>
      {items.length === 0 ? (
        <div style={{
          padding: '22px 16px',
          border: '1px dashed var(--sep)',
          borderRadius: 10,
          color: 'var(--muted)',
          fontSize: 13,
          background: '#FAF9F5',
        }}>
          No matching documents.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(172px, 1fr))',
          gap: 12,
          alignItems: 'stretch',
        }}>
          {items.map(item => (
            <DocumentGridCard
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              onSelect={onSelect}
              onReassess={onReassess}
              onDelete={onDelete}
              reassessing={reassessingIds.has(item.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyDocsState({ text = 'Nothing here for this period yet.' }: { text?: string }) {
  return (
    <div style={{
      margin: '18px 24px 0',
      padding: '34px 18px',
      borderRadius: 10,
      border: '1px dashed var(--sep)',
      background: '#FAF9F5',
      color: 'var(--muted)',
      fontSize: 13,
      textAlign: 'center',
    }}>
      {text}
    </div>
  );
}

function shortDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function ConfirmDeleteItem({
  title,
  hasDocument,
  deleting,
  onCancel,
  onConfirm,
}: {
  title: string;
  hasDocument: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 120,
      background: 'rgba(0,0,0,0.34)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 18,
    }}>
      <div onClick={event => event.stopPropagation()} style={{
        width: 'min(380px, 100%)',
        borderRadius: 14,
        background: '#fff',
        boxShadow: '0 24px 70px rgba(0,0,0,0.24)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 18px 12px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Delete this item?
          </div>
          <div style={{ marginTop: 7, fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>
            <span>{title}</span> will be removed from this entity.
            {hasDocument
              ? ' The source file, reminders, calendar items, search chunks, and linked bookkeeping entries will also be removed.'
              : ' This local item has no source document file.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 18px' }}>
          <button onClick={onCancel} disabled={deleting} style={{
            flex: 1,
            border: '0.5px solid var(--sep)',
            borderRadius: 9,
            background: '#fff',
            color: 'var(--ink)',
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 800,
            fontFamily: 'var(--font)',
            cursor: deleting ? 'default' : 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} style={{
            flex: 1,
            border: 0,
            borderRadius: 9,
            background: 'oklch(0.50 0.16 25)',
            color: '#fff',
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 800,
            fontFamily: 'var(--font)',
            cursor: deleting ? 'default' : 'pointer',
            opacity: deleting ? 0.65 : 1,
          }}>
            {deleting ? 'Deleting' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
