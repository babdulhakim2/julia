'use client';

import React from 'react';
import { Ic } from '@/components/icons';

interface DocumentCitationCardProps {
  documentId: string;
  title: string;
  onPreview: (documentId: string) => void;
}

export function DocumentCitationCard({ documentId, title, onPreview }: DocumentCitationCardProps) {
  return (
    <button
      onClick={() => onPreview(documentId)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 6,
        background: 'rgba(78, 96, 255, 0.08)',
        border: '0.5px solid rgba(78, 96, 255, 0.18)',
        cursor: 'pointer',
        fontSize: 12.5,
        fontWeight: 500,
        color: 'var(--accent)',
        fontFamily: 'var(--font)',
        lineHeight: 1.4,
        verticalAlign: 'middle',
      }}
    >
      {Ic.doc(13, 'var(--accent)')}
      {title}
    </button>
  );
}
