import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="font-display text-3xl">Staff sign-in</h1>
      <p className="mt-2 text-cream-dim">We&apos;ll email you a one-time sign-in link. No password needed.</p>
      <LoginForm />
    </div>
  );
}
