'use client';

import React, { useState } from 'react';
import { useSelectedItem } from '../layout';
import { AskView } from '@/components/mobile/screens/ask';
import { DesktopAsk } from '@/components/desktop/desktop-ask';
import { PageHeader } from '@/components/desktop/page-header';

export default function AskPage() {
  const { setSelectedItemId } = useSelectedItem();
  const [search, setSearch] = useState('');

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden" style={{ paddingBottom: 100 }}>
        <AskView onOpenItem={(id) => setSelectedItemId(id)} />
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <PageHeader
          title="Ask"
          subtitle="Conversational answers from your filing"
          search={search}
          setSearch={setSearch}
          onCapture={() => {}}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DesktopAsk />
        </div>
      </div>
    </>
  );
}
