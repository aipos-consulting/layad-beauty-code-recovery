import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const STAFF_COOKIE = "layad_staff_access_v2";

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
    user?: { id?: string; app_metadata?: { staff_role?: "ceo" | "admin" } };
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

  const allowed = target === "admin" ? role === "admin" : role === "ceo" || role === "admin";
  if (!allowed) return NextResponse.json({ ok: false, message: "이 계정에는 해당 화면 접근 권한이 없습니다." }, { status: 403 });

  const response = NextResponse.json({ ok: true, role, redirectTo: target === "admin" ? "/admin" : "/ceo" });
  response.cookies.set(STAFF_COOKIE, token.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Number(token.expires_in ?? 3600)),
  });
  response.cookies.set("layad_staff_access", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
