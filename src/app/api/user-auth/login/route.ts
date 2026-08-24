import { NextRequest, NextResponse } from "next/server";
import {
  USER_COOKIE,
  USER_PERSIST_COOKIE,
  USER_PERSIST_MAX_AGE,
  createPersistentUserCookie,
  userAuthConfig,
} from "@/lib/user-auth-server";

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
  const payload = await tokenResponse.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    user?: { id?: string; email?: string | null };
  };
  if (!tokenResponse.ok || !payload.access_token) return NextResponse.json({ ok: false, message: "이메일 또는 비밀번호를 확인해 주세요." }, { status: 401 });

  let user = payload.user;
  if (!user?.id) {
    const userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${payload.access_token}` },
      cache: "no-store",
    });
    if (userResponse.ok) user = await userResponse.json().catch(() => undefined) as { id?: string; email?: string | null } | undefined;
  }

  const response = NextResponse.json({ ok: true });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  response.cookies.set(USER_COOKIE, payload.access_token, {
    ...cookieOptions,
    maxAge: Math.max(60, Number(payload.expires_in ?? 3600)),
  });

  if (user?.id) {
    const persistentCookie = createPersistentUserCookie({ id: user.id, email: user.email });
    if (persistentCookie) {
      response.cookies.set(USER_PERSIST_COOKIE, persistentCookie, {
        ...cookieOptions,
        maxAge: USER_PERSIST_MAX_AGE,
      });
    }
  }
  return response;
}
