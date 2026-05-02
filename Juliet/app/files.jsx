// File Manager — per-business view with smart category folders + time tabs.

const { T: TF, NavBar: NBF, NavBtn: NBnF, ListGroup: LGF, Btn: BF, DocPreview: DPF } = window.UI;

function FileManager({ entityId, onBack, onOpenItem }) {
  const { entities, items } = window.SEC_DATA.useStore();
  const e = entities.find(x => x.id === entityId);
  const all = items.filter(i => i.entity === entityId);

  const [period, setPeriod] = React.useState('all'); // all | 2026 | 2026-Q2 | 2026-04 ...
  const [category, setCategory] = React.useState('all');
  const [view, setView] = React.useState('folders'); // folders | list
  const [search, setSearch] = React.useState('');

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
      const qi = Math.ceil(m / 3);
      return it.date.startsWith(y) && qi === parseInt(q, 10);
    }
    return it.date.startsWith(period);
  };

  const filtered = all.filter(it => inPeriod(it) && (search === '' || it.title.toLowerCase().includes(search.toLowerCase()) || (it.issuer || '').toLowerCase().includes(search.toLowerCase())));

  const byCat = {};
  window.SEC_DATA.CATEGORIES.forEach(c => (byCat[c.id] = []));
  filtered.forEach(it => { (byCat[it.category] = byCat[it.category] || []).push(it); });

  const visibleCats = window.SEC_DATA.CATEGORIES.filter(c => (byCat[c.id] || []).length > 0);
  const total = filtered.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div style={{ paddingBottom: 120 }}>
      <NBF
        leading={<NBnF onClick={onBack}>{Ic.back(20, TF.accent)} Files</NBnF>}
        trailing={
          <>
            <button onClick={() => setView(v => v === 'folders' ? 'list' : 'folders')}
              style={{ background: 'transparent', border: 0, padding: 6, cursor: 'pointer' }}>
              {view === 'folders' ? Ic.doc(20, TF.accent) : Ic.building(20, TF.accent)}
            </button>
          </>
        }
      />

      {/* Hero */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: e.color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Ic[e.icon](20, '#fff')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: TF.ink, letterSpacing: -0.4, fontFamily: TF.fontDisplay, lineHeight: 1.15 }}>{e.name}</div>
            <div style={{ fontSize: 12, color: TF.muted, marginTop: 2 }}>{filtered.length} items · £{total.toLocaleString()} this period</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
          background: 'rgba(118,118,128,0.12)', borderRadius: 10 }}>
          {Ic.search(16, TF.muted)}
          <input value={search} onChange={ev => setSearch(ev.target.value)} placeholder="Search this entity"
            style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 15, fontFamily: TF.font, color: TF.ink }}/>
        </div>
      </div>

      {/* Time slicer (horizontal pills) */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 12px', scrollbarWidth: 'none' }}>
        {periods.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            padding: '6px 12px', borderRadius: 999, border: 0, cursor: 'pointer',
            background: period === p.id ? TF.ink : '#E9E9EE',
            color: period === p.id ? '#fff' : TF.ink,
            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, fontFamily: TF.font,
          }}>{p.label}</button>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 14px', scrollbarWidth: 'none' }}>
        <CatChip selected={category === 'all'} onClick={() => setCategory('all')} label="All" color={TF.muted} />
        {visibleCats.map(c => (
          <CatChip key={c.id} selected={category === c.id} onClick={() => setCategory(category === c.id ? 'all' : c.id)} label={c.name} color={c.color} />
        ))}
      </div>

      {view === 'folders' ? (
        <FolderGrid cats={visibleCats} byCat={byCat} category={category} onOpenItem={onOpenItem} />
      ) : (
        <FlatList items={filtered.filter(i => category === 'all' || i.category === category)} onOpenItem={onOpenItem} />
      )}

      {/* Info card at bottom */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ background: TF.bgCard, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 11, color: TF.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>About this entity</div>
          {Object.entries(e.info || {}).map(([k, v], i, arr) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0',
              borderBottom: i === arr.length - 1 ? 'none' : `0.5px solid ${TF.hair}` }}>
              <span style={{ fontSize: 13, color: TF.muted }}>{k}</span>
              <span style={{ fontSize: 14, color: TF.ink, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CatChip({ selected, onClick, label, color }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 10px 6px 8px', borderRadius: 999, border: 0, cursor: 'pointer',
      background: selected ? color : '#E9E9EE',
      color: selected ? '#fff' : TF.ink,
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, fontFamily: TF.font,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: selected ? '#fff' : color }} />
      {label}
    </button>
  );
}

