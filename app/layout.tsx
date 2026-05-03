import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "Secretary",
  description: "AI-native company secretary",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full overflow-hidden">
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/inbox"
          signUpFallbackRedirectUrl="/onboarding"
        >
          <ConvexClientProvider>
            <StoreProvider>{children}</StoreProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
