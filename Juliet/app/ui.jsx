// Shared UI primitives — buttons, cards, status pills, list rows.

const T = {
  bg: '#F2F2F7',
  bgAlt: '#FFFFFF',
  bgCard: '#FFFFFF',
  ink: '#1C1C1E',
  ink2: '#3C3C43',
  muted: 'rgba(60,60,67,0.6)',
  muted2: 'rgba(60,60,67,0.36)',
  sep: 'rgba(60,60,67,0.18)',
  hair: 'rgba(60,60,67,0.10)',
  accent: 'oklch(0.55 0.16 252)',
  accentSoft: 'oklch(0.96 0.04 252)',
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", system-ui, sans-serif',
  fontDisplay: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro", system-ui, sans-serif',
};

function StatusPill({ status, size = 'sm' }) {
  const m = window.SEC_DATA.STATUS_META[status];
  if (!m) return null;
  const padV = size === 'sm' ? 2 : 4;
  const padH = size === 'sm' ? 7 : 9;
  const fs = size === 'sm' ? 11 : 12;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: `${padV}px ${padH}px`, borderRadius: 999,
      background: m.bg, color: m.color,
      fontSize: fs, fontWeight: 600, letterSpacing: 0.1,
      lineHeight: 1.1,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 99, background: m.color }} />
      {m.label}
    </span>
  );
}

function Card({ children, style, padded = true }) {
  return (
    <div style={{
      background: T.bgCard, borderRadius: 12,
      overflow: 'hidden',
      ...(padded ? { padding: 16 } : {}),
      ...style,
    }}>{children}</div>
  );
}

function ListGroup({ header, footer, children, style }) {
  return (
    <div style={{ marginTop: 24, ...style }}>
      {header && (
        <div style={{
          padding: '0 16px 6px', fontSize: 13, fontWeight: 400,
          color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4,
        }}>{header}</div>
      )}
      <div style={{
        background: T.bgCard, marginInline: 16, borderRadius: 12, overflow: 'hidden',
      }}>{children}</div>
      {footer && (
        <div style={{ padding: '6px 16px 0', fontSize: 12, color: T.muted, lineHeight: 1.4 }}>{footer}</div>
      )}
    </div>
  );
}

function Row({ icon, iconBg, title, sub, value, valueSub, onClick, chevron = true, last = false }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 16px', minHeight: 44, cursor: onClick ? 'pointer' : 'default',
      borderBottom: last ? 'none' : `0.5px solid ${T.hair}`,
    }}>
      {icon && (
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: iconBg || T.accentSoft, color: T.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: T.ink, lineHeight: 1.25, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      {value && (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          {valueSub && <div style={{ fontSize: 11, color: T.muted2 }}>{valueSub}</div>}
        </div>
      )}
      {chevron && onClick && Ic.chevron(13, 'rgba(60,60,67,0.3)')}
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', size = 'md', icon, style, disabled, full }) {
  const sizes = {
    sm: { h: 32, px: 12, fs: 14, r: 8 },
    md: { h: 44, px: 16, fs: 15, r: 12 },
    lg: { h: 52, px: 20, fs: 16, r: 14 },
  }[size];
  const variants = {
    primary: { bg: T.accent, color: '#fff' },
    secondary: { bg: '#E9E9EE', color: T.ink },
    ghost: { bg: 'transparent', color: T.accent },
    dark: { bg: T.ink, color: '#fff' },
    success: { bg: 'oklch(0.55 0.14 150)', color: '#fff' },
  }[variant];
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      height: sizes.h, padding: `0 ${sizes.px}px`, borderRadius: sizes.r,
      background: variants.bg, color: variants.color,
      fontSize: sizes.fs, fontWeight: 600, letterSpacing: -0.1,
      border: 0, fontFamily: T.font,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
      width: full ? '100%' : undefined, flexShrink: 0,
      ...style,
    }}>
      {icon}
      {children}
    </button>
  );
}

function NavBar({ title, leading, trailing, large, sub }) {
  return (
    <div style={{ background: T.bg, paddingTop: 4 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 8px 4px', minHeight: 44,
      }}>
        <div style={{ minWidth: 60, display: 'flex', alignItems: 'center', gap: 4 }}>{leading}</div>
        {!large && <div style={{ fontSize: 17, fontWeight: 600, color: T.ink, letterSpacing: -0.4 }}>{title}</div>}
        <div style={{ minWidth: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>{trailing}</div>
      </div>
      {large && (
        <div style={{ padding: '6px 16px 8px' }}>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.8, color: T.ink, fontFamily: T.fontDisplay, lineHeight: 1.1 }}>{title}</div>
          {sub && <div style={{ marginTop: 4, fontSize: 14, color: T.muted }}>{sub}</div>}
        </div>
      )}
    </div>
  );
}

