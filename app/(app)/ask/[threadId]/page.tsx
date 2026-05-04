'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import type { Id } from '@/convex/_generated/dataModel';
import { useSelectedItem } from '../../layout';
import { AskView } from '@/components/mobile/screens/ask';
import { DesktopAsk } from '@/components/desktop/desktop-ask';

export default function ThreadPage() {
  const params = useParams();
  const threadId = params.threadId as Id<"chatThreads">;
  const { setSelectedItemId } = useSelectedItem();

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden" style={{ paddingBottom: 100 }}>
        <AskView key={`mobile-${threadId}`} onOpenItem={(id) => setSelectedItemId(id)} initialThreadId={threadId} />
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <DesktopAsk key={`desktop-${threadId}`} initialThreadId={threadId} />
      </div>
    </>
  );
}
