import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE, userAuthConfig } from "@/lib/user-auth-server";

type Locale = "ko" | "en" | "ja";

function normalizeLocale(value: unknown): Locale {
  if (value === "en" || value === "ja" || value === "ko") return value;
  return "ko";
}

export async function POST(request: NextRequest) {
  const { url, publishableKey } = userAuthConfig();
  if (!url || !publishableKey) return NextResponse.json({ ok: false, message: "회원가입 설정이 준비되지 않았습니다." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string; locale?: Locale };
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const locale = normalizeLocale(body.locale);
  if (!email || !email.includes("@")) return NextResponse.json({ ok: false, message: "이메일을 확인해 주세요." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ ok: false, message: "비밀번호는 8자 이상으로 설정해 주세요." }, { status: 400 });

  const signupResponse = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: { locale, app: "LAYAD BEAUTY CODE" } }),
    cache: "no-store",
  });
  const payload = await signupResponse.json().catch(() => ({})) as { access_token?: string; expires_in?: number; user?: { identities?: unknown[] } };
  if (!signupResponse.ok) {
    return NextResponse.json({ ok: false, message: "회원가입에 실패했습니다. 이미 가입한 이메일이면 로그인해 주세요." }, { status: 400 });
  }

  if (!payload.access_token) {
    const message = locale === "en"
      ? "Please check the verification email, then sign in."
      : locale === "ja"
        ? "認証メールを確認してからログインしてください。"
        : "인증 메일을 확인한 뒤 로그인해 주세요.";
    return NextResponse.json({ ok: true, requiresEmailConfirmation: true, message });
  }

  const response = NextResponse.json({ ok: true, requiresEmailConfirmation: false });
  response.cookies.set(USER_COOKIE, payload.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Number(payload.expires_in ?? 3600)),
  });
  return response;
}
