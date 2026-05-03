'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { ClientRedirect } from '@/components/ui/client-redirect';

export default function OnboardingPage() {
  const me = useQuery(api.users.getMe);
  const workspace = useQuery(api.workspaces.getMyWorkspace);
  const entities = useQuery(
    api.entities.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip",
  );
  const router = useRouter();

  // Still loading
  if (me === undefined) {
    return null;
  }

  // Already onboarded with entities → go to inbox
  if (me?.onboardingComplete && entities && entities.length > 0) {
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
