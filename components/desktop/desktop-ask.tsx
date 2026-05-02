'use client';

import React, { useState } from 'react';
import { Ic } from '@/components/icons';

export function DesktopAsk() {
  const [q, setQ] = useState('');
  const [history, setHistory] = useState([
    { q: "What's due this week?", a: 'Three things: parking ticket (Mercedes) £65 by 14 May, council tax (Plaistow flat) £214 by 28 May, business rates (Norbury) £412 by 31 May.' },
  ]);
  const suggestions = [
    "What's due this week?",
    'MOT for the Mercedes?',
    'Everything for Norbury this month',
    'Anything overdue?',
    'Total spent on rates this year',
  ];

  function ask(text?: string) {
    const t = text || q;
    if (!t.trim()) return;
    setHistory(h => [...h, { q: t, a: 'Looking…' }]);
    setQ('');
  }

  return (
    <div style={{ padding: '14px 24px 30px', maxWidth: 760 }}>
      {history.map((h, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>You asked</div>
          <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500, marginBottom: 10 }}>{h.q}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Secretary</div>
          <div style={{
            background: '#FAF9F5', border: '0.5px solid var(--sep)', borderRadius: 10, padding: 14,
            fontSize: 14, color: 'var(--ink)', lineHeight: 1.5,
          }}>{h.a}</div>
        </div>
      ))}

      {/* Composer */}
      <div style={{
        marginTop: 12, padding: 12, background: '#fff', border: '0.5px solid var(--sep)', borderRadius: 12,
      }}>
        <textarea value={q} onChange={e => setQ(e.target.value)} placeholder="Ask about anything you've filed…"
          rows={2}
          style={{ width: '100%', border: 0, outline: 0, resize: 'none', fontSize: 14, fontFamily: 'var(--font)', color: 'var(--ink)', background: 'transparent' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => ask(s)} style={{
              padding: '4px 10px', borderRadius: 99,
              background: 'rgba(0,0,0,0.04)', border: 0, cursor: 'pointer',
              fontSize: 12, color: 'var(--ink2)', fontFamily: 'var(--font)',
            }}>{s}</button>
          ))}
          <div style={{ flex: 1 }}></div>
          <button onClick={() => ask()} style={{
            padding: '5px 14px', borderRadius: 7,
            background: 'var(--accent)', color: '#fff', border: 0, cursor: 'pointer',
            fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
          }}>Ask ↵</button>
        </div>
      </div>
    </div>
  );
}
