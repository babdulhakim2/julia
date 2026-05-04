'use client';

import React from 'react';
import { Streamdown } from 'streamdown';
import { DocumentCitationCard } from './document-citation-card';

interface MarkdownMessageProps {
  content: string;
  onDocumentPreview?: (documentId: string) => void;
}

const DOC_LINK_PREFIX = 'https://julia.local/doc/';

function normalizeDocumentLinks(markdown: string) {
  return markdown.replace(/\]\(doc:([^)]+)\)/g, (_, rawId: string) => {
    return `](${DOC_LINK_PREFIX}${encodeURIComponent(rawId.trim())})`;
  });
}

function documentIdFromHref(href?: string) {
  if (!href) return null;
  if (href.startsWith(DOC_LINK_PREFIX)) {
    return decodeURIComponent(href.slice(DOC_LINK_PREFIX.length));
  }
  const docMatch = href.match(/doc:([^)\s]+)/);
  return docMatch?.[1] ?? null;
}

function textFromChildren(children: React.ReactNode) {
  return React.Children.toArray(children)
    .map(child => (typeof child === 'string' || typeof child === 'number' ? String(child) : ''))
    .join('')
    .trim();
}

export function MarkdownMessage({ content, onDocumentPreview }: MarkdownMessageProps) {
  return (
    <Streamdown
      mode="streaming"
      parseIncompleteMarkdown
      linkSafety={{ enabled: false }}
      urlTransform={(url) => url}
      components={{
        h1: ({ children }) => (
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)', margin: '12px 0 6px', lineHeight: 1.3 }}>
            {children}
          </div>
        ),
        h2: ({ children }) => (
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)', margin: '10px 0 4px', lineHeight: 1.3 }}>
            {children}
          </div>
        ),
        h3: ({ children }) => (
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)', margin: '8px 0 4px', lineHeight: 1.3 }}>
            {children}
          </div>
        ),
        p: ({ children }) => (
          <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, margin: '4px 0' }}>
            {children}
          </div>
        ),
        ul: ({ children }) => (
          <ul style={{ margin: '4px 0', paddingLeft: 20, fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol style={{ margin: '4px 0', paddingLeft: 20, fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li style={{ marginBottom: 2 }}>
            {children}
          </li>
        ),
        strong: ({ children }) => (
          <strong style={{ fontWeight: 700, color: 'var(--ink)' }}>
            {children}
          </strong>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.startsWith('language-');
          if (isBlock) {
            return (
              <pre style={{
                background: 'rgba(0,0,0,0.04)', borderRadius: 6, padding: '10px 12px',
                margin: '6px 0', overflowX: 'auto', fontSize: 13, lineHeight: 1.5,
                fontFamily: 'monospace',
              }}>
                <code>{children}</code>
              </pre>
            );
          }
          return (
            <code style={{
              background: 'rgba(0,0,0,0.06)', borderRadius: 3, padding: '1px 5px',
              fontSize: 13, fontFamily: 'monospace',
            }}>
              {children}
            </code>
          );
        },
        a: ({ href, children }) => {
          const linkedDocId = documentIdFromHref(href);
          if (linkedDocId && onDocumentPreview) {
            let docId = linkedDocId;
            // Strip the "doc-" prefix the store adds to Convex IDs
            if (docId.startsWith('doc-')) {
              docId = docId.slice(4);
            }
            const title = textFromChildren(children) || docId;
            return <DocumentCitationCard documentId={docId} title={title} onPreview={onDocumentPreview} />;
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{
              color: 'var(--accent)', textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}>
              {children}
            </a>
          );
        },
        blockquote: ({ children }) => (
          <blockquote style={{
            borderLeft: '3px solid var(--sep)', paddingLeft: 12, margin: '6px 0',
            color: 'var(--ink2)', fontStyle: 'italic',
          }}>
            {children}
          </blockquote>
        ),
        hr: () => (
          <hr style={{ border: 'none', borderTop: '1px solid var(--sep)', margin: '10px 0' }} />
        ),
      }}
    >
      {normalizeDocumentLinks(content)}
    </Streamdown>
  );
}
