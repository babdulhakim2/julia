'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useSelectedItem } from '../layout';
import { CalendarView } from '@/components/mobile/screens/calendar';
import { DesktopCalendar } from '@/components/desktop/desktop-calendar';
import { PageHeader } from '@/components/desktop/page-header';

export default function CalendarPage() {
  const { state } = useStore();
  const router = useRouter();
  const { selectedItemId, setSelectedItemId } = useSelectedItem();
  const [search, setSearch] = useState('');
  const ent = Object.fromEntries(state.entities.map(e => [e.id, e]));
  const dueSoon = state.items.filter(i => i.status === 'due_soon' || i.status === 'overdue').length;

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden" style={{ paddingBottom: 100 }}>
        <CalendarView onOpenItem={(id) => setSelectedItemId(id)} />
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <PageHeader
          title="Calendar"
          subtitle="Everything dated, across every entity"
          search={search}
          setSearch={setSearch}
          onCapture={() => {}}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DesktopCalendar items={state.items} ent={ent} onSelect={setSelectedItemId} />
        </div>
      </div>
    </>
  );
}
