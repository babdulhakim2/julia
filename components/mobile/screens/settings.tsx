'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { getIcon, Ic } from '@/components/icons';
import { NavBar } from '@/components/ui/nav-bar';
import { NavBtn } from '@/components/ui/nav-btn';
import { ListGroup } from '@/components/ui/list-group';
import { Row } from '@/components/ui/row';
import type { Entity } from '@/lib/types';

const ENTITY_TYPES = ['business', 'property', 'vehicle', 'personal'] as const;
const ENTITY_COLORS = [
  'oklch(0.62 0.13 28)', 'oklch(0.62 0.13 80)', 'oklch(0.62 0.10 200)',
  'oklch(0.55 0.10 250)', 'oklch(0.62 0.06 300)', 'oklch(0.55 0.14 150)',
];

interface MobileSettingsProps {
  onBack: () => void;
}

export function MobileSettings({ onBack }: MobileSettingsProps) {
  const { state, dispatch } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [sub, setSub] = useState('');
  const [type, setType] = useState<typeof ENTITY_TYPES[number]>('business');

  function handleAdd() {
    if (!name.trim()) return;
    const entity: Entity = {
      id: `e-${Date.now()}`,
      name: name.trim(),
      type,
      sub: sub.trim(),
      icon: type === 'business' ? 'building' : type === 'property' ? 'home' : type === 'vehicle' ? 'car' : 'user',
      color: ENTITY_COLORS[state.entities.length % ENTITY_COLORS.length],
      count: 0,
      info: {},
    };
    dispatch({ type: 'ADD_ENTITY', entity });
    setName('');
    setSub('');
    setAdding(false);
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
          <div style={{
            width: 50, height: 50, borderRadius: 99, background: 'oklch(0.85 0.04 50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: 'var(--ink2)',
          }}>JC</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>Julia Chen</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>julia@inbox.secretary.app</div>
          </div>
        </div>
      </div>

      {/* Entities */}
      <ListGroup header={`Entities · ${state.entities.length}`}>
        {state.entities.map((e, i) => (
          <div key={e.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderBottom: i === state.entities.length - 1 && !adding ? 'none' : '0.5px solid var(--hair)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: e.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{getIcon(e.icon, 16, '#fff')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{e.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{e.sub}</div>
            </div>
            <button onClick={() => dispatch({ type: 'REMOVE_ENTITY', id: e.id })} style={{
              background: 'transparent', border: 0, cursor: 'pointer',
              fontSize: 13, color: 'oklch(0.55 0.20 25)', fontWeight: 500, fontFamily: 'var(--font)',
            }}>Remove</button>
          </div>
        ))}
        {adding ? (
          <div style={{ padding: 14 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Entity name"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--sep)', fontSize: 15, fontFamily: 'var(--font)', outline: 'none', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select value={type} onChange={e => setType(e.target.value as typeof ENTITY_TYPES[number])}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--sep)', fontSize: 14, fontFamily: 'var(--font)', background: '#fff' }}>
                {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={sub} onChange={e => setSub(e.target.value)} placeholder="Description"
                style={{ flex: 2, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--sep)', fontSize: 15, fontFamily: 'var(--font)', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAdding(false)} style={{
                flex: 1, padding: '9px 0', borderRadius: 8, border: '0.5px solid var(--sep)',
                background: '#fff', color: 'var(--ink)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              }}>Cancel</button>
              <button onClick={handleAdd} style={{
                flex: 1, padding: '9px 0', borderRadius: 8, border: 0,
                background: 'var(--ink)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              }}>Add</button>
            </div>
          </div>
        ) : (
          <div onClick={() => setAdding(true)} style={{
            padding: '12px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            color: 'var(--accent)', fontSize: 15, fontWeight: 500,
          }}>
            {Ic.plus(16, 'var(--accent)', 2.4)} Add entity
          </div>
        )}
      </ListGroup>

      {/* Preferences */}
      <ListGroup header="Preferences">
        <ToggleRow label="Push notifications" sub="Due dates & new captures" defaultOn />
        <ToggleRow label="Dark mode" sub="Follow system setting" last />
      </ListGroup>
    </div>
  );
}

function ToggleRow({ label, sub, defaultOn = false, last = false }: { label: string; sub: string; defaultOn?: boolean; last?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      borderBottom: last ? 'none' : '0.5px solid var(--hair)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>
      </div>
      <button onClick={() => setOn(!on)} style={{
        width: 51, height: 31, borderRadius: 16, border: 0, cursor: 'pointer',
        background: on ? 'oklch(0.60 0.17 145)' : 'rgba(120,120,128,0.16)',
        position: 'relative', transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: on ? 23 : 3,
          width: 25, height: 25, borderRadius: 99, background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}
