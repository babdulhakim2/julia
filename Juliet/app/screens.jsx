// Entity detail, calendar, contacts, ask, search, item detail, onboarding.

const { T: T3, StatusPill: SP3, ListGroup: LG3, Row: R3, Btn: B3, NavBar: NB3, NavBtn: NBn3,
  EntityChip: EC3, DocPreview: DP3 } = window.UI;

// ─────────────────────────────────────────────────────────────
// Entity detail
// ─────────────────────────────────────────────────────────────
function EntityDetail({ entityId, onBack, onOpenItem }) {
  const e = window.SEC_DATA.ENTITIES.find(x => x.id === entityId);
  const items = window.SEC_DATA.ITEMS.filter(i => i.entity === entityId);
  const open = items.filter(i => i.status !== 'done');
  const paid = items.filter(i => i.status === 'done');
  const totalDue = open.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div style={{ paddingBottom: 120 }}>
      <NB3
        leading={<NBn3 onClick={onBack}>{Ic.back(20, T3.accent)} Files</NBn3>}
        trailing={<NBn3>{Ic.bookmark(20, T3.accent)}</NBn3>}
      />
      {/* Hero */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{
          background: T3.bgCard, borderRadius: 16, padding: 18,
          border: `0.5px solid ${T3.hair}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: e.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              {Ic[e.icon](22, '#fff')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: T3.ink, letterSpacing: -0.3, fontFamily: T3.fontDisplay }}>{e.name}</div>
              <div style={{ fontSize: 13, color: T3.muted, marginTop: 2 }}>{e.sub}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 14, borderTop: `0.5px solid ${T3.hair}` }}>
            <Stat label="Open" value={open.length} />
            <Stat label="Due" value={`£${totalDue}`} />
            <Stat label="Paid YTD" value="£8.4k" />
          </div>
        </div>
      </div>

      {/* Open items */}
      <LG3 header={`Open · ${open.length}`}>
        {open.map((it, i) => (
          <div key={it.id} onClick={() => onOpenItem(it.id)} style={{
            padding: '12px 14px', cursor: 'pointer',
            borderBottom: i === open.length - 1 ? 'none' : `0.5px solid ${T3.hair}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 36, height: 46, flexShrink: 0 }}>
              <DP3 kind={it.preview || 'lambeth'} height={46} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SP3 status={it.status} />
                <span style={{ fontSize: 11, color: T3.muted2 }}>{it.type}</span>
              </div>
              <div style={{ fontSize: 14, color: T3.ink, marginTop: 4, lineHeight: 1.3, fontWeight: 500 }}>{it.title}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {it.amount && <div style={{ fontSize: 15, color: T3.ink, fontVariantNumeric: 'tabular-nums' }}>£{it.amount}</div>}
              <div style={{ fontSize: 11, color: T3.muted }}>{window.fmtDate(it.dueDate)}</div>
            </div>
          </div>
        ))}
      </LG3>

      {/* Paid */}
      {paid.length > 0 && (
        <LG3 header="Paid">
          {paid.map((it, i) => (
            <R3 key={it.id} onClick={() => onOpenItem(it.id)}
              last={i === paid.length - 1}
              icon={Ic.check(16, 'oklch(0.55 0.14 150)', 2.5)} iconBg="oklch(0.95 0.04 150)"
              title={it.title} sub={`Paid ${window.fmtDate(it.paidAt)}`}
              value={it.amount ? `£${it.amount}` : null} />
          ))}
        </LG3>
      )}

      {/* Documents */}
      <LG3 header="Information on file">
        <R3 icon={Ic.doc(16, T3.muted)} iconBg={T3.bg} title="Registration · 11 24 56 78" sub="Companies House" chevron onClick={() => {}} />
        <R3 icon={Ic.doc(16, T3.muted)} iconBg={T3.bg} title="VAT · GB 392 110 04" sub="Tax" chevron onClick={() => {}} />
        <R3 icon={Ic.doc(16, T3.muted)} iconBg={T3.bg} title="Premises licence" sub="Renews 14 Aug 2026" chevron last onClick={() => {}} />
      </LG3>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: T3.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: T3.ink, marginTop: 2, letterSpacing: -0.3, fontFamily: T3.fontDisplay }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Entities list
