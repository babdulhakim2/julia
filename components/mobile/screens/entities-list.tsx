'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { Ic } from '@/components/icons';
import { getIcon } from '@/components/icons';
import { NavBar } from '@/components/ui/nav-bar';
import { ListGroup } from '@/components/ui/list-group';
import { Row } from '@/components/ui/row';

interface EntitiesListProps {
  onOpenEntity: (id: string) => void;
  onOpenSearch: () => void;
  onOpenSettings?: () => void;
}

export function EntitiesList({ onOpenEntity, onOpenSearch, onOpenSettings }: EntitiesListProps) {
  const { state } = useStore();
  return (
    <div style={{ paddingBottom: 120 }}>
      <NavBar large title="Docs" sub="By entity" />
      <ListGroup>
        {state.entities.map((e, i) => (
          <div key={e.id} onClick={() => onOpenEntity(e.id)} style={{
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: i === state.entities.length - 1 ? 'none' : '0.5px solid var(--hair)',
            cursor: 'pointer',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: e.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getIcon(e.icon, 20, '#fff')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, color: 'var(--ink)', fontWeight: 500 }}>{e.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{e.sub}</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted2)' }}>{e.count} items</div>
            {Ic.chevron(13, 'rgba(60,60,67,0.3)')}
          </div>
        ))}
      </ListGroup>

      <ListGroup header="Other">
        <Row icon={Ic.search(18, 'var(--accent)')} iconBg="var(--accent-soft)" title="Search everything" sub="Docs, deadlines, uploads" chevron onClick={onOpenSearch} />
        <Row icon={Ic.dots(18, 'var(--accent)')} iconBg="var(--accent-soft)" title="Settings" sub="Profile, entities & preferences" chevron last onClick={onOpenSettings} />
      </ListGroup>
    </div>
  );
}
