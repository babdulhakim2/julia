'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { getIcon } from '@/components/icons';
import { Ic } from '@/components/icons';
import type { Entity } from '@/lib/types';

const ENTITY_TYPES = ['business', 'property', 'vehicle', 'personal'] as const;
const ENTITY_COLORS = [
  'oklch(0.62 0.13 28)', 'oklch(0.62 0.13 80)', 'oklch(0.62 0.10 200)',
  'oklch(0.55 0.10 250)', 'oklch(0.62 0.06 300)', 'oklch(0.55 0.14 150)',
];
const ENTITY_ICONS = ['building', 'home', 'car', 'user', 'doc', 'bookmark'];

export function DesktopSettings() {
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
    <div style={{ padding: '20px 24px 40px', maxWidth: 600 }}>
      {/* Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 99, background: 'oklch(0.85 0.04 50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: 'var(--ink2)',
        }}>JC</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Julia Chen</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>julia@inbox.secretary.app</div>
        </div>
      </div>

      {/* Entities */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Entities</div>
          <button onClick={() => setAdding(!adding)} style={{
            background: 'transparent', border: 0, cursor: 'pointer',
            fontSize: 12, color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font)',
          }}>{adding ? 'Cancel' : '+ Add entity'}</button>
        </div>

        {adding && (
          <div style={{
            background: '#FAF9F5', borderRadius: 10, padding: 14, marginBottom: 12,
            border: '0.5px solid var(--sep)',
          }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Entity name"
                style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '0.5px solid var(--sep)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
              <select value={type} onChange={e => setType(e.target.value as typeof ENTITY_TYPES[number])}
                style={{ padding: '7px 10px', borderRadius: 7, border: '0.5px solid var(--sep)', fontSize: 13, fontFamily: 'var(--font)', background: '#fff' }}>
                {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={sub} onChange={e => setSub(e.target.value)} placeholder="Description (optional)"
                style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '0.5px solid var(--sep)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
              <button onClick={handleAdd} style={{
                padding: '7px 14px', borderRadius: 7, background: 'var(--ink)', color: '#fff',
                border: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
              }}>Add</button>
            </div>
          </div>
        )}

        <div style={{ background: '#FAF9F5', borderRadius: 10, border: '0.5px solid var(--sep)', overflow: 'hidden' }}>
          {state.entities.map((e, i) => (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              borderBottom: i === state.entities.length - 1 ? 'none' : '0.5px solid var(--hair)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, background: e.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{getIcon(e.icon, 14, '#fff')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{e.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{e.sub}</div>
              </div>
              <button onClick={() => dispatch({ type: 'REMOVE_ENTITY', id: e.id })} style={{
                background: 'transparent', border: 0, cursor: 'pointer', padding: 4,
                fontSize: 12, color: 'oklch(0.55 0.20 25)', fontWeight: 500, fontFamily: 'var(--font)',
              }}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Preferences</div>
        <div style={{ background: '#FAF9F5', borderRadius: 10, border: '0.5px solid var(--sep)', overflow: 'hidden' }}>
          <ToggleRow label="Push notifications" sub="Due dates & new captures" defaultOn />
          <ToggleRow label="Dark mode" sub="Follow system setting" last />
        </div>
      </div>
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
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{sub}</div>
      </div>
      <button onClick={() => setOn(!on)} style={{
        width: 44, height: 26, borderRadius: 13, border: 0, cursor: 'pointer',
        background: on ? 'var(--accent)' : 'rgba(120,120,128,0.2)',
        position: 'relative', transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: on ? 21 : 3,
          width: 20, height: 20, borderRadius: 10, background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}
