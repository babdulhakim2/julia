'use client';

import React from 'react';
import { Btn } from '@/components/ui/button';

const TYPE_PRESETS: Record<string, { icon: string; color: string; subPlaceholder: string }> = {
  business: { icon: 'building', color: 'oklch(0.62 0.13 28)', subPlaceholder: 'Restaurant · 47 Norbury Rd' },
  property: { icon: 'home',     color: 'oklch(0.62 0.10 200)', subPlaceholder: 'Buy-to-let · E13 0AA' },
  vehicle:  { icon: 'car',      color: 'oklch(0.55 0.10 250)', subPlaceholder: 'E-Class · diesel' },
  personal: { icon: 'user',     color: 'oklch(0.62 0.06 300)', subPlaceholder: 'You & family' },
};

export { TYPE_PRESETS };

interface AddEntityFormProps {
  value: { type: string; name: string; sub: string; info: Record<string, string> };
  onChange: (v: any) => void;
  onCancel: () => void;
  onCommit: () => void;
}

export function AddEntityForm({ value, onChange, onCancel, onCommit }: AddEntityFormProps) {
  const types = [
    { id: 'business', label: 'Business' },
    { id: 'property', label: 'Property' },
    { id: 'vehicle',  label: 'Vehicle' },
    { id: 'personal', label: 'Personal' },
  ];
  const isBiz = value.type === 'business';
  const isVeh = value.type === 'vehicle';
  const isProp = value.type === 'property';

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px', borderRadius: 8,
    border: '0.5px solid var(--sep)', background: '#fff',
    fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--font)', outline: 'none',
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 };
  const setField = (k: string, v: string) => onChange({ ...value, [k]: v });
  const setInfo = (k: string, v: string) => onChange({ ...value, info: { ...(value.info || {}), [k]: v } });

  return (
    <div style={{
      marginTop: 10, background: '#fff', borderRadius: 12, padding: 14,
      border: '0.5px solid var(--sep)',
    }}>
      <div style={{ ...labelStyle }}>Type</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {types.map(t => {
          const active = value.type === t.id;
          return (
            <button key={t.id} onClick={() => setField('type', t.id)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 8,
                border: `0.5px solid ${active ? 'var(--accent)' : 'var(--sep)'}`,
                background: active ? 'var(--accent-soft)' : '#fff',
                color: active ? 'var(--accent)' : 'var(--ink2)',
                fontSize: 12, fontWeight: 500, fontFamily: 'var(--font)', cursor: 'pointer',
              }}>{t.label}</button>
          );
        })}
      </div>

      <div style={{ ...labelStyle }}>Name</div>
      <input style={{ ...inputStyle, marginBottom: 10 }} placeholder={
          isBiz ? "e.g. New Wok · Norbury" :
          isProp ? "e.g. 12 Plaistow Rd, Flat 2" :
          isVeh ? "e.g. Mercedes LT21 ABC" : "e.g. You & family"
        } value={value.name} onChange={e => setField('name', e.target.value)} autoFocus />

      <div style={{ ...labelStyle }}>Subtitle (optional)</div>
      <input style={{ ...inputStyle, marginBottom: 10 }} placeholder={TYPE_PRESETS[value.type].subPlaceholder}
        value={value.sub} onChange={e => setField('sub', e.target.value)} />

      {isBiz && (
        <>
          <div style={{ ...labelStyle }}>Companies House #</div>
          <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="e.g. 12345678"
            value={value.info?.companyNo || ''} onChange={e => setInfo('companyNo', e.target.value)} />
          <div style={{ ...labelStyle }}>VAT number (optional)</div>
          <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="GB 123 4567 89"
            value={value.info?.vat || ''} onChange={e => setInfo('vat', e.target.value)} />
        </>
      )}
      {isVeh && (
        <>
          <div style={{ ...labelStyle }}>Make / model</div>
          <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="Mercedes E-Class"
            value={value.info?.makeModel || ''} onChange={e => setInfo('makeModel', e.target.value)} />
        </>
      )}
      {isProp && (
        <>
          <div style={{ ...labelStyle }}>Postcode</div>
          <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="E13 0AA"
            value={value.info?.postcode || ''} onChange={e => setInfo('postcode', e.target.value)} />
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Btn variant="secondary" size="md" style={{ flex: 1 }} onClick={onCancel}>Cancel</Btn>
        <Btn variant="dark" size="md" style={{ flex: 2 }} onClick={onCommit} disabled={!value.name?.trim()}>Add</Btn>
      </div>
    </div>
  );
}
