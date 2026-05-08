'use client';

import React, { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Ic, getIcon } from '@/components/icons';
import { DocumentThumb } from '@/components/shared/document-thumb';
import { DocumentPreviewModal } from '@/components/shared/document-preview-modal';
import type { Entity, Folder, Item } from '@/lib/types';

interface EntitiesListProps {
  onOpenEntity: (id: string) => void;
  onOpenSearch: () => void;
  onOpenSettings?: () => void;
}

export function EntitiesList({ onOpenEntity, onOpenSearch, onOpenSettings }: EntitiesListProps) {
  const { state } = useStore();
  const [entityFilter, setEntityFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);

  const filteredEntities = useMemo(() => state.entities.filter(entity => {
    if (entityFilter !== 'all' && entity.id !== entityFilter) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return entity.name.toLowerCase().includes(needle) || entity.sub.toLowerCase().includes(needle);
  }), [entityFilter, query, state.entities]);

  const filteredItems = useMemo(() => state.items.filter(item => {
    if (entityFilter !== 'all' && item.entity !== entityFilter) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return (
      item.title.toLowerCase().includes(needle) ||
      item.type.toLowerCase().includes(needle) ||
      (item.issuer ?? '').toLowerCase().includes(needle)
    );
  }), [entityFilter, query, state.items]);

  const visibleFolders = entityFilter === 'all'
    ? filteredEntities.map(entityToFolderTile)
    : state.folders
        .filter(folder => folder.entityId === entityFilter && folder.name.toLowerCase().includes(query.trim().toLowerCase()))
        .map(folder => folderToTile(folder, state.items));

  const recentDocs = filteredItems
    .slice()
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, entityFilter === 'all' ? 12 : 30);

  return (
    <div style={{ minHeight: '100%', paddingBottom: 120, background: '#fff' }}>
      <div style={{ padding: '18px 16px 10px', background: '#F7F8FA', borderBottom: '0.5px solid var(--sep)' }}>
        <div style={{
          height: 52, borderRadius: 26, background: '#E9EEF6',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 60px 0 12px', color: 'var(--muted)',
        }}>
          <button onClick={onOpenSettings} aria-label="Settings" style={{
            border: 0, background: 'transparent', padding: 4, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {Ic.dots(22, 'var(--ink2)')}
          </button>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') onOpenSearch(); }}
            placeholder="Search in Docs"
            style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              fontSize: 17, color: 'var(--ink)', fontFamily: 'var(--font)',
            }}
          />
        </div>

        <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingTop: 14 }}>
          <FilterChip label="All docs" active={entityFilter === 'all'} onClick={() => setEntityFilter('all')} />
          {state.entities.map(entity => (
            <FilterChip key={entity.id} label={entity.name} active={entityFilter === entity.id} color={entity.color} onClick={() => setEntityFilter(entity.id)} />
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 600 }}>Name</div>
        <button onClick={() => setQuery('')} style={{
          width: 34, height: 34, borderRadius: 17, border: 0,
          background: '#EAF1FF', color: 'var(--accent)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Ic.arrowUp(18, 'var(--accent)')}</button>
      </div>

      {visibleFolders.length > 0 && (
        <GridSection>
          {visibleFolders.map(tile => (
            <FolderTile
              key={tile.id}
              title={tile.name}
              subtitle={tile.subtitle}
              color={tile.color}
              icon={tile.icon}
              onClick={() => onOpenEntity(tile.entityId)}
            />
          ))}
        </GridSection>
      )}

      {recentDocs.length > 0 && (
        <>
          {visibleFolders.length > 0 && (
            <div style={{ padding: '10px 16px 2px', fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Documents
            </div>
          )}
          <GridSection>
            {recentDocs.map(item => (
              <DocumentTile
                key={item.id}
                item={item}
                entity={state.entities.find(entity => entity.id === item.entity)}
                onClick={() => item.convexDocumentId ? setPreviewDocumentId(item.convexDocumentId) : undefined}
              />
            ))}
          </GridSection>
        </>
      )}

      {visibleFolders.length === 0 && recentDocs.length === 0 && (
        <div style={{ padding: '54px 28px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          No matching documents yet.
        </div>
      )}

      {previewDocumentId && (
        <DocumentPreviewModal
          documentId={previewDocumentId}
          onClose={() => setPreviewDocumentId(null)}
        />
      )}
    </div>
  );
}

function GridSection({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '20px 18px',
      padding: '12px 16px 12px',
    }}>
      {children}
    </div>
  );
}

function FilterChip({ label, active, color, onClick }: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      border: `1px solid ${active ? 'var(--accent)' : 'var(--sep)'}`,
      background: active ? '#EAF1FF' : '#fff',
      color: active ? 'var(--accent)' : 'var(--ink2)',
      borderRadius: 999, padding: '7px 11px',
      fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)',
      whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
    }}>
      {color && <span style={{ width: 8, height: 8, borderRadius: 99, background: color }} />}
      {label}
    </button>
  );
}

function FolderTile({ title, subtitle, color, icon, onClick }: {
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      minWidth: 0, border: 0, background: 'transparent', padding: 0,
      textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 42 }}>
        <div style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.25,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
          {title}
        </div>
        {Ic.dots(18, 'var(--muted)')}
      </div>
      <div style={{
        height: 108, borderRadius: 10, background: '#F6F7F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 8,
      }}>
        <FolderIcon color={color} icon={icon} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {subtitle}
      </div>
    </button>
  );
}

function DocumentTile({ item, entity, onClick }: {
  item: Item;
  entity?: Entity;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      minWidth: 0, border: 0, background: 'transparent', padding: 0,
      textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 42 }}>
        <div style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.25,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
          {item.title}
        </div>
        {Ic.dots(18, 'var(--muted)')}
      </div>
      <div style={{
        height: 108, borderRadius: 10, background: '#F6F7F9',
        overflow: 'hidden', marginTop: 8,
      }}>
        <DocumentThumb documentId={item.convexDocumentId} fallbackKind={item.preview || 'other'} height={108} title={item.title} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entity?.name ?? 'Unassigned'} · {item.type}
      </div>
    </button>
  );
}

function FolderIcon({ color, icon }: { color: string; icon: string }) {
  return (
    <div style={{ position: 'relative', width: 64, height: 48 }}>
      <div style={{
        position: 'absolute', left: 4, top: 4, width: 26, height: 12,
        borderTopLeftRadius: 6, borderTopRightRadius: 6,
        background: color,
        filter: 'brightness(1.05)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 38,
        borderRadius: 8, background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {getIcon(icon, 22, '#fff')}
      </div>
    </div>
  );
}

function entityToFolderTile(entity: Entity) {
  return {
    id: entity.id,
    entityId: entity.id,
    name: entity.name,
    subtitle: entity.sub || entity.type,
    color: entity.color,
    icon: entity.icon,
  };
}

function folderToTile(folder: Folder, items: Item[]) {
  const count = items.filter(item => item.folderId === folder.id).length;
  return {
    id: folder.id,
    entityId: folder.entityId,
    name: folder.name,
    subtitle: `${count} document${count === 1 ? '' : 's'}`,
    color: folder.color || '#6A6F75',
    icon: 'doc',
  };
}
