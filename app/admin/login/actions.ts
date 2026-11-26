"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminConfigured, isAdminEmail } from "@/lib/admin";
import { authClient } from "@/lib/supabase/auth";

export type LoginState = { step: "email" | "code"; email?: string; message?: string; error?: string };

async function origin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function sendSignInCode(_: LoginState, form: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { step: "email", error: "The admin isn't switched on yet." };
  const email = String(form.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { step: "email", error: "Enter a valid email address." };
  // Only the owner's address is ever sent a code. Anyone else sees the same
  // message, so the page doesn't reveal which address is the admin.
  if (isAdminEmail(email)) {
    const { error } = await (await authClient()).auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${await origin()}/auth/callback` },
    });
    if (error) {
      const busy = /rate|too many/i.test(error.message);
      return { step: "email", email, error: busy ? "Too many sign-in emails just now. Wait a few minutes and try again." : error.message };
    }
  }
  return { step: "code", email, message: "If that address can sign in, a link is on its way." };
}

export async function verifySignInCode(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!isAdminEmail(email)) return { step: "code", email, error: "That code didn't work. Check it and try again." };
  const { error } = await (await authClient()).auth.verifyOtp({ email, token: code, type: "email" });
  if (error) return { step: "code", email, error: "That code didn't work or has expired. Check it, or send a new one." };
  redirect("/admin");
}

export async function signOut() {
  await (await authClient()).auth.signOut();
  redirect("/admin/login");
}
