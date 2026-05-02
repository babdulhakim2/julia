'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { ClientRedirect } from '@/components/ui/client-redirect';

export default function OnboardingPage() {
  const { state, hydrated } = useStore();
  const router = useRouter();

  if (!hydrated) {
    return null;
  }

  if (state.onboarded) {
    return <ClientRedirect href="/inbox" />;
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <OnboardingFlow
        onDone={() => {
          router.replace('/inbox');
        }}
      />
    </div>
  );
}
