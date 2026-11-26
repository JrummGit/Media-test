"use client";

import { useActionState, useEffect, useState } from "react";
import { sendSignInCode, verifySignInCode, type LoginState } from "./actions";

const field = "w-full rounded-md border border-night-3 bg-night-2 px-3 py-2.5 text-cream focus:border-teal focus:outline-none";
const button = "w-full rounded-md bg-pink px-4 py-2.5 font-display text-white hover:brightness-110 disabled:opacity-50";

export function LoginForm() {
  const [sendState, send, sending] = useActionState<LoginState, FormData>(sendSignInCode, { step: "email" });
  const [verifyState, verify, verifying] = useActionState<LoginState, FormData>(verifySignInCode, { step: "code" });
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the query string after mount
    setExpired(new URLSearchParams(location.search).get("link") === "expired");
  }, []);

  if (sendState.step === "code") {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-md border-l-4 border-teal bg-night-2 p-3 text-sm">
          {sendState.message} Open the email <b>on this device</b> and tap its sign-in link. It works once and expires in 15 minutes.
        </p>
        <details className="rounded-md border border-night-3 p-3 text-sm">
          <summary className="cursor-pointer text-cream-dim">The email has a code instead?</summary>
          <form action={verify} className="mt-3 space-y-3">
            <input type="hidden" name="email" value={sendState.email} />
            <label className="block text-cream-dim" htmlFor="code">Code from the email</label>
            <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required className={`${field} font-crt text-2xl tracking-[0.4em]`} />
            {verifyState.error && <p className="text-tape">{verifyState.error}</p>}
            <button disabled={verifying} className={button}>{verifying ? "Checking…" : "Sign in"}</button>
          </form>
        </details>
      </div>
    );
  }

  return (
    <form action={send} className="mt-6 space-y-3">
      {expired && <p className="text-sm text-tape">That sign-in link has expired or was already used. Send a new one.</p>}
      <label className="block text-sm text-cream-dim" htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required defaultValue={sendState.email} className={field} />
      {sendState.error && <p className="text-sm text-tape">{sendState.error}</p>}
      <button disabled={sending} className={button}>{sending ? "Sending…" : "Email me a sign-in link"}</button>
    </form>
  );
}
