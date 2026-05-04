'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useSelectedItem } from '../layout';
import { InboxView } from '@/components/mobile/screens/inbox';
import { DesktopDashboard } from '@/components/desktop/desktop-dashboard';
import { PageHeader } from '@/components/desktop/page-header';

export default function InboxPage() {
  const { state } = useStore();
  const router = useRouter();
  const { selectedItemId, setSelectedItemId } = useSelectedItem();
  const [search, setSearch] = useState('');

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden" style={{ paddingBottom: 100 }}>
        <InboxView
          onOpenItem={(id) => router.push(`/inbox?item=${id}`)}
          onOpenEntity={(id) => router.push(`/docs/${id}`)}
          onNavigate={(tab) => {
            if (tab === 'ask') router.push('/ask');
            else if (tab === 'calendar') router.push('/calendar');
            else if (tab === 'entities') router.push('/docs');
          }}
        />
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <PageHeader
          title="Everything"
          subtitle={`${state.items.filter(i => i.status !== 'done').length} open · ${state.items.length} total`}
          search={search}
          setSearch={setSearch}
          semanticSearch
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DesktopDashboard
            items={state.items}
            entities={state.entities}
            search={search}
            selectedItemId={selectedItemId}
            setSelectedItemId={setSelectedItemId}
          />
        </div>
      </div>
    </>
  );
}