// ─────────────────────────────────────────────────────────────
function EntitiesList({ onOpenEntity }) {
  return (
    <div style={{ paddingBottom: 120 }}>
      <NB3 large title="Files" sub="By entity"
        trailing={<NBn3 primary>{Ic.plus(22, T3.accent, 2.4)}</NBn3>} />
      <LG3>
        {window.SEC_DATA.ENTITIES.map((e, i) => (
          <div key={e.id} onClick={() => onOpenEntity(e.id)} style={{
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: i === window.SEC_DATA.ENTITIES.length - 1 ? 'none' : `0.5px solid ${T3.hair}`,
            cursor: 'pointer',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: e.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {Ic[e.icon](20, '#fff')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, color: T3.ink, fontWeight: 500 }}>{e.name}</div>
              <div style={{ fontSize: 12, color: T3.muted, marginTop: 1 }}>{e.sub}</div>
            </div>
            <div style={{ fontSize: 13, color: T3.muted2 }}>{e.count} items</div>
            {Ic.chevron(13, 'rgba(60,60,67,0.3)')}
          </div>
        ))}
      </LG3>

      <LG3 header="Other">
        <R3 icon={Ic.contacts(18, T3.accent)} iconBg={T3.accentSoft} title="Contacts" sub="Phonebook & customers" chevron onClick={() => window.dispatchEvent(new CustomEvent('navContacts'))} />
        <R3 icon={Ic.search(18, T3.accent)} iconBg={T3.accentSoft} title="Search everything" sub="Bills, letters, voice notes" chevron last onClick={() => window.dispatchEvent(new CustomEvent('navSearch'))} />
      </LG3>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Calendar
// ─────────────────────────────────────────────────────────────
function CalendarView({ onOpenItem }) {
  const month = 'May 2026';
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const firstDow = 5; // May 1 2026 is a Friday
  const itemsByDay = {
    9: ['gas'], 14: ['pcn'], 28: ['lambeth'],
  };
  const colorFor = (k) => ({ gas: 'oklch(0.55 0.20 25)', pcn: 'oklch(0.62 0.14 60)', lambeth: 'oklch(0.55 0.10 240)' }[k]);
  const today = 2;

  const upcoming = window.SEC_DATA.ITEMS.filter(i => i.dueDate && i.status !== 'done').slice(0, 5);
  const ent = Object.fromEntries(window.SEC_DATA.ENTITIES.map(e => [e.id, e]));

  return (
    <div style={{ paddingBottom: 120 }}>
      <NB3 large title="Calendar" sub="May 2026 · 4 due"
        trailing={<NBn3>{Ic.calendarPlus(22, T3.accent)}</NBn3>} />

      <div style={{ padding: '0 16px' }}>
        <div style={{ background: T3.bgCard, borderRadius: 16, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, padding: '0 4px' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: T3.ink }}>{month}</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer' }}>
                {Ic.chevron(15, T3.accent, 'left')}
              </button>
              <button style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer' }}>
                {Ic.chevron(15, T3.accent, 'right')}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0,
            fontSize: 11, color: T3.muted, fontWeight: 500, padding: '0 0 6px' }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDow - 1 }).map((_, i) => <div key={'b' + i} />)}
            {days.map(d => {
              const has = itemsByDay[d];
              const isToday = d === today;
              return (
                <div key={d} style={{
                  aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', position: 'relative',
                  borderRadius: 8,
                  background: isToday ? T3.ink : 'transparent',
                  color: isToday ? '#fff' : T3.ink,
                  fontSize: 14, fontWeight: isToday ? 600 : 400,
                  cursor: 'pointer',
                }}>
                  {d}
                  {has && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 2, position: 'absolute', bottom: 4 }}>
                      {has.map((k, i) => (
                        <span key={i} style={{ width: 4, height: 4, borderRadius: 99, background: colorFor(k) }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <LG3 header="What's coming">
        {upcoming.map((it, i) => {
          const e = ent[it.entity];
          return (
            <div key={it.id} onClick={() => onOpenItem(it.id)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
              borderBottom: i === upcoming.length - 1 ? 'none' : `0.5px solid ${T3.hair}`,
              cursor: 'pointer',
            }}>
              <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: T3.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {new Date(it.dueDate).toLocaleDateString('en-GB', { month: 'short' })}
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, color: T3.ink, lineHeight: 1, fontFamily: T3.fontDisplay }}>
                  {new Date(it.dueDate).getDate()}
                </div>
              </div>
              <div style={{ width: 3, height: 36, borderRadius: 99, background: e?.color }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: T3.ink, fontWeight: 500 }}>{it.title}</div>
                <div style={{ fontSize: 12, color: T3.muted, marginTop: 2 }}>{e?.name} · {it.amount ? `£${it.amount}` : it.type}</div>
              </div>
              <SP3 status={it.status} />
            </div>
          );
        })}
      </LG3>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Ask (conversational)
// ─────────────────────────────────────────────────────────────
function AskView({ onOpenItem }) {
  const [messages, setMessages] = React.useState([
    { from: 'bot', kind: 'greet', text: "Morning Julia. Quiet day so far. What can I look up?" },
  ]);
  const [input, setInput] = React.useState('');

  const suggestions = [
    "What's due this week?",
    "When is the MOT for the Mercedes?",
    "Show me everything for Norbury",
    "Anything overdue?",
  ];

  function send(text) {
    if (!text.trim()) return;
    const userMsg = { from: 'user', text };
    let reply;
    const t = text.toLowerCase();
    if (t.includes('due') && (t.includes('week') || t.includes('soon'))) {
      reply = { from: 'bot', kind: 'list', text: "4 things this week, £547 total:",
        items: ['i1','i2','i5'] };
    } else if (t.includes('mot')) {
      reply = { from: 'bot', kind: 'card', text: "MOT for Mercedes LT21 ABC is due 12 June 2026. I'll remind you 14 days before — 29 May.",
        items: ['i4'] };
    } else if (t.includes('norbury') || t.includes('chinese') || t.includes('shop')) {
      reply = { from: 'bot', kind: 'list', text: "Everything for New Wok Norbury — 14 items, 2 open:",
        items: ['i3','i6'] };
    } else if (t.includes('overdue')) {
      reply = { from: 'bot', kind: 'list', text: "Just one — British Gas, 2 days late. Want me to draft an email asking for a payment plan?",
        items: ['i5'] };
    } else {
      reply = { from: 'bot', text: "Looking that up… I'll get back to you in a sec." };
    }
    setMessages(m => [...m, userMsg, reply]);
    setInput('');
  }

  const ent = Object.fromEntries(window.SEC_DATA.ENTITIES.map(e => [e.id, e]));
  const itm = Object.fromEntries(window.SEC_DATA.ITEMS.map(i => [i.id, i]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NB3 large title="Ask" sub="Search anything across your stuff" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 140px',
        display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%', display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{
              padding: '10px 14px', borderRadius: 18,
              background: m.from === 'user' ? T3.accent : T3.bgCard,
              color: m.from === 'user' ? '#fff' : T3.ink,
              fontSize: 15, lineHeight: 1.4,
              borderBottomRightRadius: m.from === 'user' ? 4 : 18,
              borderBottomLeftRadius: m.from === 'user' ? 18 : 4,
            }}>
              {m.from === 'bot' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
                  fontSize: 11, color: T3.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {Ic.sparkle(11, T3.muted)} Secretary
                </div>
              )}
              {m.text}
            </div>
            {m.items && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {m.items.map(id => {
                  const it = itm[id]; if (!it) return null;
                  const e = ent[it.entity];
                  return (
                    <div key={id} onClick={() => onOpenItem(id)} style={{
                      background: T3.bgCard, borderRadius: 12, padding: 12,
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      border: `0.5px solid ${T3.hair}`,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: e?.color }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: T3.ink, fontWeight: 500 }}>{it.title}</div>
                        <div style={{ fontSize: 12, color: T3.muted, marginTop: 1 }}>
                          {e?.name} · {window.fmtDate(it.dueDate)}
                        </div>
                      </div>
                      {it.amount && <div style={{ fontSize: 14, color: T3.ink, fontVariantNumeric: 'tabular-nums' }}>£{it.amount}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {messages.length === 1 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: T3.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 4px 4px' }}>Try asking</div>
            {suggestions.map(s => (
              <button key={s} onClick={() => send(s)} style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: 12,
                background: T3.bgCard, border: `0.5px solid ${T3.hair}`,
                fontSize: 14, color: T3.ink, cursor: 'pointer', fontFamily: T3.font,
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
          background: T3.bgCard, borderRadius: 22,
          border: `0.5px solid ${T3.hair}`,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask anything…"
            style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              fontSize: 15, fontFamily: T3.font, color: T3.ink, padding: '8px 0',
            }}
          />
          <button style={{
            width: 32, height: 32, borderRadius: 16, border: 0, cursor: 'pointer',
            background: 'transparent', color: T3.muted,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Ic.mic(20, T3.muted)}</button>
          <button onClick={() => send(input)} style={{
            width: 32, height: 32, borderRadius: 16, border: 0, cursor: 'pointer',
            background: input ? T3.ink : T3.muted2, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Ic.arrowUp(16, '#fff')}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Item detail
// ─────────────────────────────────────────────────────────────
function ItemDetail({ itemId, onBack }) {
  const it = window.SEC_DATA.ITEMS.find(i => i.id === itemId);
  const e = window.SEC_DATA.ENTITIES.find(x => x.id === it?.entity);
  if (!it) return null;

  const fields = [
    it.amount && { k: 'Amount', v: `£${it.amount}${it.fullAmount ? ` (£${it.fullAmount} after)` : ''}` },
    it.dueDate && { k: 'Due', v: new Date(it.dueDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) },
    it.issuer && { k: 'From', v: it.issuer },
    it.ref && { k: 'Reference', v: it.ref },
    e && { k: 'Filed under', v: e.name },
    { k: 'Captured', v: it.capturedAt },
  ].filter(Boolean);

  return (
    <div style={{ paddingBottom: 120 }}>
      <NB3
        leading={<NBn3 onClick={onBack}>{Ic.back(20, T3.accent)} Back</NBn3>}
        trailing={<NBn3>{Ic.edit(20, T3.accent)}</NBn3>}
      />

      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <SP3 status={it.status} size="md" />
          <span style={{ fontSize: 12, color: T3.muted2 }}>{Math.round(it.confidence * 100)}% confident · human reviewed</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, color: T3.ink, letterSpacing: -0.3, lineHeight: 1.2, fontFamily: T3.fontDisplay }}>{it.title}</div>
        <div style={{ fontSize: 13, color: T3.muted, marginTop: 4 }}>{it.type} · {e?.name}</div>

        <div style={{ marginTop: 14 }}>
          <DP3 kind={it.preview || 'lambeth'} height={220} />
        </div>
      </div>

      <LG3 header="Details">
        {fields.map((f, i) => (
          <div key={f.k} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '12px 14px',
            borderBottom: i === fields.length - 1 ? 'none' : `0.5px solid ${T3.hair}`,
          }}>
            <span style={{ fontSize: 13, color: T3.muted }}>{f.k}</span>
            <span style={{ fontSize: 14, color: T3.ink, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{f.v}</span>
          </div>
        ))}
      </LG3>

      {it.drafted && (
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ background: T3.accentSoft, borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
              color: T3.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {Ic.sparkle(11, T3.accent)} Draft reply ready
            </div>
            <div style={{ fontSize: 14, color: T3.ink, marginTop: 8, lineHeight: 1.45,
              padding: 12, background: 'rgba(255,255,255,0.6)', borderRadius: 8 }}>
              "Dear Sir/Madam, I write to formally challenge PCN LB23994821 on the grounds that the loading restrictions were not clearly signposted at this location…"
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <B3 size="sm" variant="primary">Send</B3>
              <B3 size="sm" variant="secondary">Edit draft</B3>
            </div>
          </div>
        </div>
      )}

      <LG3 header="Actions">
        <R3 icon={Ic.pound(16, T3.accent)} iconBg={T3.accentSoft} title="Pay £65 with Lambeth's link" sub="Opens in browser" chevron onClick={() => {}} />
        <R3 icon={Ic.bell(16, T3.accent)} iconBg={T3.accentSoft} title="Reminder: 12 May, 9am" sub="2 days before due" chevron onClick={() => {}} />
        <R3 icon={Ic.thumbtack(16, T3.accent)} iconBg={T3.accentSoft} title="Pin to top" chevron last onClick={() => {}} />
      </LG3>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Onboarding (3 steps) — fully functional, writes to Store
// ─────────────────────────────────────────────────────────────
const TYPE_PRESETS = {
  business: { icon: 'building', color: 'oklch(0.62 0.13 28)', subPlaceholder: 'Restaurant · 47 Norbury Rd' },
  property: { icon: 'home',     color: 'oklch(0.62 0.10 200)', subPlaceholder: 'Buy-to-let · E13 0AA' },
  vehicle:  { icon: 'car',      color: 'oklch(0.55 0.10 250)', subPlaceholder: 'E-Class · diesel' },
  personal: { icon: 'user',     color: 'oklch(0.62 0.06 300)', subPlaceholder: 'You & family' },
};

function Onboarding({ onDone }) {
  const [step, setStep] = React.useState(0);
  const [entities, setEntities] = React.useState([]);
  const [adding, setAdding] = React.useState(null); // { type, name, sub, info }
  const fmtId = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6);

  function commitAdd() {
    if (!adding?.name?.trim()) return;
    const preset = TYPE_PRESETS[adding.type];
    const e = {
      id: fmtId(adding.name),
      name: adding.name.trim(),
      type: adding.type,
      sub: adding.sub?.trim() || preset.subPlaceholder,
      icon: preset.icon,
      color: preset.color,
      count: 0,
      info: adding.info || {},
    };
    setEntities(es => [...es, e]);
    setAdding(null);
  }

  function finish() {
    // Write entities to the store, replacing seed
    window.SEC_DATA.Store.set({ entities: entities.length ? entities : window.SEC_DATA.ENTITIES });
    onDone();
  }

  if (step === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
        background: T3.bg, padding: '64px 24px 40px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: T3.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            {Ic.sparkle(28, '#fff')}
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: T3.ink, letterSpacing: -1,
            lineHeight: 1.05, fontFamily: T3.fontDisplay }}>
            Hi Julia.<br/>I'm your secretary.
          </div>
          <div style={{ fontSize: 17, color: T3.muted, marginTop: 16, lineHeight: 1.4 }}>
            You take photos. I file, remind, and draft replies. A real human checks anything I'm unsure about — within 10 minutes.
          </div>
        </div>
        <B3 full size="lg" variant="dark" onClick={() => setStep(1)}>Get set up · 5 minutes</B3>
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: T3.muted }}>
          We'll text you on WhatsApp too.
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
        background: T3.bg, padding: '48px 0 28px' }}>
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ fontSize: 13, color: T3.muted, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Step 1 of 3</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T3.ink, marginTop: 6, letterSpacing: -0.5, fontFamily: T3.fontDisplay }}>
            What does your post pile up about?
          </div>
          <div style={{ fontSize: 14, color: T3.muted, marginTop: 8, lineHeight: 1.4 }}>
            Add anything that gets letters: businesses, properties, vehicles. Tap to remove.
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          {entities.length > 0 && (
            <div style={{ background: T3.bgCard, borderRadius: 12, overflow: 'hidden' }}>
              {entities.map((e, i) => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderBottom: i === entities.length - 1 ? 'none' : `0.5px solid ${T3.hair}`,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: e.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Ic[e.icon](18, '#fff')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: T3.ink, fontWeight: 500 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: T3.muted }}>{e.sub}</div>
                  </div>
                  <button onClick={() => setEntities(es => es.filter(x => x.id !== e.id))}
                    style={{ background: 'transparent', border: 0, color: T3.muted2, cursor: 'pointer', padding: 4 }}>
                    {Ic.x(18, T3.muted2)}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!adding && (
            <button onClick={() => setAdding({ type: 'business', name: '', sub: '', info: {} })}
              style={{ width: '100%', padding: 14, marginTop: entities.length ? 10 : 0, borderRadius: 12,
                border: `1px dashed ${T3.sep}`, background: 'transparent',
                color: T3.accent, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: T3.font,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>{Ic.plus(16, T3.accent, 2.4)} Add {entities.length ? 'another' : 'first entity'}</button>
          )}

          {adding && <AddEntityForm value={adding} onChange={setAdding} onCancel={() => setAdding(null)} onCommit={commitAdd} />}

          <div style={{
            marginTop: 16, padding: 14, background: T3.accentSoft, borderRadius: 12,
            display: 'flex', gap: 10,
          }}>
            <div style={{ marginTop: 1 }}>{Ic.sparkle(15, T3.accent)}</div>
            <div style={{ flex: 1, fontSize: 13, color: T3.ink, lineHeight: 1.4 }}>
              Add registration / VAT / licence details now if you have them, or skip — I'll prompt you when the first letter comes in.
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 16px 0' }}>
          <B3 full size="lg" variant="dark" onClick={() => setStep(2)} disabled={entities.length === 0}>
            Continue with {entities.length} {entities.length === 1 ? 'entity' : 'entities'}
          </B3>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
        background: T3.bg, padding: '48px 0 28px' }}>
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ fontSize: 13, color: T3.muted, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Step 2 of 3</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T3.ink, marginTop: 6, letterSpacing: -0.5, fontFamily: T3.fontDisplay }}>
            Empty the drawer.
          </div>
          <div style={{ fontSize: 14, color: T3.muted, marginTop: 8, lineHeight: 1.4 }}>
            Take photos of every paper currently piling up. We'll sort them all in 24 hours — that's the magic moment.
          </div>
        </div>

        <div style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            background: T3.bgCard, borderRadius: 16, padding: 18,
            border: `1px dashed ${T3.sep}`, textAlign: 'center',
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: T3.ink,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              {Ic.camera(30, '#fff')}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T3.ink }}>Snap a stack</div>
            <div style={{ fontSize: 13, color: T3.muted, marginTop: 4, lineHeight: 1.4 }}>
              Just keep snapping — we'll figure out which page goes with which.
            </div>
          </div>

          <div style={{ background: T3.bgCard, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, color: T3.muted, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Or, send by</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Channel icon={Ic.paperclip(16, T3.accent)} title="WhatsApp" sub="+44 7700 900100" />
              <Channel icon={Ic.doc(16, T3.accent)} title="Email forward" sub="julia@inbox.secretary.app" />
              <Channel icon={Ic.mic(16, T3.accent)} title="Voice notes" sub="Same WhatsApp number" />
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8 }}>
          <B3 variant="secondary" size="lg" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</B3>
          <B3 variant="dark" size="lg" style={{ flex: 2 }} onClick={finish}>I'll start now</B3>
        </div>
      </div>
    );
  }

  return null;
}

