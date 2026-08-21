import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE, userAuthConfig } from "@/lib/user-auth-server";

export async function POST(request: NextRequest) {
  const { url, publishableKey } = userAuthConfig();
  if (!url || !publishableKey) return NextResponse.json({ ok: false, message: "로그인 설정이 준비되지 않았습니다." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string };
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!email || !password) return NextResponse.json({ ok: false, message: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });

  const tokenResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  const payload = await tokenResponse.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
  if (!tokenResponse.ok || !payload.access_token) return NextResponse.json({ ok: false, message: "이메일 또는 비밀번호를 확인해 주세요." }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(USER_COOKIE, payload.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Number(payload.expires_in ?? 3600)),
  });
  return response;
}
