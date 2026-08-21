import { NextRequest, NextResponse } from "next/server";

type ProductRequestInput = {
  sessionId?: string;
  beautyCode?: string;
  inputType: "name" | "url";
  inputValue: string;
};

type ProductCandidate = {
  id: string;
  canonical_name: string | null;
  product_url: string | null;
  brand: string | null;
  category: string | null;
};

type ProductAliasRow = {
  product_id: string;
};

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const BEAUTY_CODE = /^[OD][GM][PC][VE]$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function config() {
  return { key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY };
}

function dbHeaders(key: string, extra?: HeadersInit): HeadersInit {
  const base: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) base.Authorization = `Bearer ${key}`;
  return { ...base, ...(extra ?? {}) };
}

async function db(path: string, init: RequestInit, key: string) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: dbHeaders(key, init.headers),
    cache: "no-store",
  });
}

function normalize(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function detectDevice(userAgent: string) {
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android/i.test(userAgent)) return "mobile";
  return userAgent ? "desktop" : "unknown";
}

async function createSession(request: NextRequest, beautyCode: string, key: string) {
  const response = await db("test_sessions", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      completed_at: new Date().toISOString(),
      country_code: request.headers.get("x-vercel-ip-country") || null,
      region_code: request.headers.get("x-vercel-ip-country-region") || null,
      geo_source: request.headers.get("x-vercel-ip-country") ? "vercel_ip" : "unknown",
      beauty_code: beautyCode,
      beauty_code_source: "test",
      device_type: detectDevice(request.headers.get("user-agent") ?? ""),
      completed: true,
    }),
  }, key);
  if (!response.ok) throw new Error(`세션 저장 실패: ${response.status}`);
  const rows = await response.json() as Array<{ id: string }>;
  if (!rows[0]?.id) throw new Error("세션 ID를 생성하지 못했습니다.");
  return rows[0].id;
}

async function findProductById(productId: string, key: string) {
  const response = await db(
    `products?id=eq.${encodeURIComponent(productId)}&deleted_at=is.null&select=id,canonical_name,product_url,brand,category&limit=1`,
    { method: "GET" },
    key,
  );
  if (!response.ok) throw new Error(`상품 조회 실패: ${response.status}`);
  const rows = await response.json() as ProductCandidate[];
  return rows[0] ?? null;
}

async function findExactProduct(inputType: "name" | "url", inputValue: string, key: string) {
  const path = inputType === "url"
    ? `products?product_url=eq.${encodeURIComponent(inputValue)}&deleted_at=is.null&select=id,canonical_name,product_url,brand,category&limit=1`
    : `products?normalized_name=eq.${encodeURIComponent(normalize(inputValue))}&deleted_at=is.null&select=id,canonical_name,product_url,brand,category&limit=1`;
  const response = await db(path, { method: "GET" }, key);
  if (!response.ok) throw new Error(`상품 조회 실패: ${response.status}`);
  const rows = await response.json() as ProductCandidate[];
  return rows[0] ?? null;
}

async function findAliasProduct(inputValue: string, key: string) {
  const response = await db(
    `product_aliases?normalized_alias=eq.${encodeURIComponent(normalize(inputValue))}&select=product_id&limit=1`,
    { method: "GET" },
    key,
  );
  if (!response.ok) throw new Error(`상품 별칭 조회 실패: ${response.status}`);
  const rows = await response.json() as ProductAliasRow[];
  if (!rows[0]?.product_id) return null;
  return await findProductById(rows[0].product_id, key);
}

async function findByBrand(inputValue: string, key: string) {
  const response = await db(
    `products?brand=ilike.${encodeURIComponent(inputValue)}&deleted_at=is.null&select=id,canonical_name,product_url,brand,category&order=created_at.asc&limit=3`,
    { method: "GET" },
    key,
  );
  if (!response.ok) throw new Error(`브랜드 조회 실패: ${response.status}`);
  return await response.json() as ProductCandidate[];
}

async function createProduct(inputType: "name" | "url", inputValue: string, key: string) {
  const payload = inputType === "url"
    ? { product_url: inputValue, verification_status: "unverified" }
    : { canonical_name: inputValue, normalized_name: normalize(inputValue), verification_status: "unverified" };
  const response = await db("products", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  }, key);
  if (!response.ok) throw new Error(`상품 기준정보 생성 실패: ${response.status}`);
  const rows = await response.json() as ProductCandidate[];
  if (!rows[0]?.id) throw new Error("상품 ID를 생성하지 못했습니다.");
  return rows[0];
}

