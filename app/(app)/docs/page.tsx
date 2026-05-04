'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { EntitiesList } from '@/components/mobile/screens/entities-list';
import { useStore } from '@/lib/store';
import { PageHeader } from '@/components/desktop/page-header';
import { getIcon } from '@/components/icons';
import { useState } from 'react';

export default function DocsPage() {
  const { state } = useStore();
  const router = useRouter();
  const [search, setSearch] = useState('');

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden" style={{ paddingBottom: 100 }}>
        <EntitiesList
          onOpenEntity={(id) => router.push(`/docs/${id}`)}
          onOpenSearch={() => router.push('/ask')}
          onOpenSettings={() => router.push('/settings')}
        />
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <PageHeader
          title="Docs"
          subtitle={`${state.entities.length} entities`}
          search={search}
          setSearch={setSearch}
          semanticSearch
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {state.entities.filter(e => {
              const needle = search.toLowerCase();
              return search === '' ||
                e.name.toLowerCase().includes(needle) ||
                e.sub.toLowerCase().includes(needle) ||
                Object.values(e.info).some(value => value.toLowerCase().includes(needle));
            }).map(e => {
              const count = state.items.filter(i => i.entity === e.id).length;
              const openCount = state.items.filter(i => i.entity === e.id && i.status !== 'done').length;
              return (
                <button key={e.id} onClick={() => router.push(`/docs/${e.id}`)} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: 16, borderRadius: 12,
                  background: '#FAF9F5', border: '0.5px solid var(--sep)',
                  cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(ev) => ev.currentTarget.style.background = 'var(--row-hover)'}
                onMouseLeave={(ev) => ev.currentTarget.style.background = '#FAF9F5'}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: e.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {getIcon(e.icon, 20, '#fff')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{e.sub}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{count}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{openCount} open</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
