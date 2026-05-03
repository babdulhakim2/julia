import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="grid h-dvh place-items-center overflow-y-auto bg-background px-4 py-8">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/onboarding"
      />
    </main>
  );
}
