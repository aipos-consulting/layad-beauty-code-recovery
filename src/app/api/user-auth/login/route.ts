import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  USER_COOKIE,
  USER_PERSIST_COOKIE,
  USER_PERSIST_MAX_AGE,
  USER_SESSION_MAX_AGE,
  adminUserClient,
  createPersistentUserCookie,
  createUserSessionCookie,
} from "@/lib/user-auth-server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) return NextResponse.json({ ok: false, message: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });

  const supabase = adminUserClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "로그인 설정이 준비되지 않았습니다." }, { status: 503 });

  const { data: user, error } = await supabase
    .from("layad_users")
    .select("id,email,password_hash,email_verified")
    .eq("email", email)
    .maybeSingle();

  if (error || !user?.id || !user.password_hash) {
    return NextResponse.json({ ok: false, message: "이메일 또는 비밀번호를 확인해 주세요." }, { status: 401 });
  }
  if (!user.email_verified) {
    return NextResponse.json({ ok: false, message: "인증 메일을 확인한 뒤 로그인해 주세요." }, { status: 403 });
  }

  const valid = await bcrypt.compare(password, String(user.password_hash)).catch(() => false);
  if (!valid) return NextResponse.json({ ok: false, message: "이메일 또는 비밀번호를 확인해 주세요." }, { status: 401 });

  const sessionCookie = createUserSessionCookie({ id: String(user.id), email: String(user.email ?? email) });
  const persistentCookie = createPersistentUserCookie({ id: String(user.id), email: String(user.email ?? email) });
  if (!sessionCookie || !persistentCookie) {
    return NextResponse.json({ ok: false, message: "로그인 보안 설정이 준비되지 않았습니다." }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  response.cookies.set(USER_COOKIE, sessionCookie, { ...cookieOptions, maxAge: USER_SESSION_MAX_AGE });
  response.cookies.set(USER_PERSIST_COOKIE, persistentCookie, { ...cookieOptions, maxAge: USER_PERSIST_MAX_AGE });
  return response;
}
