import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export const USER_COOKIE = "layad_user_access_v1";
export const USER_PERSIST_COOKIE = "layad_user_persist_v1";
export const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 7;
export const USER_PERSIST_MAX_AGE = 60 * 60 * 24 * 30;

type PersistedUser = {
  id: string;
  exp: number;
};

export function userAuthConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, publishableKey, serviceRoleKey };
}

function primarySigningKey() {
  // Dedicated session secret is preferred. The service role fallback keeps current
  // production sessions working until USER_SESSION_SECRET is configured in Vercel.
  return process.env.USER_SESSION_SECRET ?? userAuthConfig().serviceRoleKey ?? "";
}

function verificationKeys() {
  const keys = [process.env.USER_SESSION_SECRET, userAuthConfig().serviceRoleKey].filter((v): v is string => Boolean(v));
  return [...new Set(keys)];
}

function signUserCookie(user: { id: string }, maxAge: number) {
  const key = primarySigningKey();
  if (!key || !user.id) return null;
  const payload: PersistedUser = {
    id: user.id,
    exp: Math.floor(Date.now() / 1000) + maxAge,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", key).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function signatureMatches(encoded: string, signature: string, key: string) {
  const expected = createHmac("sha256", key).update(encoded).digest("base64url");
  try {
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function readSignedUserCookie(value: string | undefined): PersistedUser | null {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  if (!verificationKeys().some(key => signatureMatches(encoded, signature, key))) return null;

  try {
    // Older cookies may contain an email property. It is intentionally ignored.
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<PersistedUser>;
    if (!payload.id || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return { id: payload.id, exp: payload.exp };
  } catch {
    return null;
  }
}

export function createUserSessionCookie(user: { id: string }) {
  return signUserCookie(user, USER_SESSION_MAX_AGE);
}

export function createPersistentUserCookie(user: { id: string }) {
  return signUserCookie(user, USER_PERSIST_MAX_AGE);
}

async function independentUserById(id: string) {
  const admin = adminUserClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("layad_users")
    .select("id,email,email_verified,blocked_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.id || !data.email_verified || data.blocked_at) return null;
  return { id: data.id as string, email: String(data.email ?? "") };
}

async function isBlockedIndependentUser(id: string) {
  const admin = adminUserClient();
  if (!admin) return false;
  const { data, error } = await admin
    .from("layad_users")
    .select("blocked_at")
    .eq("id", id)
    .maybeSingle();
  return !error && Boolean(data?.blocked_at);
}

export async function resolveUser(request: NextRequest) {
  const session = readSignedUserCookie(request.cookies.get(USER_COOKIE)?.value);
  if (session) {
    const user = await independentUserById(session.id);
    if (user) return user;
    if (await isBlockedIndependentUser(session.id)) return null;
  }

  // Transitional compatibility for sessions issued by the previous Supabase Auth flow.
  const { url, publishableKey, serviceRoleKey } = userAuthConfig();
  const legacyToken = request.cookies.get(USER_COOKIE)?.value;
  if (url && publishableKey && legacyToken && !session) {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${legacyToken}` },
      cache: "no-store",
    });
    if (response.ok) {
      const legacyUser = await response.json() as { id?: string; email?: string };
      if (legacyUser.id) {
        if (await isBlockedIndependentUser(legacyUser.id)) return null;
        return { id: legacyUser.id, email: legacyUser.email ?? "" };
      }
    }
  }

  const persisted = readSignedUserCookie(request.cookies.get(USER_PERSIST_COOKIE)?.value);
  if (!persisted) return null;
  const independent = await independentUserById(persisted.id);
  if (independent) return independent;
  if (await isBlockedIndependentUser(persisted.id)) return null;

  if (!url || !serviceRoleKey) return null;
  const admin = adminUserClient();
  if (!admin) return null;
  const { data, error } = await admin.auth.admin.getUserById(persisted.id);
  if (error || !data.user) return null;
  if (await isBlockedIndependentUser(data.user.id)) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

export function adminUserClient() {
  const { url, serviceRoleKey } = userAuthConfig();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
