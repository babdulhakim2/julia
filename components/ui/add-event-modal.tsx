'use client';

import React, { useState } from 'react';
import type { CalendarEventDraft, Entity } from '@/lib/types';
import { Ic } from '@/components/icons';

interface AddEventModalProps {
  date: string;
  entities: Entity[];
  onAdd: (event: CalendarEventDraft) => void | Promise<void>;
  onClose: () => void;
}

export function AddEventModal({ date, entities, onAdd, onClose }: AddEventModalProps) {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(date);
  const [entityId, setEntityId] = useState<string | null>(entities[0]?.id || null);
  const [amount, setAmount] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedAmount = amount ? Number.parseFloat(amount) : undefined;
    void onAdd({
      title: title.trim(),
      date: eventDate,
      entityId,
      amount: Number.isFinite(parsedAmount) ? parsedAmount : undefined,
    });
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 380, background: '#fff', borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--sep)',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', flex: 1, fontFamily: 'var(--font-display)' }}>Add event</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 4 }}>{Ic.x(18, 'var(--muted)')}</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Pay council tax"
              autoFocus
              style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '0.5px solid var(--sep)', fontSize: 14, fontFamily: 'var(--font)', outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Date</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '0.5px solid var(--sep)', fontSize: 14, fontFamily: 'var(--font)', outline: 'none' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Amount (optional)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="£"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '0.5px solid var(--sep)', fontSize: 14, fontFamily: 'var(--font)', outline: 'none' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Entity</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {entities.map(ent => (
                <button key={ent.id} type="button" onClick={() => setEntityId(ent.id)} style={{
                  padding: '5px 10px', borderRadius: 6, border: 0, cursor: 'pointer',
                  background: entityId === ent.id ? ent.color : 'rgba(0,0,0,0.05)',
                  color: entityId === ent.id ? '#fff' : 'var(--ink)',
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
                }}>{ent.name}</button>
              ))}
            </div>
          </div>

          <button type="submit" style={{
            marginTop: 4, padding: '10px 0', borderRadius: 8, border: 0, cursor: 'pointer',
            background: 'var(--ink)', color: '#fff',
            fontSize: 14, fontWeight: 600, fontFamily: 'var(--font)',
          }}>Add event</button>
        </form>
      </div>
    </div>
  );
}
