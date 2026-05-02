'use client';

import React from 'react';

const palettes: Record<string, { bg: string; stripe: string; accent: string }> = {
  lambeth: { bg: '#F4F1EC', stripe: 'rgba(0,0,0,0.04)', accent: 'oklch(0.55 0.10 25)' },
  pcn: { bg: '#FFFCF4', stripe: 'rgba(120,60,0,0.06)', accent: 'oklch(0.55 0.18 30)' },
  rates: { bg: '#F1F4F2', stripe: 'rgba(0,40,20,0.04)', accent: 'oklch(0.50 0.10 160)' },
  mot: { bg: '#F0F2F6', stripe: 'rgba(0,30,80,0.05)', accent: 'oklch(0.50 0.12 240)' },
  gas: { bg: '#FBF6F0', stripe: 'rgba(80,40,0,0.05)', accent: 'oklch(0.55 0.13 50)' },
  hiscox: { bg: '#F5F2F8', stripe: 'rgba(40,0,80,0.05)', accent: 'oklch(0.50 0.10 290)' },
  hmrc: { bg: '#F2F4F0', stripe: 'rgba(20,40,0,0.06)', accent: 'oklch(0.50 0.10 130)' },
};

interface DocPreviewProps {
  kind?: string;
  height?: number;
}

export function DocPreview({ kind = 'lambeth', height = 180 }: DocPreviewProps) {
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
