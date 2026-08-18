import { NextRequest, NextResponse } from "next/server";

type ProductRequestInput = { sessionId: string; inputType: "name" | "url"; inputValue: string };
type ProductCandidate = { id: string; canonical_name: string | null; product_url: string | null };
const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";

function config() {
  return { supabaseUrl: SUPABASE_URL, serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY };
}

function headers(key: string, extra?: HeadersInit): HeadersInit {
  const base: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) base.Authorization = `Bearer ${key}`;
  return { ...base, ...(extra ?? {}) };
}

async function supabase(path: string, init: RequestInit, url: string, key: string) {
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers: headers(key, init.headers), cache: "no-store" });
}

function normalizeProductName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

async function findProduct(
  inputType: ProductRequestInput["inputType"],
  inputValue: string,
  url: string,
  key: string,
): Promise<ProductCandidate | null> {
  const lookup = inputType === "url"
    ? `products?product_url=eq.${encodeURIComponent(inputValue)}&deleted_at=is.null&select=id,canonical_name,product_url&limit=1`
    : `products?normalized_name=eq.${encodeURIComponent(normalizeProductName(inputValue))}&deleted_at=is.null&select=id,canonical_name,product_url&limit=1`;
  const response = await supabase(lookup, { method: "GET" }, url, key);
  if (!response.ok) {
    console.error("Product identity lookup failed", response.status, await response.text());
    return null;
  }
  const rows = (await response.json()) as ProductCandidate[];
  return rows[0] ?? null;
}

async function hasCompleteFits(productId: string, url: string, key: string) {
  const response = await supabase(`product_type_fits?product_id=eq.${productId}&select=beauty_code&limit=17`, { method: "GET" }, url, key);
  if (!response.ok) return false;
  const rows = (await response.json()) as Array<{ beauty_code: string }>;
  return rows.length === 16 && new Set(rows.map((row) => row.beauty_code)).size === 16;
}

async function hasActiveAnalysis(productId: string, url: string, key: string) {
  const response = await supabase(
    `product_analysis_requests?product_id=eq.${productId}&status=in.(collecting_reviews,analyzing)&analysis_run_id=not.is.null&deleted_at=is.null&select=id,analysis_run_id&limit=1`,
    { method: "GET" }, url, key,
  );
  if (!response.ok) return false;
  const rows = (await response.json()) as Array<{ id: string; analysis_run_id: string | null }>;
  return Boolean(rows[0]?.analysis_run_id);
}

async function createOrGetProvisionalProduct(body: ProductRequestInput, inputValue: string, url: string, key: string) {
  const existing = await findProduct(body.inputType, inputValue, url, key);
  if (existing) return existing;

  const payload = body.inputType === "url"
    ? { product_url: inputValue, verification_status: "unverified" }
    : { canonical_name: inputValue, normalized_name: normalizeProductName(inputValue), verification_status: "unverified" };
  const response = await supabase("products", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  }, url, key);
  if (response.ok) {
    const rows = (await response.json()) as ProductCandidate[];
    if (rows[0]?.id) return rows[0];
  } else {
    console.warn("Provisional product insert raced or failed", response.status, await response.text());
  }

  const raced = await findProduct(body.inputType, inputValue, url, key);
  if (raced) return raced;
  throw new Error("상품 기준정보를 생성하지 못했습니다.");
}

async function insertRequest(
  body: ProductRequestInput,
  inputValue: string,
  status: "submitted" | "collecting_reviews" | "completed",
  productId: string,
  url: string,
  key: string,
) {
  return supabase("product_analysis_requests", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ session_id: body.sessionId, input_type: body.inputType, input_value: inputValue, product_id: productId, status }),
  }, url, key);
}

export async function POST(request: NextRequest) {
  const { supabaseUrl, serviceKey } = config();
  if (!serviceKey) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  let body: ProductRequestInput;
  try { body = (await request.json()) as ProductRequestInput; }
  catch { return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 }); }

  const inputValue = body.inputValue?.trim();
  if (!/^[0-9a-f-]{36}$/i.test(body.sessionId) || !inputValue || inputValue.length > 2000) return NextResponse.json({ ok: false, message: "요청값을 확인해 주세요." }, { status: 400 });
  if (body.inputType !== "name" && body.inputType !== "url") return NextResponse.json({ ok: false, message: "상품 입력 유형이 올바르지 않습니다." }, { status: 400 });
  if (body.inputType === "url") {
    try { const url = new URL(inputValue); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
    catch { return NextResponse.json({ ok: false, message: "공개 상품 링크를 입력해 주세요." }, { status: 400 }); }
  }

  try {
    const product = await createOrGetProvisionalProduct(body, inputValue, supabaseUrl, serviceKey);
    const complete = await hasCompleteFits(product.id, supabaseUrl, serviceKey);
    const active = complete ? false : await hasActiveAnalysis(product.id, supabaseUrl, serviceKey);
    const status = complete ? "completed" : active ? "collecting_reviews" : "submitted";
    const insert = await insertRequest(body, inputValue, status, product.id, supabaseUrl, serviceKey);

    if (!insert.ok) {
      console.error("Product request insert failed", insert.status, await insert.text());
      return NextResponse.json({ ok: false, code: "DATABASE_WRITE_FAILED" }, { status: 500 });
    }
    const rows = (await insert.json()) as Array<{ id: string }>;
    const requestId = rows[0]?.id;
    if (!requestId) return NextResponse.json({ ok: false, code: "DATABASE_WRITE_FAILED" }, { status: 500 });

    if (complete) {
      return NextResponse.json({ ok: true, requestId, productId: product.id, status: "completed", mode: "cached_result", reused: true, message: "이미 분석된 상품 결과를 사용합니다." });
    }
    if (active) {
      return NextResponse.json({ ok: true, requestId, productId: product.id, status: "collecting_reviews", mode: "joined_existing_analysis", reused: true, message: "같은 상품의 분석이 이미 진행 중입니다. 기존 분석에 합류합니다." });
    }

    return NextResponse.json({ ok: true, requestId, productId: product.id, status: "submitted", mode: "new_analysis", reused: false, message: "신규 상품 분석 요청이 접수되었습니다." });
  } catch (error) {
    console.error("Product request processing failed", error);
    return NextResponse.json({ ok: false, code: "PRODUCT_REQUEST_FAILED", message: error instanceof Error ? error.message : "상품 신청 처리에 실패했습니다." }, { status: 500 });
  }
}
