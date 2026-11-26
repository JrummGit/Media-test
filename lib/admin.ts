import "server-only";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/supabase/auth";

/** The one email address allowed into /admin, set in Vercel as ADMIN_EMAIL. */
export function isAdminEmail(email: string | null | undefined): boolean {
  const allowed = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(allowed && email && email.trim().toLowerCase() === allowed);
}

export const adminConfigured = () =>
  Boolean(
    process.env.ADMIN_EMAIL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

/** The signed-in admin, or null. getUser() re-validates the token with Supabase. */
export async function currentAdmin(): Promise<{ email: string } | null> {
  if (!adminConfigured()) return null;
  const { data } = await (await authClient()).auth.getUser();
  const email = data.user?.email;
  return email && isAdminEmail(email) ? { email } : null;
}

/** Every admin page and server action calls this first. */
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
