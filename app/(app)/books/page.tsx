'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useActiveWorkspace } from '@/lib/admin-view';
import { BookkeepingPanel } from '@/components/shared/bookkeeping-panel';
import { PageHeader } from '@/components/desktop/page-header';
import { Ic } from '@/components/icons';

type BooksRange = 'today' | 'month' | 'quarter' | 'year' | 'all';

export default function BooksPage() {
  const { workspace } = useActiveWorkspace();
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<BooksRange>('month');
  const entities = useQuery(
    api.entities.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : 'skip',
  );
  const summaryRange = rangeBounds(range);
  const snapshot = useQuery(
    api.bookkeeping.todaySnapshot,
    workspace ? { workspaceId: workspace._id, from: summaryRange.from, to: summaryRange.to } : 'skip',
  );

  const businesses = (entities ?? [])
    .filter(e => e.kind === 'business')
    .filter(e => {
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      return e.name.toLowerCase().includes(needle) || (e.subtitle ?? '').toLowerCase().includes(needle);
    });

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden" style={{ paddingBottom: 100 }}>
        <header style={{ padding: '18px 16px 4px' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: -0.5, fontFamily: 'var(--font-display)', margin: 0 }}>
            Books
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Daily takings and expenses for each business. Export to send to your accountant.
          </p>
        </header>
        <BooksSnapshot snapshot={snapshot} range={range} setRange={setRange} compact />
        <BodyList businesses={businesses} loading={entities === undefined} compact />
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <PageHeader
          title="Books"
          subtitle={
            entities === undefined
              ? 'Loading…'
              : `${businesses.length} business${businesses.length === 1 ? '' : 'es'}`
          }
          search={search}
          setSearch={setSearch}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <BooksSnapshot snapshot={snapshot} range={range} setRange={setRange} />
          <BodyList businesses={businesses} loading={entities === undefined} />
        </div>
      </div>
    </>
  );
}

