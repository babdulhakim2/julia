"use client";

import type { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
let convexClient: ConvexReactClient | null = null;

function getConvexClient() {
  if (!convexUrl) {
    return null;
  }

  convexClient ??= new ConvexReactClient(convexUrl);
  return convexClient;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = getConvexClient();

  if (!client) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
