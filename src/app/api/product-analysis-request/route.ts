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

async function findReusableProduct(
  inputType: ProductRequestInput["inputType"],
  inputValue: string,
  url: string,
  key: string,
): Promise<ProductCandidate | null> {
  const lookup = inputType === "url"
    ? `products?product_url=eq.${encodeURIComponent(inputValue)}&select=id,canonical_name,product_url&limit=5`
    : `products?normalized_name=eq.${encodeURIComponent(normalizeProductName(inputValue))}&select=id,canonical_name,product_url&limit=5`;

  const productResponse = await supabase(lookup, { method: "GET" }, url, key);
  if (!productResponse.ok) {
    console.error("Reusable product lookup failed", productResponse.status, await productResponse.text());
    return null;
  }

  const candidates = (await productResponse.json()) as ProductCandidate[];
  for (const candidate of candidates) {
    const fitsResponse = await supabase(
      `product_type_fits?product_id=eq.${candidate.id}&select=beauty_code&limit=17`,
      { method: "GET" },
      url,
      key,
    );
    if (!fitsResponse.ok) continue;
    const fits = (await fitsResponse.json()) as Array<{ beauty_code: string }>;
    const uniqueCodes = new Set(fits.map((fit) => fit.beauty_code));
    if (fits.length === 16 && uniqueCodes.size === 16) return candidate;
  }

  return null;
}

async function insertRequest(
  body: ProductRequestInput,
  inputValue: string,
  status: "submitted" | "completed",
  url: string,
  key: string,
  productId?: string,
) {
  return supabase("product_analysis_requests", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      session_id: body.sessionId,
      input_type: body.inputType,
      input_value: inputValue,
      status,
      ...(productId ? { product_id: productId } : {}),
    }),
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

  const reusable = await findReusableProduct(body.inputType, inputValue, supabaseUrl, serviceKey);
  if (reusable) {
    const cachedInsert = await insertRequest(body, inputValue, "completed", supabaseUrl, serviceKey, reusable.id);
    if (!cachedInsert.ok) {
      console.error("Cached product request insert failed", cachedInsert.status, await cachedInsert.text());
      return NextResponse.json({ ok: false, code: "DATABASE_WRITE_FAILED" }, { status: 500 });
    }
    const cachedRows = (await cachedInsert.json()) as Array<{ id: string }>;
    const requestId = cachedRows[0]?.id;
    if (!requestId) return NextResponse.json({ ok: false, code: "DATABASE_WRITE_FAILED" }, { status: 500 });

    return NextResponse.json({
      ok: true,
      requestId,
      status: "completed",
      mode: "cached_result",
      reused: true,
      productId: reusable.id,
      message: "이미 분석된 상품 결과를 사용합니다.",
    });
  }

  const insert = await insertRequest(body, inputValue, "submitted", supabaseUrl, serviceKey);
  if (!insert.ok) {
    console.error("Product request insert failed", insert.status, await insert.text());
    return NextResponse.json({ ok: false, code: "DATABASE_WRITE_FAILED" }, { status: 500 });
  }

  const rows = (await insert.json()) as Array<{ id: string }>;
  const requestId = rows[0]?.id;
  if (!requestId) return NextResponse.json({ ok: false, code: "DATABASE_WRITE_FAILED" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    requestId,
    status: "submitted",
    mode: "queued_for_analysis",
    reused: false,
    message: "신규 상품 분석 요청이 접수되었습니다.",
  });
}