function BooksSnapshot({
  snapshot,
  range,
  setRange,
  compact,
}: {
  snapshot: {
    income: number;
    expense: number;
    net: number;
    count: number;
    entities: Array<{
      entityId: string;
      entityName: string;
      entityColor: string;
      income: number;
      expense: number;
      net: number;
      count: number;
    }>;
  } | undefined;
  range: BooksRange;
  setRange: (range: BooksRange) => void;
  compact?: boolean;
}) {
  const label = rangeLabel(range);
  return (
    <section style={{ padding: compact ? '12px 16px 0' : '18px 24px 0' }}>
      <div style={{
        border: '0.5px solid var(--sep)',
        borderRadius: 10,
        background: '#fff',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: compact ? 14 : 16,
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : '1fr auto',
          gap: compact ? 12 : 18,
          alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Books summary
              </div>
              <select value={range} onChange={event => setRange(event.target.value as BooksRange)} style={{
                border: '0.5px solid var(--sep)',
                borderRadius: 8,
                background: '#FAF9F5',
                color: 'var(--ink)',
                padding: '6px 8px',
                fontSize: 12,
                fontFamily: 'var(--font)',
                fontWeight: 700,
              }}>
                <option value="today">Today</option>
                <option value="month">This month</option>
                <option value="quarter">This quarter</option>
                <option value="year">This year</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div style={{ marginTop: 4, fontSize: compact ? 20 : 22, color: 'var(--ink)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              Income {money(snapshot?.income ?? 0)} · Expenses {money(snapshot?.expense ?? 0)}
            </div>
            <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--muted)' }}>
              {snapshot === undefined
                ? `Loading ${label.toLowerCase()} records…`
                : snapshot.count === 0
                  ? `No takings or expenses logged for ${label.toLowerCase()}.`
                  : `${label}: net ${money(snapshot.net)} across ${snapshot.count} record${snapshot.count === 1 ? '' : 's'}.`}
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(120px, auto))',
            gap: 8,
          }}>
            <SnapshotMetric label="Income" value={money(snapshot?.income ?? 0)} tone="income" />
            <SnapshotMetric label="Expenses" value={money(snapshot?.expense ?? 0)} tone="expense" />
            <SnapshotMetric label="Net" value={money(snapshot?.net ?? 0)} tone="net" />
          </div>
        </div>
        {(snapshot?.entities.length ?? 0) > 0 && (
          <div style={{ borderTop: '0.5px solid var(--hair)', padding: compact ? '10px 14px' : '10px 16px' }}>
            {snapshot!.entities.slice(0, compact ? 3 : 5).map((entity, index) => (
              <div key={entity.entityId} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                alignItems: 'center',
                padding: '7px 0',
                borderBottom: index === Math.min(snapshot!.entities.length, compact ? 3 : 5) - 1 ? 'none' : '0.5px solid var(--hair)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: entity.entityColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entity.entityName}
                  </span>
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {money(entity.income)} in · {money(entity.expense)} out
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SnapshotMetric({ label, value, tone }: { label: string; value: string; tone: 'income' | 'expense' | 'net' }) {
  const color = tone === 'income'
    ? 'oklch(0.45 0.13 150)'
    : tone === 'expense'
      ? 'oklch(0.50 0.16 25)'
      : 'var(--ink)';
  return (
    <div style={{
      border: '0.5px solid var(--sep)', borderRadius: 8,
      background: '#FAF9F5', padding: '9px 10px',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ marginTop: 3, fontSize: 15, color, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}

function BodyList({
  businesses,
  loading,
  compact,
}: {
  businesses: Array<{ _id: string; name: string; subtitle?: string; color: string; icon: string }>;
  loading: boolean;
  compact?: boolean;
}) {
  if (loading) {
    return (
      <div style={{ padding: compact ? 16 : 24, fontSize: 13, color: 'var(--muted)' }}>
        Loading entities…
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div style={{ padding: compact ? 16 : 24 }}>
        <div style={{
          border: '0.5px solid var(--sep)',
          background: '#FAF9F5',
          borderRadius: 12,
          padding: compact ? '20px 16px' : '24px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 8, background: 'var(--ink)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{Ic.pound(16, '#fff')}</span>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>No business yet</h2>
          </div>
          <p style={{ margin: '4px 0 12px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            Books shows daily takings and expenses for each business you set up. Add one in Settings to start tracking.
          </p>
          <Link href="/settings" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: 0, borderRadius: 7, background: 'var(--ink)', color: '#fff',
            padding: '8px 12px', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)', textDecoration: 'none',
          }}>{Ic.plus(13, '#fff', 2.4)} Add a business</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: compact ? 0 : 32 }}>
      {businesses.map((entity) => (
        <section key={entity._id} style={{ marginBottom: compact ? 4 : 8 }}>
          <div style={{
            padding: compact ? '12px 16px 0' : '16px 24px 0',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              width: 26, height: 26, borderRadius: 7, background: entity.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{Ic.pound(13, '#fff')}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: compact ? 14 : 14.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entity.name}
              </div>
              {entity.subtitle && (
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entity.subtitle}
                </div>
              )}
            </div>
            <Link href={`/docs/${entity._id}`} style={{
              fontSize: 11.5, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none',
              padding: '4px 8px', borderRadius: 6,
            }}>
              Open files →
            </Link>
          </div>
          <BookkeepingPanel
            entityId={entity._id}
            entityName={entity.name}
            compact={compact}
          />
        </section>
      ))}
    </div>
  );
}

function rangeBounds(range: BooksRange) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === 'month') {
    start.setDate(1);
  } else if (range === 'quarter') {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
  } else if (range === 'year') {
    start.setMonth(0, 1);
  } else if (range === 'all') {
    start.setTime(0);
  }
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { from: start.getTime(), to: end.getTime() };
}

function rangeLabel(range: BooksRange) {
  if (range === 'today') return 'Today';
  if (range === 'month') return 'This month';
  if (range === 'quarter') return 'This quarter';
  if (range === 'year') return 'This year';
  return 'All time';
}

function money(amountMinor: number) {
  const sign = amountMinor < 0 ? '-' : '';
  return `${sign}\u00a3${Math.abs(amountMinor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
