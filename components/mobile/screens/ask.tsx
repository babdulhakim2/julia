'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { fmtDate } from '@/lib/utils';
import { Ic } from '@/components/icons';
import { NavBar } from '@/components/ui/nav-bar';

interface AskViewProps {
  onOpenItem: (id: string) => void;
}

interface Message {
  from: 'user' | 'bot';
  text: string;
  kind?: string;
  items?: string[];
}

export function AskView({ onOpenItem }: AskViewProps) {
  const { state } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    { from: 'bot', kind: 'greet', text: "Morning Julia. Quiet day so far. What can I look up?" },
  ]);
  const [input, setInput] = useState('');

  const suggestions = [
    "What's due this week?",
    "When is the MOT for the Mercedes?",
    "Show me everything for Norbury",
    "Anything overdue?",
  ];

  function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { from: 'user', text };
    let reply: Message;
    const t = text.toLowerCase();
    if (t.includes('due') && (t.includes('week') || t.includes('soon'))) {
      reply = { from: 'bot', kind: 'list', text: "4 things this week, £547 total:", items: ['i1','i2','i5'] };
    } else if (t.includes('mot')) {
      reply = { from: 'bot', kind: 'card', text: "MOT for Mercedes LT21 ABC is due 12 June 2026. I'll remind you 14 days before — 29 May.", items: ['i4'] };
    } else if (t.includes('norbury') || t.includes('chinese') || t.includes('shop')) {
      reply = { from: 'bot', kind: 'list', text: "Everything for New Wok Norbury — 14 items, 2 open:", items: ['i3','i6'] };
    } else if (t.includes('overdue')) {
      reply = { from: 'bot', kind: 'list', text: "Just one — British Gas, 2 days late. Want me to draft an email asking for a payment plan?", items: ['i5'] };
    } else {
      reply = { from: 'bot', text: "Looking that up… I'll get back to you in a sec." };
    }
    setMessages(m => [...m, userMsg, reply]);
    setInput('');
  }

  const ent = Object.fromEntries(state.entities.map(e => [e.id, e]));
  const itm = Object.fromEntries(state.items.map(i => [i.id, i]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar large title="Ask" sub="Search anything across your stuff" />

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 140px',
        display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%', display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{
              padding: '10px 14px', borderRadius: 18,
              background: m.from === 'user' ? 'var(--accent)' : '#fff',
              color: m.from === 'user' ? '#fff' : 'var(--ink)',
              fontSize: 15, lineHeight: 1.4,
              borderBottomRightRadius: m.from === 'user' ? 4 : 18,
              borderBottomLeftRadius: m.from === 'user' ? 18 : 4,
            }}>
              {m.from === 'bot' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
                  fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {Ic.sparkle(11, 'var(--muted)')} Secretary
                </div>
              )}
              {m.text}
            </div>
            {m.items && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {m.items.map(id => {
                  const it = itm[id]; if (!it) return null;
                  const e = ent[it.entity || ''];
                  return (
                    <div key={id} onClick={() => onOpenItem(id)} style={{
                      background: '#fff', borderRadius: 12, padding: 12,
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      border: '0.5px solid var(--hair)',
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: e?.color }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{it.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                          {e?.name} · {fmtDate(it.dueDate)}
                        </div>
                      </div>
                      {it.amount && <div style={{ fontSize: 14, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>£{it.amount}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {messages.length === 1 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 4px 4px' }}>Try asking</div>
            {suggestions.map(s => (
              <button key={s} onClick={() => send(s)} style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: 12,
                background: '#fff', border: '0.5px solid var(--hair)',
                fontSize: 14, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font)',
              }}>{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* composer */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 84,
        padding: '8px 12px',
        background: 'linear-gradient(0deg, rgba(242,242,247,1) 50%, rgba(242,242,247,0))',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 6px 6px 14px',
          background: '#fff', borderRadius: 22,
          border: '0.5px solid var(--hair)',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask anything…"
            style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              fontSize: 15, fontFamily: 'var(--font)', color: 'var(--ink)', padding: '8px 0',
            }}
          />
          <button style={{
            width: 32, height: 32, borderRadius: 16, border: 0, cursor: 'pointer',
            background: 'transparent', color: 'var(--muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Ic.mic(20, 'var(--muted)')}</button>
          <button onClick={() => send(input)} style={{
            width: 32, height: 32, borderRadius: 16, border: 0, cursor: 'pointer',
            background: input ? 'var(--ink)' : 'var(--muted2)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Ic.arrowUp(16, '#fff')}</button>
        </div>
      </div>
    </div>
  );
}
