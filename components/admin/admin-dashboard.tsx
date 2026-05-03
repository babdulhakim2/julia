'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getIcon } from '@/components/icons';

export function AdminDashboard({ search = '' }: { search?: string }) {
  const data = useQuery(api.admin.dashboard);

  if (!data) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Loading dashboard...
      </div>
    );
  }

  const { stats, tenants, entities } = data;

  const filteredEntities = entities.filter(entity => {
    const q = search.trim().toLowerCase();
    return !q || entity.name.toLowerCase().includes(q) || entity.kind.includes(q);
  });

  return (
    <div style={{ padding: '18px 24px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <Stat label="Open work" value={stats.openWork} tone="ink" />
        <Stat label="Needs review" value={stats.needsReview} tone="review" />
        <Stat label="Due soon" value={stats.dueSoon} tone="due" />
        <Stat label="Overdue" value={stats.overdue} tone="overdue" />
      </div>

      <Section title="Tenants" action={`${tenants.length} active`}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr 0.5fr 0.5fr 0.5fr 0.5fr 0.7fr', gap: 0, fontSize: 12, color: 'var(--muted)', fontWeight: 600, padding: '0 12px 8px' }}>
          <span>Tenant</span><span>Plan</span><span>Users</span><span>Entities</span><span>Docs</span><span>Reminders</span><span>Health</span>
        </div>
        {tenants.map(tenant => (
          <div key={tenant.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr 0.5fr 0.5fr 0.5fr 0.5fr 0.7fr', gap: 0, alignItems: 'center', padding: '11px 12px', borderTop: '0.5px solid var(--hair)' }}>
            <div>
              <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{tenant.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{tenant.openDocs} open · {tenant.needsReview} review</div>
            </div>
            <Cell>{tenant.plan}</Cell>
            <Cell>{tenant.userCount}</Cell>
            <Cell>{tenant.entityCount}</Cell>
            <Cell>{tenant.documentCount}</Cell>
            <Cell>{tenant.reminderCount}</Cell>
            <StatusBadge state={tenant.health === 'healthy' ? 'ready' : tenant.health === 'review' ? 'warning' : 'needs_setup'} label={tenant.health} />
          </div>
        ))}
      </Section>

      <Section title="Entity Usage" action={`${filteredEntities.length} shown`}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr 0.6fr 0.6fr 0.6fr', gap: 0, fontSize: 12, color: 'var(--muted)', fontWeight: 600, padding: '0 12px 8px' }}>
          <span>Entity</span><span>Docs</span><span>Open</span><span>Overdue</span><span>Review</span>
        </div>
        {filteredEntities.map(entity => (
          <div key={entity.entityId} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr 0.6fr 0.6fr 0.6fr', gap: 0, alignItems: 'center', padding: '10px 12px', borderTop: '0.5px solid var(--hair)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: entity.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{getIcon(entity.icon, 13, '#fff')}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entity.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{entity.kind}</div>
              </div>
            </div>
            <Cell>{entity.docs}</Cell>
            <Cell>{entity.open}</Cell>
            <Cell>{entity.overdue}</Cell>
            <Cell>{entity.review}</Cell>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '0.5px solid var(--sep)', borderRadius: 8, background: '#FAF9F5', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 10px' }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: 0, fontFamily: 'var(--font-display)' }}>{title}</h2>
        {action && <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{action}</span>}
      </div>
      <div style={{ padding: '0 0 12px' }}>{children}</div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: 'ink' | 'review' | 'due' | 'overdue' }) {
  const color = tone === 'review' ? 'oklch(0.55 0.20 25)' : tone === 'due' ? 'oklch(0.55 0.14 80)' : tone === 'overdue' ? 'oklch(0.50 0.18 25)' : 'var(--ink)';
  return (
    <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, background: '#fff', padding: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, color, fontWeight: 750, marginTop: 6, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{children}</div>;
}

type BadgeState = 'ready' | 'needs_setup' | 'planned' | 'warning';

function StatusBadge({ state, label }: { state: BadgeState; label?: string }) {
  const styles: Record<BadgeState, { bg: string; color: string; text: string }> = {
    ready: { bg: 'oklch(0.95 0.04 150)', color: 'oklch(0.48 0.12 150)', text: 'Ready' },
    needs_setup: { bg: 'oklch(0.95 0.04 25)', color: 'oklch(0.55 0.20 25)', text: 'Setup' },
    planned: { bg: 'rgba(118,118,128,0.10)', color: 'var(--muted)', text: 'Planned' },
    warning: { bg: 'oklch(0.96 0.05 80)', color: 'oklch(0.50 0.14 80)', text: 'Review' },
  };
  const s = styles[state];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, padding: '3px 8px', background: s.bg, color: s.color, fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize' }}>
      {label || s.text}
    </span>
  );
}
