import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET() {
  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "Supabase 관리자 설정이 필요합니다." }, { status: 503 });
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return NextResponse.json({ ok: false, message: "운영 계정 조회에 실패했습니다." }, { status: 500 });
  const users = data.users
    .map(user => ({
      id: user.id,
      email: user.email ?? "",
      role: user.app_metadata?.staff_role === "admin" ? "admin" : user.app_metadata?.staff_role === "ceo" ? "ceo" : null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
    }))
    .filter(user => user.role);
  return NextResponse.json({ ok: true, users });
}

export async function POST(request: NextRequest) {
  const supabase = adminClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "Supabase 관리자 설정이 필요합니다." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { action?: string; email?: string; userId?: string };
  const action = String(body.action ?? "");

  if (action === "invite-ceo" || action === "reset-ceo") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) return NextResponse.json({ ok: false, message: "CEO 이메일을 확인해 주세요." }, { status: 400 });
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("staff_invites").update({ revoked_at: new Date().toISOString() }).eq("email", email).is("used_at", null).is("revoked_at", null);
    const { error } = await supabase.from("staff_invites").insert({ email, role: "ceo", token_hash: tokenHash, expires_at: expiresAt });
    if (error) return NextResponse.json({ ok: false, message: "CEO 활성화 키 생성에 실패했습니다." }, { status: 500 });
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://layad16.com";
    return NextResponse.json({ ok: true, email, expiresAt, activationUrl: `${origin}/ceo/activate?token=${encodeURIComponent(token)}` });
  }

  if (action === "revoke-ceo") {
    const userId = String(body.userId ?? "");
    if (!userId) return NextResponse.json({ ok: false, message: "사용자 ID가 필요합니다." }, { status: 400 });
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user) return NextResponse.json({ ok: false, message: "계정을 찾을 수 없습니다." }, { status: 404 });
    if (userData.user.app_metadata?.staff_role === "admin") return NextResponse.json({ ok: false, message: "Master Admin 권한은 이 화면에서 해제할 수 없습니다." }, { status: 400 });
    const nextMeta = { ...(userData.user.app_metadata ?? {}) } as Record<string, unknown>;
    delete nextMeta.staff_role;
    const { error } = await supabase.auth.admin.updateUserById(userId, { app_metadata: nextMeta });
    if (error) return NextResponse.json({ ok: false, message: "CEO 권한 해제에 실패했습니다." }, { status: 500 });
    await supabase.from("staff_roles").delete().eq("user_id", userId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, message: "지원하지 않는 작업입니다." }, { status: 400 });
}
