'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { DocPreview } from '@/components/ui/doc-preview';
import { Ic } from '@/components/icons';

interface DocumentThumbProps {
  documentId?: string;
  fallbackKind?: string;
  height?: number;
  title?: string;
}

export function DocumentThumb({ documentId, fallbackKind = 'lambeth', height = 80, title }: DocumentThumbProps) {
  const files = useQuery(
    api.files.listByDocumentId,
    documentId ? { documentId: documentId as Id<'documents'> } : 'skip',
  );

  if (!documentId) {
    return <DocPreview kind={fallbackKind} height={height} />;
  }

  const file = files?.[0];
  const isImage = file?.contentType?.startsWith('image/');
  const isPdf = file?.contentType === 'application/pdf';

  if (files === undefined) {
    return (
      <div style={{
        height, borderRadius: 6, background: '#f0efea', border: '0.5px solid var(--sep)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: 'rgba(0,0,0,0.08)' }} />
      </div>
    );
  }

  if (isImage && file?.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={file.url}
        alt={title ?? file.fileName ?? 'Document'}
        style={{ width: '100%', height, objectFit: 'cover', display: 'block' }}
      />
    );
  }

  if (isPdf && file?.url) {
    return (
      <iframe
        src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0`}
        title={title ?? file.fileName ?? 'PDF preview'}
        style={{ width: '100%', height, border: 0, display: 'block', pointerEvents: 'none', background: '#fff' }}
      />
    );
  }

  return (
    <div style={{
      height, borderRadius: 6, background: '#FAF9F5', border: '0.5px solid var(--sep)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      color: 'var(--muted)', overflow: 'hidden',
    }}>
      {Ic.doc(Math.min(28, Math.max(14, height / 3)), 'var(--muted)')}
      <span style={{ fontSize: 10, fontWeight: 600, maxWidth: '85%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file?.contentType?.split('/').pop()?.toUpperCase() ?? 'FILE'}
      </span>
    </div>
  );
}
