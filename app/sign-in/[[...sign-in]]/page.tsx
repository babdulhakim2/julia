import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid h-dvh place-items-center overflow-y-auto bg-background px-4 py-8">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/inbox"
      />
    </main>
  );
}
