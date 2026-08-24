import { NextRequest, NextResponse } from "next/server";
import { adminUserClient, resolveUser } from "@/lib/user-auth-server";

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ ok: false, code: "AUTH_REQUIRED" }, { status: 401 });

  const productRef = String(request.nextUrl.searchParams.get("productRef") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(productRef)) {
    return NextResponse.json({ ok: false, message: "저장 상품 연결 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const supabase = adminUserClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "사용자 데이터 설정이 준비되지 않았습니다." }, { status: 503 });

  const { data: saved, error: savedError } = await supabase
    .from("user_saved_products")
    .select("product_ref,product_name,beauty_code,fit_score,created_at")
    .eq("user_id", user.id)
    .eq("product_ref", productRef)
    .maybeSingle();

  if (savedError) return NextResponse.json({ ok: false, message: "저장 상품을 확인하지 못했습니다." }, { status: 500 });
  if (!saved) return NextResponse.json({ ok: false, message: "저장된 상품을 찾지 못했습니다." }, { status: 404 });

  const { data: analysis, error: analysisError } = await supabase
    .from("product_analysis_requests")
    .select("id,session_id,product_id,status")
    .eq("id", productRef)
    .maybeSingle();

  if (analysisError || !analysis?.product_id) {
    return NextResponse.json({ ok: false, message: "저장된 분석 결과 연결 정보를 찾지 못했습니다." }, { status: 404 });
  }

  const [{ data: product }, { data: fits, error: fitsError }] = await Promise.all([
    supabase.from("products").select("canonical_name,brand,category,verification_status").eq("id", analysis.product_id).maybeSingle(),
    supabase.from("product_type_fits").select("beauty_code,fit_score,review_count,confidence").eq("product_id", analysis.product_id).order("fit_score", { ascending: false }),
  ]);

  if (fitsError || !fits?.length) {
    return NextResponse.json({ ok: false, message: "저장된 상세 분석 결과를 불러오지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    saved: {
      productName: saved.product_name ?? product?.canonical_name ?? "저장 상품",
      beautyCode: saved.beauty_code,
      fitScore: saved.fit_score,
      createdAt: saved.created_at,
    },
    product: product ?? null,
    requestId: analysis.id,
    sessionId: analysis.session_id,
    fits: fits.map((fit) => ({
      beautyCode: fit.beauty_code,
      fitScore: Math.round(Number(fit.fit_score)),
      reviewCount: Number(fit.review_count ?? 0),
      confidence: Number(fit.confidence ?? 0),
    })),
  });
}
