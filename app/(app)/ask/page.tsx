'use client';

import React from 'react';
import { useSelectedItem } from '../layout';
import { AskView } from '@/components/mobile/screens/ask';
import { DesktopAsk } from '@/components/desktop/desktop-ask';

export default function AskPage() {
  const { setSelectedItemId } = useSelectedItem();

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden" style={{ paddingBottom: 100 }}>
        <AskView key="new-mobile" onOpenItem={(id) => setSelectedItemId(id)} />
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <DesktopAsk key="new-desktop" />
      </div>
    </>
  );
}
