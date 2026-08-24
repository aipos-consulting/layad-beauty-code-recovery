import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export const USER_COOKIE = "layad_user_access_v1";
export const USER_PERSIST_COOKIE = "layad_user_persist_v1";
export const USER_PERSIST_MAX_AGE = 60 * 60 * 24 * 30;

type PersistedUser = {
  id: string;
  email: string;
  exp: number;
};

export function userAuthConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, publishableKey, serviceRoleKey };
}

function signingKey() {
  return userAuthConfig().serviceRoleKey ?? "";
}

export function createPersistentUserCookie(user: { id: string; email?: string | null }) {
  const key = signingKey();
  if (!key || !user.id) return null;
  const payload: PersistedUser = {
    id: user.id,
    email: user.email ?? "",
    exp: Math.floor(Date.now() / 1000) + USER_PERSIST_MAX_AGE,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", key).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readPersistentUserCookie(value: string | undefined): PersistedUser | null {
  const key = signingKey();
  if (!key || !value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", key).update(encoded).digest("base64url");
  try {
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as PersistedUser;
    if (!payload.id || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function resolveUser(request: NextRequest) {
  const { url, publishableKey, serviceRoleKey } = userAuthConfig();
  const token = request.cookies.get(USER_COOKIE)?.value;
  if (url && publishableKey && token) {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (response.ok) {
      const user = await response.json() as { id?: string; email?: string };
      if (user.id) return { id: user.id, email: user.email ?? "" };
    }
  }

  const persisted = readPersistentUserCookie(request.cookies.get(USER_PERSIST_COOKIE)?.value);
  if (!persisted || !url || !serviceRoleKey) return null;

  const admin = adminUserClient();
  if (!admin) return null;
  const { data, error } = await admin.auth.admin.getUserById(persisted.id);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? persisted.email };
}

export function adminUserClient() {
  const { url, serviceRoleKey } = userAuthConfig();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
