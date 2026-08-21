import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SETUP_EMAIL = "herriskim@gmail.com";
const SETUP_TOKEN_HASH = "9bfd80e2ee589fa530c28dd812af0ccc8b855309691751cfc9aa33b15160cc2c";

function validToken(token: string) {
  const actual = createHash("sha256").update(token).digest();
  const expected = Buffer.from(SETUP_TOKEN_HASH, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, message: "Supabase 관리자 설정이 필요합니다." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as { token?: string; password?: string };
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  if (!validToken(token)) return NextResponse.json({ ok: false, message: "유효하지 않은 초기설정 링크입니다." }, { status: 403 });
  if (password.length < 8) return NextResponse.json({ ok: false, message: "비밀번호는 8자 이상으로 설정해 주세요." }, { status: 400 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return NextResponse.json({ ok: false, message: "운영 계정 확인에 실패했습니다." }, { status: 500 });

  let user = usersData.users.find(item => item.email?.toLowerCase() === SETUP_EMAIL);
  if (user?.app_metadata?.staff_role === "admin") {
    return NextResponse.json({ ok: false, message: "초기설정이 이미 완료된 계정입니다. 로그인 화면을 이용해 주세요." }, { status: 409 });
  }

  if (user) {
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      app_metadata: { ...(user.app_metadata ?? {}), staff_role: "admin" },
    });
    if (updateError || !updated.user) return NextResponse.json({ ok: false, message: "운영 계정 설정에 실패했습니다." }, { status: 500 });
    user = updated.user;
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: SETUP_EMAIL,
      password,
      email_confirm: true,
      app_metadata: { staff_role: "admin" },
    });
    if (createError || !created.user) return NextResponse.json({ ok: false, message: "운영 계정 생성에 실패했습니다." }, { status: 500 });
    user = created.user;
  }

  // staff_roles is a secondary mirror only. Auth app_metadata is the source of truth.
  const { error: roleError } = await supabase.from("staff_roles").upsert(
    { user_id: user.id, role: "admin", updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (roleError) console.warn("staff_roles mirror write failed", roleError.message);

  return NextResponse.json({ ok: true, email: SETUP_EMAIL, role: "admin", roleMirror: roleError ? "pending" : "synced" });
}
