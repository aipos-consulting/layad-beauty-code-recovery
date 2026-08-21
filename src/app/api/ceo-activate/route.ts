import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, message: "Supabase 관리자 설정이 필요합니다." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { token?: string; password?: string };
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  if (!token) return NextResponse.json({ ok: false, message: "활성화 키가 없습니다." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ ok: false, message: "비밀번호는 8자 이상으로 설정해 주세요." }, { status: 400 });

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: invite, error: inviteError } = await supabase
    .from("staff_invites")
    .select("id,email,role,expires_at,used_at,revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (inviteError || !invite) return NextResponse.json({ ok: false, message: "유효하지 않은 CEO 활성화 키입니다." }, { status: 403 });
  if (invite.used_at || invite.revoked_at || new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, message: "이미 사용했거나 만료된 CEO 활성화 키입니다." }, { status: 410 });
  }

  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return NextResponse.json({ ok: false, message: "CEO 계정 확인에 실패했습니다." }, { status: 500 });
  let user = usersData.users.find(item => item.email?.toLowerCase() === String(invite.email).toLowerCase());
  if (user) {
    const { data: updated, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      app_metadata: { ...(user.app_metadata ?? {}), staff_role: "ceo" },
    });
    if (error || !updated.user) return NextResponse.json({ ok: false, message: "CEO 계정 활성화에 실패했습니다." }, { status: 500 });
    user = updated.user;
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      app_metadata: { staff_role: "ceo" },
    });
    if (error || !created.user) return NextResponse.json({ ok: false, message: "CEO 계정 생성에 실패했습니다." }, { status: 500 });
    user = created.user;
  }

  await supabase.from("staff_roles").upsert({ user_id: user.id, role: "ceo", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  await supabase.from("staff_invites").update({ used_at: new Date().toISOString() }).eq("id", invite.id);
  return NextResponse.json({ ok: true, email: invite.email, redirectTo: "/ceo/login" });
}