async function fitCount(productId: string, key: string) {
  const response = await db(`product_type_fits?product_id=eq.${productId}&select=beauty_code&limit=17`, { method: "GET" }, key);
  if (!response.ok) return 0;
  const rows = await response.json() as Array<{ beauty_code: string }>;
  return new Set(rows.map((row) => row.beauty_code)).size;
}

export async function POST(request: NextRequest) {
  const { key } = config();
  if (!key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  let body: ProductRequestInput;
  try { body = await request.json() as ProductRequestInput; }
  catch { return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 }); }

  const inputValue = body.inputValue?.trim();
  if (!inputValue || inputValue.length > 2000) return NextResponse.json({ ok: false, message: "상품명 또는 상품 링크를 확인해 주세요." }, { status: 400 });
  if (body.inputType !== "name" && body.inputType !== "url") return NextResponse.json({ ok: false, message: "상품 입력 유형이 올바르지 않습니다." }, { status: 400 });
  if (body.inputType === "url") {
    try {
      const parsed = new URL(inputValue);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    } catch {
      return NextResponse.json({ ok: false, message: "공개 상품 링크를 입력해 주세요." }, { status: 400 });
    }
  }

  try {
    let sessionId = body.sessionId?.trim() ?? "";
    if (!UUID.test(sessionId)) {
      if (!body.beautyCode || !BEAUTY_CODE.test(body.beautyCode)) {
        return NextResponse.json({ ok: false, message: "Beauty Code를 확인해 주세요." }, { status: 400 });
      }
      sessionId = await createSession(request, body.beautyCode, key);
    }

    let product: ProductCandidate | null = await findExactProduct(body.inputType, inputValue, key);
    let resolvedByBrand = false;
    let resolvedByAlias = false;

    if (!product && body.inputType === "name") {
      product = await findAliasProduct(inputValue, key);
      resolvedByAlias = Boolean(product);
    }

    if (!product && body.inputType === "name") {
      const brandMatches = await findByBrand(inputValue, key);
      if (brandMatches.length === 1) {
        product = brandMatches[0];
        resolvedByBrand = true;
      } else if (brandMatches.length > 1) {
        return NextResponse.json({
          ok: false,
          code: "AMBIGUOUS_BRAND",
          message: `${inputValue} 브랜드 상품이 여러 개입니다. 분석할 정확한 상품명을 입력해 주세요.`,
        }, { status: 409 });
      }
    }

    if (!product) product = await createProduct(body.inputType, inputValue, key);

    const count = await fitCount(product.id, key);
    const status = count === 16 ? "completed" : "submitted";
    const storedInput = (resolvedByBrand || resolvedByAlias) && product.canonical_name ? product.canonical_name : inputValue;

    const insert = await db("product_analysis_requests", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        session_id: sessionId,
        input_type: body.inputType,
        input_value: storedInput,
        product_id: product.id,
        status,
      }),
    }, key);

    if (!insert.ok) throw new Error(`분석 요청 저장 실패: ${insert.status}`);
    const rows = await insert.json() as Array<{ id: string }>;
    const requestId = rows[0]?.id;
    if (!requestId) throw new Error("분석 요청 ID를 생성하지 못했습니다.");

    return NextResponse.json({
      ok: true,
      requestId,
      sessionId,
      productId: product.id,
      productName: product.canonical_name ?? storedInput,
      status,
      resolvedByBrand,
      resolvedByAlias,
      message: status === "completed"
        ? "이미 분석된 상품 결과가 있습니다."
        : resolvedByBrand || resolvedByAlias
          ? `${inputValue}을(를) ${product.canonical_name} 상품으로 연결해 분석 대기에 등록했습니다.`
          : "상품 분석 요청을 대기열에 등록했습니다.",
    });
  } catch (error) {
    console.error("Product request processing failed", error);
    return NextResponse.json({
      ok: false,
      code: "PRODUCT_REQUEST_FAILED",
      message: error instanceof Error ? error.message : "상품 신청 처리에 실패했습니다.",
    }, { status: 500 });
  }
}
