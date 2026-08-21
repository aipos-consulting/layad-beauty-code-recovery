import { NextRequest, NextResponse } from "next/server";
import { adminUserClient, resolveUser } from "@/lib/user-auth-server";

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ ok: false, code: "AUTH_REQUIRED" }, { status: 401 });
  const supabase = adminUserClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "사용자 데이터 설정이 준비되지 않았습니다." }, { status: 503 });

  const [{ data: profile }, { data: codes }, { data: products }] = await Promise.all([
    supabase.from("user_profiles").select("nickname,created_at,updated_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_beauty_codes").select("id,beauty_code,source,axis_scores,is_current,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("user_saved_products").select("id,product_ref,product_name,beauty_code,fit_score,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
  ]);

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, nickname: profile?.nickname ?? null },
    codes: codes ?? [],
    products: products ?? [],
  });
}

export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ ok: false, code: "AUTH_REQUIRED" }, { status: 401 });
  const supabase = adminUserClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "사용자 데이터 설정이 준비되지 않았습니다." }, { status: 503 });

  const body = await request.json().catch(() => ({})) as {
    action?: string;
    beautyCode?: string;
    source?: string;
    axisScores?: Record<string, number>;
    productRef?: string;
    productName?: string;
    fitScore?: number | null;
    nickname?: string | null;
  };

  if (body.action === "save-code") {
    const beautyCode = String(body.beautyCode ?? "").trim().toUpperCase();
    if (!/^[OD][GM][PC][VE]$/.test(beautyCode)) return NextResponse.json({ ok: false, message: "Beauty Code를 확인해 주세요." }, { status: 400 });
    const { data, error } = await supabase.rpc("save_user_beauty_code", {
      p_user_id: user.id,
      p_beauty_code: beautyCode,
      p_source: String(body.source ?? "test"),
      p_axis_scores: body.axisScores ?? {},
    });
    if (error) return NextResponse.json({ ok: false, message: "Beauty Code 저장에 실패했습니다. 다시 시도해 주세요." }, { status: 500 });
    await supabase.from("user_profiles").upsert({ user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    return NextResponse.json({ ok: true, id: data });
  }

  if (body.action === "save-product") {
    const productRef = String(body.productRef ?? "").trim();
    if (!productRef) return NextResponse.json({ ok: false, message: "상품 정보가 없습니다." }, { status: 400 });
    const fitScore = typeof body.fitScore === "number" ? Math.max(0, Math.min(100, Math.round(body.fitScore))) : null;
    const { error } = await supabase.from("user_saved_products").upsert({
      user_id: user.id,
      product_ref: productRef,
      product_name: body.productName ? String(body.productName).slice(0, 300) : null,
      beauty_code: body.beautyCode && /^[OD][GM][PC][VE]$/.test(String(body.beautyCode).toUpperCase()) ? String(body.beautyCode).toUpperCase() : null,
      fit_score: fitScore,
    }, { onConflict: "user_id,product_ref" });
    if (error) return NextResponse.json({ ok: false, message: "상품 저장에 실패했습니다. 다시 시도해 주세요." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "profile") {
    const nickname = body.nickname == null ? null : String(body.nickname).trim().slice(0, 40);
    const { error } = await supabase.from("user_profiles").upsert({ user_id: user.id, nickname, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ ok: false, message: "프로필 저장에 실패했습니다." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, message: "지원하지 않는 작업입니다." }, { status: 400 });
}
