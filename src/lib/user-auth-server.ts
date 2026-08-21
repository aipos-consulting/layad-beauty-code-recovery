import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export const USER_COOKIE = "layad_user_access_v1";

export function userAuthConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, publishableKey, serviceRoleKey };
}

export async function resolveUser(request: NextRequest) {
  const { url, publishableKey } = userAuthConfig();
  const token = request.cookies.get(USER_COOKIE)?.value;
  if (!url || !publishableKey || !token) return null;
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string; email?: string };
  return user.id ? { id: user.id, email: user.email ?? "" } : null;
}

export function adminUserClient() {
  const { url, serviceRoleKey } = userAuthConfig();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
