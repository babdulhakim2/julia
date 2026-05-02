// Secretary — Desktop / web app shell
// Three-column layout: sidebar (entities) · main (table or detail) · inspector (item preview)

const { T: TD } = window.UI;

// Date helpers
function dRel(d) {
  if (!d) return '';
  const today = new Date(window.SEC_DATA.TODAY);
  const date = new Date(d);
  const days = Math.round((date - today) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0 && days < 7) return `In ${days} days`;
  if (days < 0) return `${Math.abs(days)}d overdue`;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const DT = {
  ...TD,
  // Desktop-specific tokens
  sidebarBg: '#F7F6F2',
  inspectorBg: '#FAF9F5',
  rowHover: 'rgba(0,0,0,0.04)',
  selBg: 'oklch(0.95 0.04 252)',
};

function Desktop() {
  const { entities, items } = window.SEC_DATA.useStore();
  const [view, setView] = React.useState({ kind: 'all' }); // {kind:'all'} | {kind:'entity', id} | {kind:'review'} | {kind:'calendar'} | {kind:'contacts'} | {kind:'ask'}
  const [selectedItemId, setSelectedItemId] = React.useState('i2');
  const [search, setSearch] = React.useState('');
  const [captureOpen, setCaptureOpen] = React.useState(false);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'grid',
      gridTemplateColumns: '248px 1fr 380px',
      background: '#fff', color: DT.ink, fontFamily: DT.font, overflow: 'hidden',
    }}>
      <DesktopSidebar entities={entities} items={items} view={view} setView={setView} onCapture={() => setCaptureOpen(true)} />
      <DesktopMain
        view={view} setView={setView}
        items={items} entities={entities}
        search={search} setSearch={setSearch}
        selectedItemId={selectedItemId} setSelectedItemId={setSelectedItemId}
        onCapture={() => setCaptureOpen(true)}
      />
      <DesktopInspector itemId={selectedItemId} />

      {captureOpen && <DesktopUploadModal onClose={() => setCaptureOpen(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────
function DesktopSidebar({ entities, items, view, setView, onCapture }) {
  const review = items.filter(i => i.status === 'needs_review').length;
  const dueSoon = items.filter(i => i.status === 'due_soon' || i.status === 'overdue').length;

  const navItems = [
    { id: 'all', label: 'Everything', icon: 'inbox', badge: items.filter(i => i.status !== 'done').length },
    { id: 'review', label: 'Needs review', icon: 'sparkle', badge: review, highlight: review > 0 },
    { id: 'calendar', label: 'Calendar', icon: 'cal', badge: dueSoon },
    { id: 'ask', label: 'Ask', icon: 'sparkle' },
    { id: 'contacts', label: 'Contacts', icon: 'user' },
  ];

  return (
    <aside style={{
      background: DT.sidebarBg, borderRight: `0.5px solid ${DT.sep}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Brand */}
      <div style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: DT.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          fontSize: 13, fontWeight: 700, fontFamily: DT.fontDisplay, letterSpacing: -0.3 }}>S</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: DT.ink, letterSpacing: -0.2 }}>Secretary</div>
        <div style={{ marginLeft: 'auto' }}>
          <button title="Settings" style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: DT.muted }}>
            {Ic.dots(16, DT.muted)}
          </button>
        </div>
      </div>

      {/* Capture / upload */}
      <div style={{ padding: '0 12px 14px' }}>
        <button onClick={onCapture} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', borderRadius: 9,
          background: DT.ink, color: '#fff', border: 0, cursor: 'pointer',
          fontSize: 13.5, fontWeight: 600, fontFamily: DT.font, letterSpacing: -0.1,
        }}>
          {Ic.camera(15, '#fff')} Capture or upload
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: '0 8px' }}>
        {navItems.map(n => {
          const active = view.kind === n.id;
          return (
            <button key={n.id} onClick={() => setView({ kind: n.id })} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '6px 10px', marginBottom: 1, borderRadius: 7, border: 0,
              background: active ? 'rgba(0,0,0,0.06)' : 'transparent', cursor: 'pointer',
              color: active ? DT.ink : DT.ink2, fontSize: 13.5, fontWeight: active ? 600 : 500, fontFamily: DT.font,
              textAlign: 'left',
            }}>
              <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {Ic[n.icon] ? Ic[n.icon](15, active ? DT.ink : DT.muted) : null}
              </span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge ? (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
                  background: n.highlight ? 'oklch(0.55 0.20 25)' : 'rgba(0,0,0,0.08)',
                  color: n.highlight ? '#fff' : DT.muted,
                }}>{n.badge}</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Entities */}
      <div style={{ padding: '20px 18px 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: DT.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Entities</span>
        <button title="Add entity" style={{ background: 'transparent', border: 0, padding: 2, cursor: 'pointer', color: DT.muted }}>
          {Ic.plus(13, DT.muted, 2.4)}
        </button>
      </div>
      <div style={{ padding: '0 8px', overflowY: 'auto', flex: 1 }}>
        {entities.map(e => {
          const active = view.kind === 'entity' && view.id === e.id;
          const count = items.filter(i => i.entity === e.id && i.status !== 'done').length;
          return (
            <button key={e.id} onClick={() => setView({ kind: 'entity', id: e.id })} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '6px 10px', marginBottom: 1, borderRadius: 7, border: 0,
              background: active ? 'rgba(0,0,0,0.06)' : 'transparent', cursor: 'pointer',
              color: DT.ink, fontSize: 13, fontWeight: 500, fontFamily: DT.font,
              textAlign: 'left',
            }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: e.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {Ic[e.icon](10, '#fff')}
              </span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
              {count ? (
                <span style={{ fontSize: 11, color: DT.muted2, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 14px', borderTop: `0.5px solid ${DT.sep}`,
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 99, background: 'oklch(0.85 0.04 50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600, color: DT.ink2 }}>JC</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: DT.ink, lineHeight: 1.2 }}>Julia Chen</div>
          <div style={{ fontSize: 11, color: DT.muted }}>Multi · 4 entities</div>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// Main pane — header + body that switches by view
// ─────────────────────────────────────────────────────────────
function DesktopMain({ view, setView, items, entities, search, setSearch, selectedItemId, setSelectedItemId, onCapture }) {
  const ent = Object.fromEntries(entities.map(e => [e.id, e]));

  let title, subtitle, body;
  if (view.kind === 'all') {
    title = 'Everything';
    subtitle = `${items.filter(i => i.status !== 'done').length} open · ${items.length} total`;
    body = <ItemsTable items={items.filter(i => i.status !== 'done')} ent={ent} search={search} selectedId={selectedItemId} onSelect={setSelectedItemId} />;
  } else if (view.kind === 'review') {
    const r = items.filter(i => i.status === 'needs_review');
    title = 'Needs your eye';
    subtitle = `${r.length} item${r.length === 1 ? '' : 's'} the AI is unsure about`;
    body = <ItemsTable items={r} ent={ent} search={search} selectedId={selectedItemId} onSelect={setSelectedItemId} />;
  } else if (view.kind === 'entity') {
    const e = ent[view.id];
    title = e?.name || '—';
    subtitle = e?.sub || '';
    body = <EntityFiles entity={e} items={items.filter(i => i.entity === e.id)} search={search} selectedId={selectedItemId} onSelect={setSelectedItemId} />;
  } else if (view.kind === 'calendar') {
    title = 'Calendar';
    subtitle = 'Everything dated, across every entity';
    body = <DesktopCalendar items={items} ent={ent} onSelect={setSelectedItemId} />;
  } else if (view.kind === 'ask') {
    title = 'Ask';
    subtitle = 'Conversational answers from your filing';
    body = <DesktopAsk />;
  } else if (view.kind === 'contacts') {
    title = 'Contacts';
    subtitle = `${window.SEC_DATA.CONTACTS.length} people`;
    body = <DesktopContacts />;
  }

  return (
    <main style={{
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      borderRight: `0.5px solid ${DT.sep}`,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px 14px', borderBottom: `0.5px solid ${DT.sep}`,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: DT.ink, letterSpacing: -0.3, fontFamily: DT.fontDisplay }}>{title}</div>
          <div style={{ fontSize: 12.5, color: DT.muted, marginTop: 2 }}>{subtitle}</div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 10px', borderRadius: 7,
          background: 'rgba(118,118,128,0.10)', minWidth: 240,
        }}>
          {Ic.search(14, DT.muted)}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files, items, contacts…"
            style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13, fontFamily: DT.font, color: DT.ink }}/>
          <span style={{ fontSize: 11, color: DT.muted2, padding: '1px 5px',
            border: `0.5px solid ${DT.sep}`, borderRadius: 4, fontFamily: 'ui-monospace, SF Mono, Menlo, monospace' }}>⌘K</span>
        </div>

        <button onClick={onCapture} title="Capture / upload" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 11px', borderRadius: 7,
          background: DT.accent, color: '#fff', border: 0, cursor: 'pointer',
          fontSize: 12.5, fontWeight: 600, fontFamily: DT.font,
        }}>{Ic.plus(13, '#fff', 2.4)} Add</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>{body}</div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Items table
// ─────────────────────────────────────────────────────────────
function ItemsTable({ items, ent, search, selectedId, onSelect }) {
  const filtered = items.filter(i => search === '' ||
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.issuer || '').toLowerCase().includes(search.toLowerCase()));

  // Group by status priority
  const ordered = [...filtered].sort((a, b) => {
    const order = { needs_review: 0, overdue: 1, due_soon: 2, drafting: 3, scheduled: 4, done: 5 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  if (ordered.length === 0) {
    return <div style={{ padding: 60, textAlign: 'center', color: DT.muted, fontSize: 13 }}>Nothing matches.</div>;
  }

  return (
    <div>
      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '32px 1fr 160px 110px 110px 110px',
        padding: '8px 24px', borderBottom: `0.5px solid ${DT.sep}`,
        fontSize: 11, color: DT.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
        background: '#fff', position: 'sticky', top: 0, zIndex: 1,
      }}>
        <span></span>
        <span>Title</span>
        <span>Entity</span>
        <span>Status</span>
        <span style={{ textAlign: 'right' }}>Amount</span>
        <span style={{ textAlign: 'right' }}>Due</span>
      </div>

      {ordered.map(it => {
        const e = ent[it.entity];
        const sel = selectedId === it.id;
        const meta = window.SEC_DATA.STATUS_META[it.status];
        return (
          <button key={it.id} onClick={() => onSelect(it.id)} style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 160px 110px 110px 110px',
            width: '100%', padding: '11px 24px', alignItems: 'center', gap: 0,
            background: sel ? DT.selBg : 'transparent', border: 0, borderBottom: `0.5px solid ${DT.hair}`,
            fontFamily: DT.font, textAlign: 'left', cursor: 'pointer', color: DT.ink,
          }}
          onMouseEnter={(ev) => { if (!sel) ev.currentTarget.style.background = DT.rowHover; }}
          onMouseLeave={(ev) => { if (!sel) ev.currentTarget.style.background = 'transparent'; }}>
            <div style={{
              width: 22, height: 28, borderRadius: 4, background: '#fff',
              border: `0.5px solid ${DT.sep}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{Ic.doc(12, DT.muted)}</div>
            <div style={{ minWidth: 0, paddingRight: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: DT.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
              <div style={{ fontSize: 11.5, color: DT.muted, marginTop: 1 }}>{it.issuer || it.type}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: DT.ink2, minWidth: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: e?.color, flexShrink: 0 }}></span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e?.name}</span>
            </div>
            <div>
              {meta && (
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 99,
                  fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color,
                }}>{meta.label}</span>
              )}
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: DT.ink, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
              {it.amount ? `£${it.amount.toLocaleString()}` : '—'}
            </div>
            <div style={{ textAlign: 'right', fontSize: 12.5, color: it.status === 'overdue' ? 'oklch(0.55 0.20 25)' : DT.ink2, fontVariantNumeric: 'tabular-nums' }}>
              {dRel(it.dueDate)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Entity files (folder view + tabs)
// ─────────────────────────────────────────────────────────────
function EntityFiles({ entity, items, search, selectedId, onSelect }) {
  const [tab, setTab] = React.useState('all');
  const [period, setPeriod] = React.useState('all');

  const periods = [
    { id: 'all', label: 'All time' },
    { id: '2026', label: '2026' },
    { id: '2026-Q2', label: 'Q2 26' },
    { id: '2026-Q1', label: 'Q1 26' },
    { id: '2025', label: '2025' },
  ];

  const inPeriod = (it) => {
    if (period === 'all' || !it.date) return period === 'all';
    if (period.length === 4) return it.date.startsWith(period);
    if (period.includes('Q')) {
      const [y, q] = period.split('-Q');
      const m = parseInt(it.date.slice(5, 7), 10);
      return it.date.startsWith(y) && Math.ceil(m / 3) === parseInt(q, 10);
    }
    return it.date.startsWith(period);
  };

  const filtered = items.filter(i => inPeriod(i));
  const byCat = {};
  window.SEC_DATA.CATEGORIES.forEach(c => (byCat[c.id] = []));
  filtered.forEach(it => { (byCat[it.category] = byCat[it.category] || []).push(it); });
  const cats = window.SEC_DATA.CATEGORIES.filter(c => (byCat[c.id] || []).length > 0);
  const tabItems = tab === 'all' ? filtered : (byCat[tab] || []);
  const total = filtered.reduce((s, i) => s + (i.amount || 0), 0);
  const ent = Object.fromEntries(window.SEC_DATA.ENTITIES.map(e => [e.id, e]));

  return (
    <div>
      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        padding: '14px 24px 0', gap: 14 }}>
        <Stat label="Open items" value={items.filter(i => i.status !== 'done').length} />
        <Stat label="This period" value={`£${total.toLocaleString()}`} />
        <Stat label="Total filed" value={items.length} />
        <Stat label="Last activity" value={items.length ? dRel(items.map(i => i.date).filter(Boolean).sort().slice(-1)[0]) : '—'} />
      </div>

      {/* Period tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 24px 0' }}>
        {periods.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            padding: '4px 11px', borderRadius: 6, border: 0, cursor: 'pointer',
            background: period === p.id ? DT.ink : 'transparent',
            color: period === p.id ? '#fff' : DT.ink2,
            fontSize: 12, fontWeight: 600, fontFamily: DT.font,
          }}>{p.label}</button>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 0, padding: '14px 24px 0', borderBottom: `0.5px solid ${DT.sep}`, marginTop: 4 }}>
        <CatTab active={tab === 'all'} onClick={() => setTab('all')} label="All" count={filtered.length} />
        {cats.map(c => (
          <CatTab key={c.id} active={tab === c.id} onClick={() => setTab(c.id)} label={c.name} count={byCat[c.id].length} color={c.color} />
        ))}
      </div>

      <ItemsTable items={tabItems} ent={ent} search={search} selectedId={selectedId} onSelect={onSelect} />

      {/* Info card */}
      {entity?.info && Object.keys(entity.info).length > 0 && (
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 11, color: DT.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>About</div>
          <div style={{
            background: '#FAF9F5', borderRadius: 10, padding: '4px 14px',
            border: `0.5px solid ${DT.sep}`,
          }}>
            {Object.entries(entity.info).map(([k, v], i, arr) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: i === arr.length - 1 ? 'none' : `0.5px solid ${DT.hair}` }}>
                <span style={{ fontSize: 12.5, color: DT.muted }}>{k}</span>
                <span style={{ fontSize: 12.5, color: DT.ink, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{
      background: '#FAF9F5', borderRadius: 10, padding: '10px 12px',
      border: `0.5px solid ${DT.sep}`,
    }}>
      <div style={{ fontSize: 11, color: DT.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: DT.ink, fontFamily: DT.fontDisplay, marginTop: 4, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>{value}</div>
    </div>
  );
}

function CatTab({ active, onClick, label, count, color }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px 10px', border: 0, background: 'transparent', cursor: 'pointer',
      fontSize: 12.5, fontWeight: active ? 600 : 500, fontFamily: DT.font,
      color: active ? DT.ink : DT.muted,
      borderBottom: active ? `2px solid ${DT.ink}` : '2px solid transparent',
      marginBottom: -0.5,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      {color && <span style={{ width: 7, height: 7, borderRadius: 99, background: color }}></span>}
      {label}
      <span style={{ fontSize: 11, color: DT.muted2, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Calendar view (list-style)
// ─────────────────────────────────────────────────────────────
function DesktopCalendar({ items, ent, onSelect }) {
  const dated = items.filter(i => i.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // group by month
  const groups = {};
  dated.forEach(it => {
    const k = it.dueDate.slice(0, 7);
    (groups[k] = groups[k] || []).push(it);
  });

  return (
    <div style={{ padding: '14px 24px 30px' }}>
      {Object.entries(groups).map(([month, list]) => (
        <div key={month} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: DT.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            {new Date(month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </div>
          <div style={{ background: '#FAF9F5', borderRadius: 10, border: `0.5px solid ${DT.sep}`, overflow: 'hidden' }}>
            {list.map((it, i) => {
              const e = ent[it.entity];
              const d = new Date(it.dueDate);
              return (
                <button key={it.id} onClick={() => onSelect(it.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                  background: 'transparent', border: 0, borderBottom: i === list.length - 1 ? 'none' : `0.5px solid ${DT.hair}`,
                  cursor: 'pointer', fontFamily: DT.font, textAlign: 'left',
                }}>
                  <div style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: DT.muted, fontWeight: 600, textTransform: 'uppercase' }}>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: DT.ink, fontFamily: DT.fontDisplay, lineHeight: 1, marginTop: 2 }}>{d.getDate()}</div>
                  </div>
                  <div style={{ width: 4, height: 32, borderRadius: 2, background: e?.color, flexShrink: 0 }}></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: DT.ink, fontWeight: 500 }}>{it.title}</div>
                    <div style={{ fontSize: 12, color: DT.muted, marginTop: 1 }}>{e?.name}</div>
                  </div>
                  <div style={{ fontSize: 13, color: DT.ink, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                    {it.amount ? `£${it.amount.toLocaleString()}` : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Ask
// ─────────────────────────────────────────────────────────────
function DesktopAsk() {
  const [q, setQ] = React.useState('');
  const [history, setHistory] = React.useState([
    { q: 'What\'s due this week?', a: 'Three things: parking ticket (Mercedes) £65 by 14 May, council tax (Plaistow flat) £214 by 28 May, business rates (Norbury) £412 by 31 May.' },
  ]);
  const suggestions = [
    'What\'s due this week?',
    'MOT for the Mercedes?',
    'Everything for Norbury this month',
    'Anything overdue?',
    'Total spent on rates this year',
  ];

  function ask(text) {
    const t = text || q;
    if (!t.trim()) return;
    setHistory(h => [...h, { q: t, a: 'Looking…' }]);
    setQ('');
  }

  return (
    <div style={{ padding: '14px 24px 30px', maxWidth: 760 }}>
      {history.map((h, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: DT.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>You asked</div>
          <div style={{ fontSize: 15, color: DT.ink, fontWeight: 500, marginBottom: 10 }}>{h.q}</div>
          <div style={{ fontSize: 11, color: DT.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Secretary</div>
          <div style={{
            background: '#FAF9F5', border: `0.5px solid ${DT.sep}`, borderRadius: 10, padding: 14,
            fontSize: 14, color: DT.ink, lineHeight: 1.5,
          }}>{h.a}</div>
        </div>
      ))}

      {/* Composer */}
      <div style={{
        marginTop: 12, padding: 12, background: '#fff', border: `0.5px solid ${DT.sep}`, borderRadius: 12,
      }}>
        <textarea value={q} onChange={e => setQ(e.target.value)} placeholder="Ask about anything you've filed…"
          rows={2}
          style={{ width: '100%', border: 0, outline: 0, resize: 'none', fontSize: 14, fontFamily: DT.font, color: DT.ink, background: 'transparent' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => ask(s)} style={{
              padding: '4px 10px', borderRadius: 99,
              background: 'rgba(0,0,0,0.04)', border: 0, cursor: 'pointer',
              fontSize: 12, color: DT.ink2, fontFamily: DT.font,
            }}>{s}</button>
          ))}
          <div style={{ flex: 1 }}></div>
          <button onClick={() => ask()} style={{
            padding: '5px 14px', borderRadius: 7,
            background: DT.accent, color: '#fff', border: 0, cursor: 'pointer',
            fontSize: 12.5, fontWeight: 600, fontFamily: DT.font,
          }}>Ask ↵</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Contacts
// ─────────────────────────────────────────────────────────────
function DesktopContacts() {
  const cs = window.SEC_DATA.CONTACTS;
  return (
    <div style={{ padding: '14px 24px 30px' }}>
      <div style={{
        background: '#FAF9F5', borderRadius: 10, border: `0.5px solid ${DT.sep}`, overflow: 'hidden',
      }}>
        {cs.map((c, i) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
            borderBottom: i === cs.length - 1 ? 'none' : `0.5px solid ${DT.hair}`,
          }}>
            <div style={{ width: 34, height: 34, borderRadius: 99, background: '#fff',
              border: `0.5px solid ${DT.sep}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: DT.ink2 }}>
              {c.name.split(' ').map(s => s[0]).slice(0, 2).join('')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: DT.ink, fontWeight: 500 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: DT.muted, marginTop: 1 }}>{c.note}</div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {c.tags.slice(0, 3).map(t => (
                <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99,
                  background: 'rgba(0,0,0,0.05)', color: DT.muted2, fontWeight: 500 }}>{t}</span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: DT.muted2, minWidth: 70, textAlign: 'right' }}>
              {new Date(c.last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Inspector pane
// ─────────────────────────────────────────────────────────────
function DesktopInspector({ itemId }) {
  const { items, entities } = window.SEC_DATA.useStore();
  const it = items.find(i => i.id === itemId);
  const e = entities.find(x => x.id === it?.entity);
  const meta = it ? window.SEC_DATA.STATUS_META[it.status] : null;

  if (!it) {
    return (
      <aside style={{ background: DT.inspectorBg, padding: 30, fontSize: 13, color: DT.muted }}>
        Select an item to see details.
      </aside>
    );
  }

  return (
    <aside style={{ background: DT.inspectorBg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Document preview */}
      <div style={{ padding: 18, borderBottom: `0.5px solid ${DT.sep}` }}>
        <div style={{
          aspectRatio: '0.78', background: '#fff', borderRadius: 10, padding: 18,
          border: `0.5px solid ${DT.sep}`,
          boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 4px 18px rgba(0,0,0,0.05)',
          display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden',
        }}>
          <div style={{ fontSize: 9, color: DT.muted2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {it.issuer || it.type}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: DT.ink, fontFamily: DT.fontDisplay, lineHeight: 1.2 }}>{it.title}</div>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} style={{ height: 4, background: 'oklch(0.92 0.01 80)', borderRadius: 2, width: `${65 + (n*5) % 35}%` }}></div>
            ))}
          </div>
          {it.amount && (
            <div style={{ marginTop: 'auto', padding: '8px 0 0', borderTop: `0.5px solid ${DT.hair}` }}>
              <div style={{ fontSize: 9, color: DT.muted2, textTransform: 'uppercase', fontWeight: 600 }}>Amount due</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: DT.ink, fontFamily: DT.fontDisplay }}>£{it.amount.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div style={{ padding: 18, flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 11, color: DT.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{it.type}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: DT.ink, fontFamily: DT.fontDisplay, letterSpacing: -0.3, lineHeight: 1.2, marginBottom: 6 }}>{it.title}</div>
        {meta && (
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 99,
            fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color,
          }}>{meta.label}</span>
        )}

        <div style={{ marginTop: 18, background: '#fff', borderRadius: 10, border: `0.5px solid ${DT.sep}`, padding: '4px 14px' }}>
          <Field label="Entity" value={e?.name} dotColor={e?.color} />
          {it.amount ? <Field label="Amount" value={`£${it.amount.toLocaleString()}${it.fullAmount ? ` (£${it.fullAmount} after)` : ''}`} /> : null}
          {it.dueDate ? <Field label="Due" value={new Date(it.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} /> : null}
          {it.issuer ? <Field label="Issuer" value={it.issuer} /> : null}
          {it.reference ? <Field label="Reference" value={it.reference} /> : null}
          {it.date ? <Field label="Filed" value={new Date(it.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} last /> : null}
        </div>

        {it.aiSuggestion && (
          <div style={{ marginTop: 14, background: 'oklch(0.95 0.04 252)', borderRadius: 10, padding: 12,
            display: 'flex', gap: 9 }}>
            <div style={{ marginTop: 1 }}>{Ic.sparkle(13, DT.accent)}</div>
            <div style={{ flex: 1, fontSize: 12.5, color: DT.ink, lineHeight: 1.45 }}>{it.aiSuggestion}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: 14, borderTop: `0.5px solid ${DT.sep}`, display: 'flex', gap: 8 }}>
        <button style={{
          flex: 1, padding: '8px 12px', borderRadius: 8,
          background: 'rgba(0,0,0,0.05)', border: 0, cursor: 'pointer',
          fontSize: 12.5, fontWeight: 600, color: DT.ink, fontFamily: DT.font,
        }}>Open original</button>
        <button style={{
          flex: 1, padding: '8px 12px', borderRadius: 8,
          background: DT.ink, color: '#fff', border: 0, cursor: 'pointer',
          fontSize: 12.5, fontWeight: 600, fontFamily: DT.font,
        }}>Mark handled</button>
      </div>
    </aside>
  );
}

function Field({ label, value, dotColor, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 0', borderBottom: last ? 'none' : `0.5px solid ${DT.hair}`, gap: 14 }}>
      <span style={{ fontSize: 12, color: DT.muted }}>{label}</span>
      <span style={{ fontSize: 12.5, color: DT.ink, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {dotColor && <span style={{ width: 8, height: 8, borderRadius: 99, background: dotColor }}></span>}
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Capture / upload modal
// ─────────────────────────────────────────────────────────────
function DesktopUploadModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(20,20,20,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 520, background: '#fff', borderRadius: 14,
        boxShadow: '0 30px 80px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${DT.sep}`,
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: DT.ink, flex: 1, fontFamily: DT.fontDisplay }}>Add to Secretary</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 4 }}>{Ic.x(18, DT.muted)}</button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{
            border: `1.5px dashed ${DT.sep}`, borderRadius: 12, padding: '34px 20px',
            textAlign: 'center', background: '#FAF9F5',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: DT.ink, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              {Ic.camera(22, '#fff')}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: DT.ink, marginBottom: 4 }}>Drop letters, PDFs, or photos here</div>
            <div style={{ fontSize: 12.5, color: DT.muted }}>I'll figure out which entity, the type, the amount, the deadline.</div>
            <button style={{
              marginTop: 12, padding: '6px 14px', borderRadius: 7,
              background: DT.accent, color: '#fff', border: 0, cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600, fontFamily: DT.font,
            }}>Choose files</button>
          </div>

          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <Channel2 icon={Ic.paperclip(14, DT.accent)} title="WhatsApp" sub="+44 7700 900100" />
            <Channel2 icon={Ic.doc(14, DT.accent)} title="Email" sub="julia@inbox.secretary.app" />
            <Channel2 icon={Ic.cal(14, DT.accent)} title="Drive sync" sub="Auto-import folder" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Channel2({ icon, title, sub }) {
  return (
    <div style={{
      padding: 12, borderRadius: 9, border: `0.5px solid ${DT.sep}`, background: '#FAF9F5',
    }}>
      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'oklch(0.95 0.04 252)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: DT.ink }}>{title}</div>
      <div style={{ fontSize: 11, color: DT.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
    </div>
  );
}

window.SecretaryDesktop = Desktop;
