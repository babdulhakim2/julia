import type { AuthConfig } from "convex/server";

const authConfig = {
  providers: [
    {
      // Clerk Frontend API URL, for example:
      // https://verb-noun-00.clerk.accounts.dev
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;

export default authConfig;
