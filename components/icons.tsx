import React from 'react';

export const Ic = {
  inbox: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 13l2.5-7A2 2 0 0 1 7.4 4.5h9.2a2 2 0 0 1 1.9 1.5L21 13M3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5M3 13h5l1.5 2.5h5L16 13h5"
        stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  camera: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 8.5A2 2 0 0 1 5 6.5h2.2l1.5-2.2h6.6l1.5 2.2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z"
        stroke={c} strokeWidth="1.7" strokeLinejoin="round"/>
      <circle cx="12" cy="13.5" r="3.6" stroke={c} strokeWidth="1.7"/>
    </svg>
  ),
  building: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M16 21V11h2a2 2 0 0 1 2 2v8M5 21h15M9 7h3M9 11h3M9 15h3"
        stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  cal: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke={c} strokeWidth="1.7"/>
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  search: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6.5" stroke={c} strokeWidth="1.7"/>
      <path d="M16 16l4.5 4.5" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  contacts: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="9" r="3.6" stroke={c} strokeWidth="1.7"/>
      <path d="M5 20c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  sparkle: (s = 16, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z" fill={c}/>
      <path d="M19 16l.7 1.8L21.5 18l-1.8.7L19 20.5l-.7-1.8L16.5 18l1.8-.7L19 16z" fill={c} opacity="0.7"/>
    </svg>
  ),
  check: (s = 18, c = 'currentColor', sw = 2) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.5 4.5L19 7" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  x: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  plus: (s = 18, c = 'currentColor', sw = 2) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={c} strokeWidth={sw} strokeLinecap="round"/>
    </svg>
  ),
  chevron: (s = 14, c = 'currentColor', dir: 'right' | 'left' | 'up' | 'down' = 'right') => {
    const r = { right: 0, left: 180, up: 270, down: 90 }[dir];
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${r}deg)` }}>
        <path d="M9 5l7 7-7 7" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  },
  back: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M15 5l-7 7 7 7" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  bolt: (s = 16, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill={c}/>
    </svg>
  ),
  car: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 14l2-5.5A2.5 2.5 0 0 1 7.4 7h9.2a2.5 2.5 0 0 1 2.4 1.5L21 14M3 14v4a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1.5M3 14h18M21 14v4a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.5"
        stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="7.5" cy="14.5" r="1" fill={c}/><circle cx="16.5" cy="14.5" r="1" fill={c}/>
    </svg>
  ),
  home: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 11.5L12 4l9 7.5M5.5 10v9.5a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V10"
        stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  user: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8.5" r="3.5" stroke={c} strokeWidth="1.7"/>
      <path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  flash: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/>
    </svg>
  ),
  paperclip: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M20 11.5l-7.5 7.5a4.5 4.5 0 0 1-6.4-6.4l8.6-8.6a3 3 0 1 1 4.3 4.3l-8.6 8.6a1.5 1.5 0 0 1-2.1-2.1l7.5-7.5"
        stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  mic: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="12" rx="3" stroke={c} strokeWidth="1.7"/>
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  bell: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16zM10 20a2 2 0 0 0 4 0"
        stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  doc: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M8 12h8M8 15h8M8 18h5" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  pound: (s = 16, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M16 6a4 4 0 0 0-7 2.7c0 5.2-1 7.3-3 9.3h12M7 13h6" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  edit: (s = 16, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  arrowUp: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5M5 12l7-7 7 7" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  bookmark: (s = 16, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 3h12v18l-6-4-6 4V3z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/>
    </svg>
  ),
  calendarPlus: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke={c} strokeWidth="1.7"/>
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5M12 12v5M9.5 14.5h5" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  thumbtack: (s = 16, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M14 3l7 7-3 1-3 5-3-3-5 5v-5l-3-3 5-3 1-3 4-1z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/>
    </svg>
  ),
  dots: (s = 16, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="6" r="1.5" fill={c}/>
      <circle cx="12" cy="12" r="1.5" fill={c}/>
      <circle cx="12" cy="18" r="1.5" fill={c}/>
    </svg>
  ),
} as const;

// Type helper for accessing icons by dynamic key
export type IconKey = keyof typeof Ic;

export function getIcon(key: string, size?: number, color?: string) {
  const fn = Ic[key as IconKey];
  if (!fn) return null;
  return fn(size, color);
}