// Inline Add-Entity form used during Onboarding
function AddEntityForm({ value, onChange, onCancel, onCommit }) {
  const types = [
    { id: 'business', label: 'Business' },
    { id: 'property', label: 'Property' },
    { id: 'vehicle',  label: 'Vehicle' },
    { id: 'personal', label: 'Personal' },
  ];
  const isBiz = value.type === 'business';
  const isVeh = value.type === 'vehicle';
  const isProp = value.type === 'property';

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px', borderRadius: 8,
    border: `0.5px solid ${T3.sep}`, background: '#fff',
    fontSize: 15, color: T3.ink, fontFamily: T3.font, outline: 'none',
  };
  const labelStyle = { fontSize: 11, color: T3.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 };
  const setField = (k, v) => onChange({ ...value, [k]: v });
  const setInfo = (k, v) => onChange({ ...value, info: { ...(value.info || {}), [k]: v } });

  return (
    <div style={{
      marginTop: 10, background: T3.bgCard, borderRadius: 12, padding: 14,
      border: `0.5px solid ${T3.sep}`,
    }}>
      <div style={{ ...labelStyle }}>Type</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {types.map(t => {
          const active = value.type === t.id;
          return (
            <button key={t.id} onClick={() => setField('type', t.id)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 8,
                border: `0.5px solid ${active ? T3.accent : T3.sep}`,
                background: active ? T3.accentSoft : '#fff',
                color: active ? T3.accent : T3.ink2,
                fontSize: 12, fontWeight: 500, fontFamily: T3.font, cursor: 'pointer',
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
        <B3 variant="secondary" size="md" style={{ flex: 1 }} onClick={onCancel}>Cancel</B3>
        <B3 variant="dark" size="md" style={{ flex: 2 }} onClick={onCommit} disabled={!value.name?.trim()}>Add</B3>
      </div>
    </div>
  );
}

function Channel({ icon, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: T3.accentSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: T3.ink, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 12, color: T3.muted }}>{sub}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Contacts
// ─────────────────────────────────────────────────────────────
function ContactsView({ onBack }) {
  return (
    <div style={{ paddingBottom: 120 }}>
      <NB3 large title="Contacts" sub="Phonebook · 5 people"
        leading={onBack ? <NBn3 onClick={onBack}>{Ic.back(20, T3.accent)}</NBn3> : null}
        trailing={<NBn3 primary>{Ic.plus(22, T3.accent, 2.4)}</NBn3>} />

      <LG3>
        {window.SEC_DATA.CONTACTS.map((c, i) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderBottom: i === window.SEC_DATA.CONTACTS.length - 1 ? 'none' : `0.5px solid ${T3.hair}`,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 99, background: T3.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, color: T3.ink2 }}>
              {c.name.split(' ').map(s => s[0]).slice(0, 2).join('')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, color: T3.ink, fontWeight: 500 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: T3.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.note}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {c.tags.slice(0, 2).map(t => (
                  <span key={t} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99,
                    background: T3.bg, color: T3.muted, fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, color: T3.muted2, textAlign: 'right' }}>
              {new Date(c.last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        ))}
      </LG3>

      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ background: T3.accentSoft, borderRadius: 12, padding: 14, display: 'flex', gap: 10 }}>
          <div style={{ marginTop: 1 }}>{Ic.sparkle(15, T3.accent)}</div>
          <div style={{ flex: 1, fontSize: 13, color: T3.ink, lineHeight: 1.4 }}>
            Tip: voice-note "Add John, 07700 900123, ordered crispy duck" — I'll add him with a note and tag.
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EntityDetail, EntitiesList, CalendarView, AskView, ItemDetail, Onboarding, ContactsView });
