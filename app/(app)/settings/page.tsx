'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MobileSettings } from '@/components/mobile/screens/settings';
import { DesktopSettings } from '@/components/desktop/desktop-settings';
import { PageHeader } from '@/components/desktop/page-header';

export default function SettingsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden" style={{ paddingBottom: 100 }}>
        <MobileSettings onBack={() => router.back()} />
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <PageHeader
          title="Settings"
          subtitle="Profile, entities & preferences"
          search={search}
          setSearch={setSearch}
          onCapture={() => {}}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DesktopSettings />
        </div>
      </div>
    </>
  );
}
