import { createHash, randomBytes, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminUserClient } from "@/lib/user-auth-server";

type Locale = "ko" | "en" | "ja";

function normalizeLocale(value: unknown): Locale {
  if (value === "en" || value === "ja" || value === "ko") return value;
  return "ko";
}

function copy(locale: Locale) {
  if (locale === "en") return {
    subject: "Confirm your LAYAD email address",
    heading: "Confirm your email address",
    body: "Confirm this email address to finish creating your LAYAD account.",
    button: "Confirm email address",
    success: "Please check the verification email, then sign in.",
  };
  if (locale === "ja") return {
    subject: "LAYAD メールアドレスの認証",
    heading: "メールアドレスを認証してください",
    body: "LAYAD アカウントの登録を完了するには、メールアドレスを認証してください。",
    button: "メールアドレスを認証",
    success: "認証メールを確認してからログインしてください。",
  };
  return {
    subject: "LAYAD 이메일 주소 인증",
    heading: "이메일 주소를 인증해 주세요",
    body: "LAYAD 회원가입을 완료하려면 이메일 주소를 인증해 주세요.",
    button: "이메일 주소 인증",
    success: "인증 메일을 확인한 뒤 로그인해 주세요.",
  };
}

async function sendVerificationEmail(email: string, token: string, locale: Locale) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false as const, reason: "config" };
  const text = copy(locale);
  const verifyUrl = `https://layad16.com/auth/verify?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "LAYAD BEAUTY CODE <noreply@layad16.com>",
      to: [email],
      subject: text.subject,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;color:#382d2d"><h2>${text.heading}</h2><p style="line-height:1.7">${text.body}</p><p style="margin:28px 0"><a href="${verifyUrl}" style="display:inline-block;background:#d88c9c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">${text.button}</a></p><p style="font-size:12px;color:#806f72">LAYAD BEAUTY CODE</p></div>`,
    }),
    cache: "no-store",
  });
  return { ok: response.ok as boolean, reason: response.ok ? "" : `resend_${response.status}` };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string; locale?: Locale };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const locale = normalizeLocale(body.locale);
  if (!email || !email.includes("@")) return NextResponse.json({ ok: false, message: "이메일을 확인해 주세요." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ ok: false, message: "비밀번호는 8자 이상으로 설정해 주세요." }, { status: 400 });

  const supabase = adminUserClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "회원가입 설정이 준비되지 않았습니다." }, { status: 503 });
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, message: "인증 메일 설정이 준비되지 않았습니다." }, { status: 503 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("layad_users")
    .select("id,email_verified")
    .eq("email", email)
    .maybeSingle();
  if (existingError) return NextResponse.json({ ok: false, message: "회원가입 처리 중 문제가 발생했습니다." }, { status: 500 });
  if (existing?.email_verified) {
    const message = locale === "en" ? "This email is already registered. Please sign in." : locale === "ja" ? "すでに登録されているメールアドレスです。ログインしてください。" : "이미 가입한 이메일입니다. 로그인해 주세요.";
    return NextResponse.json({ ok: false, message }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = existing?.id ? String(existing.id) : randomUUID();
  const now = new Date().toISOString();
  const { error: userError } = existing?.id
    ? await supabase.from("layad_users").update({ password_hash: passwordHash, locale, updated_at: now }).eq("id", userId)
    : await supabase.from("layad_users").insert({ id: userId, email, password_hash: passwordHash, email_verified: false, locale, created_at: now, updated_at: now });
  if (userError) return NextResponse.json({ ok: false, message: "회원가입 처리 중 문제가 발생했습니다." }, { status: 500 });

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabase.from("layad_email_verifications").delete().eq("user_id", userId).is("used_at", null);
  const { error: tokenError } = await supabase.from("layad_email_verifications").insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt });
  if (tokenError) return NextResponse.json({ ok: false, message: "인증 요청 생성에 실패했습니다." }, { status: 500 });

  const sent = await sendVerificationEmail(email, token, locale);
  if (!sent.ok) {
    return NextResponse.json({ ok: false, message: "인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, requiresEmailConfirmation: true, message: copy(locale).success });
}
