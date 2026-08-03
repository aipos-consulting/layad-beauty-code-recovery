import { NextRequest, NextResponse } from "next/server";

function getConfig() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

async function db(path: string, url: string, key: string) {
  return fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
}

export async function GET(request: NextRequest) {
  const { url, key } = getConfig();
  if (!url || !key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return NextResponse.json({ ok: false, message: "세션 ID가 올바르지 않습니다." }, { status: 400 });
  }

  const requestResponse = await db(`product_analysis_requests?session_id=eq.${sessionId}&select=id,status,error_message,product_id,created_at&order=created_at.desc&limit=1`, url, key);
  if (!requestResponse.ok) return NextResponse.json({ ok: false, code: "DATABASE_READ_FAILED" }, { status: 500 });
  const rows = (await requestResponse.json()) as Array<{ id: string; status: string; error_message: string | null; product_id: string | null; created_at: string }>;
  const latest = rows[0];
  if (!latest) return NextResponse.json({ ok: true, status: "not_found" });

  if (latest.status !== "completed" || !latest.product_id) {
    return NextResponse.json({ ok: true, requestId: latest.id, status: latest.status, errorMessage: latest.error_message });
  }

  const [productResponse, fitsResponse, sessionResponse] = await Promise.all([
    db(`products?id=eq.${latest.product_id}&select=canonical_name,brand,category,verification_status&limit=1`, url, key),
    db(`product_type_fits?product_id=eq.${latest.product_id}&select=beauty_code,fit_score,review_count,confidence&order=beauty_code.asc`, url, key),
    db(`test_sessions?id=eq.${sessionId}&select=beauty_code&limit=1`, url, key),
  ]);

  if (!productResponse.ok || !fitsResponse.ok || !sessionResponse.ok) {
    return NextResponse.json({ ok: false, code: "DATABASE_READ_FAILED" }, { status: 500 });
  }

  const products = (await productResponse.json()) as Array<Record<string, unknown>>;
  const fits = (await fitsResponse.json()) as Array<{ beauty_code: string; fit_score: number; review_count: number; confidence: number }>;
  const sessions = (await sessionResponse.json()) as Array<{ beauty_code: string | null }>;

  return NextResponse.json({
    ok: true,
    requestId: latest.id,
    status: "completed",
    product: products[0] ?? null,
    userBeautyCode: sessions[0]?.beauty_code ?? null,
    fits: fits.map((fit) => ({ beautyCode: fit.beauty_code, fitScore: Math.round(Number(fit.fit_score)), reviewCount: fit.review_count, confidence: Number(fit.confidence) })),
  });
}