function FolderGrid({ cats, byCat, category, onOpenItem }) {
  const visible = category === 'all' ? cats : cats.filter(c => c.id === category);
  return (
    <div>
      {visible.map(c => {
        const list = byCat[c.id] || [];
        const total = list.reduce((s, i) => s + (i.amount || 0), 0);
        const open = list.filter(i => i.status !== 'done').length;
        return (
          <div key={c.id} style={{ marginBottom: 18 }}>
            <div style={{ padding: '0 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 5, background: c.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Ic[c.icon](13, '#fff')}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: TF.ink, letterSpacing: -0.1 }}>{c.name}</span>
              <span style={{ fontSize: 12, color: TF.muted }}>· {list.length} {list.length === 1 ? 'item' : 'items'}</span>
              {total > 0 && <span style={{ fontSize: 12, color: TF.muted, marginLeft: 'auto', paddingRight: 16 }}>£{total.toLocaleString()}</span>}
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '4px 16px 4px', scrollbarWidth: 'none' }}>
              {list.slice(0, 6).map(it => (
                <button key={it.id} onClick={() => onOpenItem(it.id)} style={{
                  width: 138, flexShrink: 0, background: TF.bgCard, borderRadius: 12, border: 0,
                  cursor: 'pointer', padding: 8, textAlign: 'left', fontFamily: TF.font,
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ height: 88, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                    <DPF kind={it.preview || 'lambeth'} height={88} />
                  </div>
                  <div style={{ fontSize: 12, color: TF.ink, fontWeight: 500, lineHeight: 1.25,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.title}</div>
                  <div style={{ fontSize: 11, color: TF.muted, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{(it.date || '').slice(5, 10).replace('-', '/')}</span>
                    {it.amount && <span style={{ fontVariantNumeric: 'tabular-nums' }}>£{it.amount}</span>}
                  </div>
                </button>
              ))}
              {list.length > 6 && (
                <button style={{ width: 84, flexShrink: 0, background: 'transparent',
                  border: `1px dashed ${TF.sep}`, borderRadius: 12, color: TF.muted,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: TF.font }}>
                  + {list.length - 6} more
                </button>
              )}
              {open > 0 && (
                <div style={{ position: 'absolute' }}/>
              )}
            </div>
          </div>
        );
      })}
      {visible.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: TF.muted, fontSize: 13 }}>
          Nothing here for this period yet.
        </div>
      )}
    </div>
  );
}

function FlatList({ items, onOpenItem }) {
  if (items.length === 0) return (
    <div style={{ padding: '40px 16px', textAlign: 'center', color: TF.muted, fontSize: 13 }}>No matching items.</div>
  );
  return (
    <LGF>
      {items.map((it, i) => (
        <div key={it.id} onClick={() => onOpenItem(it.id)} style={{
          padding: '12px 14px', cursor: 'pointer',
          borderBottom: i === items.length - 1 ? 'none' : `0.5px solid ${TF.hair}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 32, height: 42, flexShrink: 0 }}>
            <DPF kind={it.preview || 'lambeth'} height={42} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: TF.ink, fontWeight: 500, lineHeight: 1.3 }}>{it.title}</div>
            <div style={{ fontSize: 11, color: TF.muted, marginTop: 2 }}>{it.type} · {it.date}</div>
          </div>
          {it.amount && <div style={{ fontSize: 14, color: TF.ink, fontVariantNumeric: 'tabular-nums' }}>£{it.amount}</div>}
        </div>
      ))}
    </LGF>
  );
}

window.FileManager = FileManager;
