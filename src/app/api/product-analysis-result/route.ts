import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";

function getConfig() {
  return { url: SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY };
}

function headers(key: string): Record<string, string> {
  const result: Record<string, string> = { apikey: key };
  if (!key.startsWith("sb_secret_")) result.Authorization = `Bearer ${key}`;
  return result;
}

async function db(path: string, url: string, key: string) {
  return fetch(`${url}/rest/v1/${path}`, { headers: headers(key), cache: "no-store" });
}

async function productHasCompleteFits(productId: string, url: string, key: string) {
  const response = await db(`product_type_fits?product_id=eq.${productId}&select=beauty_code&limit=17`, url, key);
  if (!response.ok) return false;
  const rows = (await response.json()) as Array<{ beauty_code: string }>;
  return rows.length === 16 && new Set(rows.map((row) => row.beauty_code)).size === 16;
}

async function inheritedFailure(productId: string, ownRequestId: string, url: string, key: string) {
  const response = await db(
    `product_analysis_requests?product_id=eq.${productId}&id=neq.${ownRequestId}&status=in.(failed,insufficient_reviews)&select=status,error_message,updated_at&order=updated_at.desc&limit=1`,
    url,
    key,
  );
  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{ status: string; error_message: string | null }>;
  return rows[0] ?? null;
}

export async function GET(request: NextRequest) {
  const { url, key } = getConfig();
  if (!key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  let sessionId = request.nextUrl.searchParams.get("sessionId") ?? "";
  const requestId = request.nextUrl.searchParams.get("requestId") ?? "";
  if (requestId && !/^[0-9a-f-]{36}$/i.test(requestId)) return NextResponse.json({ ok: false, message: "분석 요청 ID가 올바르지 않습니다." }, { status: 400 });
  if (sessionId && !/^[0-9a-f-]{36}$/i.test(sessionId)) return NextResponse.json({ ok: false, message: "세션 ID가 올바르지 않습니다." }, { status: 400 });
  if (!requestId && !sessionId) return NextResponse.json({ ok: false, message: "분석 결과 연결 정보가 없습니다." }, { status: 400 });

  let requestQuery: string;
  if (requestId && sessionId) {
    requestQuery = `product_analysis_requests?id=eq.${requestId}&session_id=eq.${sessionId}&select=id,session_id,status,error_message,product_id,created_at&limit=1`;
  } else if (requestId) {
    requestQuery = `product_analysis_requests?id=eq.${requestId}&select=id,session_id,status,error_message,product_id,created_at&limit=1`;
  } else {
    requestQuery = `product_analysis_requests?session_id=eq.${sessionId}&select=id,session_id,status,error_message,product_id,created_at&order=created_at.desc&limit=1`;
  }

  const requestResponse = await db(requestQuery, url, key);
  if (!requestResponse.ok) return NextResponse.json({ ok: false, code: "DATABASE_READ_FAILED" }, { status: 500 });
  const rows = (await requestResponse.json()) as Array<{ id: string; session_id: string; status: string; error_message: string | null; product_id: string | null; created_at: string }>;
  const latest = rows[0];
  if (!latest) return NextResponse.json({ ok: true, status: "not_found" });
  sessionId = latest.session_id;

  let resolvedStatus = latest.status;
  if (latest.product_id && latest.status !== "completed") {
    if (await productHasCompleteFits(latest.product_id, url, key)) {
      resolvedStatus = "completed";
    } else if (["submitted", "collecting_reviews", "analyzing"].includes(latest.status)) {
      const failure = await inheritedFailure(latest.product_id, latest.id, url, key);
      if (failure) return NextResponse.json({ ok: true, requestId: latest.id, sessionId, status: failure.status, errorMessage: failure.error_message });
    }
  }

  if (resolvedStatus !== "completed" || !latest.product_id) {
    return NextResponse.json({ ok: true, requestId: latest.id, sessionId, status: latest.status, errorMessage: latest.error_message });
  }

  const [productResponse, fitsResponse, sessionResponse] = await Promise.all([
    db(`products?id=eq.${latest.product_id}&select=canonical_name,brand,category,verification_status&limit=1`, url, key),
    db(`product_type_fits?product_id=eq.${latest.product_id}&select=beauty_code,fit_score,review_count,confidence&order=beauty_code.asc`, url, key),
    db(`test_sessions?id=eq.${sessionId}&select=beauty_code&limit=1`, url, key),
  ]);
  if (!productResponse.ok || !fitsResponse.ok || !sessionResponse.ok) return NextResponse.json({ ok: false, code: "DATABASE_READ_FAILED" }, { status: 500 });

  const products = (await productResponse.json()) as Array<Record<string, unknown>>;
  const fits = (await fitsResponse.json()) as Array<{ beauty_code: string; fit_score: number; review_count: number; confidence: number }>;
  const sessions = (await sessionResponse.json()) as Array<{ beauty_code: string | null }>;
  if (fits.length !== 16) return NextResponse.json({ ok: false, code: "INCOMPLETE_PRODUCT_FITS", message: "상품의 16유형 적합도 데이터가 완전하지 않습니다." }, { status: 409 });

  return NextResponse.json({
    ok: true,
    requestId: latest.id,
    sessionId,
    status: "completed",
    product: products[0] ?? null,
    userBeautyCode: sessions[0]?.beauty_code ?? null,
    fits: fits.map(fit => ({
      beautyCode: fit.beauty_code,
      fitScore: Math.round(Number(fit.fit_score)),
      reviewCount: fit.review_count,
      confidence: Number(fit.confidence),
    })),
  });
}
