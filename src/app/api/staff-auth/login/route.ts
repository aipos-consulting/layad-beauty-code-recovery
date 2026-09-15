import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STAFF_COOKIE = "layad_staff_access_v2";
const STAFF_PERSIST_COOKIE = "layad_staff_persist_v1";
const STAFF_PERSIST_MAX_AGE = 60 * 60 * 24 * 7;

function createPersistentStaffCookie(user: { id: string; email: string }, role: "ceo" | "admin") {
  if (!serviceRoleKey || !user.id) return null;
  const payload = {
    id: user.id,
    email: user.email,
    role,
    exp: Math.floor(Date.now() / 1000) + STAFF_PERSIST_MAX_AGE,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", serviceRoleKey).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ ok: false, message: "Supabase Auth 설정이 필요합니다." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as { email?: string; password?: string; target?: "ceo" | "admin" };
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const target = body.target === "admin" ? "admin" : "ceo";
  if (!email || !password) return NextResponse.json({ ok: false, message: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });

  const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  const token = await tokenResponse.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    user?: { id?: string; email?: string; app_metadata?: { staff_role?: "ceo" | "admin" } };
  };
  if (!tokenResponse.ok || !token.access_token || !token.user?.id) {
    return NextResponse.json({ ok: false, message: "로그인 정보를 확인해 주세요." }, { status: 401 });
  }

  let role = token.user.app_metadata?.staff_role;
  if (!role) {
    const roleResponse = await fetch(`${supabaseUrl}/rest/v1/staff_roles?user_id=eq.${encodeURIComponent(token.user.id)}&select=role&limit=1`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
    const roles = await roleResponse.json().catch(() => []) as Array<{ role?: "ceo" | "admin" }>;
    role = roles[0]?.role;
  }

  const allowed = role === "ceo" || role === "admin";
  if (!allowed || !role) return NextResponse.json({ ok: false, message: "이 계정에는 해당 화면 접근 권한이 없습니다." }, { status: 403 });

  const response = NextResponse.json({ ok: true, role, redirectTo: target === "admin" ? "/admin" : "/ceo" });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  response.cookies.set(STAFF_COOKIE, token.access_token, {
    ...cookieOptions,
    maxAge: Math.max(60, Number(token.expires_in ?? 3600)),
  });
  const persistentCookie = createPersistentStaffCookie({ id: token.user.id, email: token.user.email ?? email }, role);
  if (persistentCookie) {
    response.cookies.set(STAFF_PERSIST_COOKIE, persistentCookie, { ...cookieOptions, maxAge: STAFF_PERSIST_MAX_AGE });
  }
  response.cookies.set("layad_staff_access", "", { ...cookieOptions, maxAge: 0 });
  return response;
}
