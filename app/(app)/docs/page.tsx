'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EntitiesList } from '@/components/mobile/screens/entities-list';
import { useStore } from '@/lib/store';
import { PageHeader } from '@/components/desktop/page-header';
import { getIcon } from '@/components/icons';
import { CATEGORIES, STATUS_META } from '@/lib/data';

export default function DocsPage() {
  const { state } = useStore();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const entityStats = useMemo(() => {
    const stats = new Map(state.entities.map(entity => [entity.id, {
      count: 0,
      openCount: 0,
      urgentCount: 0,
      categoryCounts: new Map<string, number>(),
    }]));

    for (const item of state.items) {
      if (!item.entity) continue;
      const current = stats.get(item.entity);
      if (!current) continue;
      current.count += 1;
      if (item.status !== 'done') current.openCount += 1;
      if (item.status === 'overdue' || item.status === 'due_soon' || item.status === 'needs_review') {
        current.urgentCount += 1;
      }
      current.categoryCounts.set(item.category, (current.categoryCounts.get(item.category) ?? 0) + 1);
    }

    return new Map(Array.from(stats.entries()).map(([entityId, stat]) => {
      const mostCommonCategory = CATEGORIES
        .map(category => ({
          ...category,
          count: stat.categoryCounts.get(category.id) ?? 0,
        }))
        .sort((a, b) => b.count - a.count)[0];
      return [entityId, { ...stat, mostCommonCategory }];
    }));
  }, [state.entities, state.items]);

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
            {state.entities.filter(e => {
              const needle = search.toLowerCase();
              return search === '' ||
                e.name.toLowerCase().includes(needle) ||
                e.sub.toLowerCase().includes(needle) ||
                Object.values(e.info).some(value => value.toLowerCase().includes(needle));
            }).map(e => {
              const stats = entityStats.get(e.id);
              const count = stats?.count ?? 0;
              const openCount = stats?.openCount ?? 0;
              const urgentCount = stats?.urgentCount ?? 0;
              const mostCommonCategory = stats?.mostCommonCategory;
              const categorySummary = mostCommonCategory && mostCommonCategory.count > 0 ? mostCommonCategory : null;
              return (
                <button key={e.id} onClick={() => router.push(`/docs/${e.id}`)} style={{
                  display: 'grid',
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  background: '#FAF9F5', border: '0.5px solid var(--sep)',
                  cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(ev) => ev.currentTarget.style.background = 'var(--row-hover)'}
                onMouseLeave={(ev) => ev.currentTarget.style.background = '#FAF9F5'}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{
                      width: 54, height: 42, borderRadius: 10, background: e.color, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      boxShadow: 'inset 0 -10px 18px rgba(0,0,0,0.10)',
                    }}>
                      {getIcon(e.icon, 22, '#fff')}
                    </div>
                    {urgentCount > 0 && (
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 800,
                        background: STATUS_META.due_soon.bg,
                        color: STATUS_META.due_soon.color,
                        whiteSpace: 'nowrap',
                      }}>
                        {urgentCount} attention
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.sub}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      <span style={{ color: 'var(--ink)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{count}</span> docs
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      <span style={{ color: 'var(--ink)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{openCount}</span> open
                    </div>
                  </div>
                  {categorySummary && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: categorySummary.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Mostly {categorySummary.name}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