function NavBtn({ children, onClick, primary }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 0, padding: '6px 8px',
      color: T.accent, fontSize: 17, fontWeight: primary ? 600 : 400,
      fontFamily: T.font, letterSpacing: -0.4, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>{children}</button>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'inbox', label: 'Inbox', icon: 'inbox' },
    { id: 'entities', label: 'Files', icon: 'building' },
    { id: 'capture', label: '', icon: 'capture' },
    { id: 'calendar', label: 'Calendar', icon: 'cal' },
    { id: 'ask', label: 'Ask', icon: 'sparkle' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: 30, paddingTop: 8,
      background: 'rgba(247,247,250,0.92)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderTop: `0.5px solid ${T.sep}`,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      zIndex: 30,
    }}>
      {tabs.map(t => {
        if (t.id === 'capture') {
          return (
            <button key="capture" onClick={() => onChange('capture')} style={{
              width: 56, height: 56, borderRadius: 28, border: 0,
              background: T.ink, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.1)',
              marginTop: -16, cursor: 'pointer',
            }}>{Ic.camera(26, '#fff')}</button>
          );
        }
        const isActive = active === t.id;
        const c = isActive ? T.accent : T.muted;
        const iconMap = { inbox: Ic.inbox, building: Ic.building, cal: Ic.cal, sparkle: Ic.sparkle };
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            border: 0, background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '4px 12px', color: c,
          }}>
            {iconMap[t.icon](24, c)}
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 0.1 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function EntityChip({ entity, selected, onClick, dense }) {
  const e = entity;
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: dense ? '5px 10px 5px 7px' : '7px 12px 7px 9px', borderRadius: 999,
      border: selected ? `1.5px solid ${T.ink}` : `1px solid ${T.hair}`,
      background: selected ? T.ink : T.bgCard,
      color: selected ? '#fff' : T.ink,
      fontSize: dense ? 12 : 13, fontWeight: 500, fontFamily: T.font,
      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: e.color, flexShrink: 0 }} />
      {e.name.replace(' · ', ' ')}
    </button>
  );
}

// A grayscale "scan" of a captured document — striped placeholder w/ extracted-field shading.
function DocPreview({ kind = 'lambeth', height = 180 }) {
  const palettes = {
    lambeth: { bg: '#F4F1EC', stripe: 'rgba(0,0,0,0.04)', accent: 'oklch(0.55 0.10 25)' },
    pcn: { bg: '#FFFCF4', stripe: 'rgba(120,60,0,0.06)', accent: 'oklch(0.55 0.18 30)' },
    rates: { bg: '#F1F4F2', stripe: 'rgba(0,40,20,0.04)', accent: 'oklch(0.50 0.10 160)' },
    mot: { bg: '#F0F2F6', stripe: 'rgba(0,30,80,0.05)', accent: 'oklch(0.50 0.12 240)' },
    gas: { bg: '#FBF6F0', stripe: 'rgba(80,40,0,0.05)', accent: 'oklch(0.55 0.13 50)' },
    hiscox: { bg: '#F5F2F8', stripe: 'rgba(40,0,80,0.05)', accent: 'oklch(0.50 0.10 290)' },
    hmrc: { bg: '#F2F4F0', stripe: 'rgba(20,40,0,0.06)', accent: 'oklch(0.50 0.10 130)' },
  };
  const p = palettes[kind] || palettes.lambeth;
  return (
    <div style={{
      height, background: p.bg, borderRadius: 8, position: 'relative', overflow: 'hidden',
      backgroundImage: `repeating-linear-gradient(0deg, transparent 0 6px, ${p.stripe} 6px 7px)`,
      border: '0.5px solid rgba(0,0,0,0.06)',
    }}>
      <div style={{ position: 'absolute', top: 14, left: 14, right: 14 }}>
        <div style={{ width: 70, height: 8, background: p.accent, borderRadius: 2, opacity: 0.7 }} />
        <div style={{ width: 130, height: 5, background: 'rgba(0,0,0,0.25)', borderRadius: 2, marginTop: 8 }} />
        <div style={{ width: 90, height: 5, background: 'rgba(0,0,0,0.18)', borderRadius: 2, marginTop: 5 }} />
      </div>
      <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
        <div style={{ width: '70%', height: 4, background: 'rgba(0,0,0,0.14)', borderRadius: 2 }} />
        <div style={{ width: '50%', height: 4, background: 'rgba(0,0,0,0.10)', borderRadius: 2, marginTop: 4 }} />
        <div style={{ width: '60%', height: 4, background: 'rgba(0,0,0,0.10)', borderRadius: 2, marginTop: 4 }} />
      </div>
    </div>
  );
}

window.UI = { T, StatusPill, Card, ListGroup, Row, Btn, NavBar, NavBtn, TabBar, EntityChip, DocPreview };
