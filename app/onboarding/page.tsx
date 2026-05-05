'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { ClientRedirect } from '@/components/ui/client-redirect';

export default function OnboardingPage() {
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const syncStarted = useRef(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const me = useQuery(api.users.getMe);
  const workspace = useQuery(api.workspaces.getMyWorkspace, {});
  const entities = useQuery(
    api.entities.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip",
  );
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || me !== null || syncStarted.current) return;
    syncStarted.current = true;
    storeUser().catch((error) => {
      syncStarted.current = false;
      setSyncError(error instanceof Error ? error.message : 'Could not sync user');
    });
  }, [isAuthenticated, me, storeUser]);

  if (syncError) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: 'var(--muted)', fontSize: 14 }}>
        Could not sync your account. Sign out and back in, then try again.
      </div>
    );
  }

  // Still loading, or creating the Convex user after Clerk sign-in.
  if (me === undefined || (isAuthenticated && me === null) || workspace === undefined) {
    return null;
  }
  if (me === null) {
    return null;
  }

  // Already onboarded with entities → go to inbox
  if (workspace && entities === undefined) {
    return null;
  }
  if (me.onboardingComplete && workspace && entities && entities.length > 0) {
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
