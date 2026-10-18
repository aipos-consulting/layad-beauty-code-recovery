import { POST as analyzeProductFit } from "../product-fit-fast/route";
import { NextRequest, NextResponse } from "next/server";

type ProductRequestInput = { sessionId?: string; beautyCode?: string; inputType: "name" | "url"; inputValue: string };
type ProductCandidate = { id: string; canonical_name: string | null; product_url: string | null; brand: string | null; category: string | null };
type ProductAliasRow = { product_id: string };
type FastRequestRow = { request_id:string; session_id:string; product_id:string; product_name:string|null; request_status:string; resolved_by_alias:boolean };

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const BEAUTY_CODE = /^[OD][GM][PC][VE]$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function config() { return { key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY }; }
function dbHeaders(key: string, extra?: HeadersInit): HeadersInit {
  const base: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) base.Authorization = `Bearer ${key}`;
  return { ...base, ...(extra ?? {}) };
}
async function db(path: string, init: RequestInit, key: string) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: dbHeaders(key, init.headers), cache: "no-store" });
}
function normalize(value: string) { return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase(); }
function detectDevice(userAgent: string) {
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android/i.test(userAgent)) return "mobile";
  return userAgent ? "desktop" : "unknown";
}

async function fastNameRequest(request:NextRequest,inputValue:string,beautyCode:string,key:string){
  const response=await db("rpc/create_fast_product_analysis_request",{
    method:"POST",
    body:JSON.stringify({
      p_input_value:inputValue,
      p_normalized_name:normalize(inputValue),
      p_beauty_code:beautyCode,
      p_country_code:request.headers.get("x-vercel-ip-country")||null,
      p_region_code:request.headers.get("x-vercel-ip-country-region")||null,
      p_device_type:detectDevice(request.headers.get("user-agent")??""),
    }),
  },key);
  if(!response.ok) throw new Error(`빠른 상품 요청 실패: ${response.status} ${(await response.text()).slice(0,300)}`);
  const row=(await response.json() as FastRequestRow[])[0];
  if(!row?.request_id||!row.session_id) throw new Error("빠른 상품 요청 결과가 올바르지 않습니다.");
  return row;
}

async function resolvePublicUrl(value: string) {
  try {
    const parsed = new URL(value);
    const response = await fetch(parsed.toString(), {
      method: "GET", redirect: "follow", cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LAYADProductResolver/1.0)" },
      signal: AbortSignal.timeout(3500),
    });
    const finalUrl = response.url || parsed.toString();
    const resolved = new URL(finalUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return parsed.toString();
    return resolved.toString();
  } catch { return value; }
}

async function createSession(request: NextRequest, beautyCode: string, key: string) {
  const response = await db("test_sessions", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      completed_at: new Date().toISOString(), country_code: request.headers.get("x-vercel-ip-country") || null,
      region_code: request.headers.get("x-vercel-ip-country-region") || null,
      geo_source: request.headers.get("x-vercel-ip-country") ? "vercel_ip" : "unknown", beauty_code: beautyCode,
      beauty_code_source: "test", device_type: detectDevice(request.headers.get("user-agent") ?? ""), completed: true,
    }),
  }, key);
  if (!response.ok) throw new Error(`세션 저장 실패: ${response.status}`);
  const rows = await response.json() as Array<{ id: string }>;
  if (!rows[0]?.id) throw new Error("세션 ID를 생성하지 못했습니다.");
  return rows[0].id;
}
async function findProductById(productId: string, key: string) {
  const response = await db(`products?id=eq.${encodeURIComponent(productId)}&deleted_at=is.null&select=id,canonical_name,product_url,brand,category&limit=1`, { method: "GET" }, key);
  if (!response.ok) throw new Error(`상품 조회 실패: ${response.status}`);
  const rows = await response.json() as ProductCandidate[]; return rows[0] ?? null;
}
async function findExactProduct(inputType: "name" | "url", inputValue: string, key: string) {
  const path = inputType === "url"
    ? `products?product_url=eq.${encodeURIComponent(inputValue)}&deleted_at=is.null&select=id,canonical_name,product_url,brand,category&limit=1`
    : `products?normalized_name=eq.${encodeURIComponent(normalize(inputValue))}&deleted_at=is.null&select=id,canonical_name,product_url,brand,category&limit=1`;
  const response = await db(path, { method: "GET" }, key);
  if (!response.ok) throw new Error(`상품 조회 실패: ${response.status}`);
  const rows = await response.json() as ProductCandidate[]; return rows[0] ?? null;
}
async function findAliasProduct(inputValue: string, key: string) {
  const response = await db(`product_aliases?normalized_alias=eq.${encodeURIComponent(normalize(inputValue))}&select=product_id&limit=1`, { method: "GET" }, key);
  if (!response.ok) throw new Error(`상품 별칭 조회 실패: ${response.status}`);
  const rows = await response.json() as ProductAliasRow[];
  if (!rows[0]?.product_id) return null; return await findProductById(rows[0].product_id, key);
}
async function findByBrand(inputValue: string, key: string) {
  const response = await db(`products?brand=ilike.${encodeURIComponent(inputValue)}&deleted_at=is.null&select=id,canonical_name,product_url,brand,category&order=created_at.asc&limit=3`, { method: "GET" }, key);
  if (!response.ok) throw new Error(`브랜드 조회 실패: ${response.status}`);
  return await response.json() as ProductCandidate[];
}
async function createProduct(inputType: "name" | "url", inputValue: string, key: string) {
  const payload = inputType === "url" ? { product_url: inputValue, verification_status: "unverified" } : { canonical_name: inputValue, normalized_name: normalize(inputValue), verification_status: "unverified" };
  const response = await db("products", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) }, key);
  if (!response.ok) throw new Error(`상품 기준정보 생성 실패: ${response.status}`);
  const rows = await response.json() as ProductCandidate[];
  if (!rows[0]?.id) throw new Error("상품 ID를 생성하지 못했습니다."); return rows[0];
}
async function analysisCompleteness(productId: string, key: string) {
  const [axisResponse, fitResponse] = await Promise.all([
    db(`product_axis_profiles?product_id=eq.${encodeURIComponent(productId)}&select=axis&limit=8`, { method: "GET" }, key),
    db(`product_type_fits?product_id=eq.${encodeURIComponent(productId)}&select=beauty_code&limit=32`, { method: "GET" }, key),
  ]);
  if (!axisResponse.ok || !fitResponse.ok) return { complete: false, axisCount: 0, fitCount: 0 };
  const axes = await axisResponse.json() as Array<{ axis: string }>;
  const fits = await fitResponse.json() as Array<{ beauty_code: string }>;
  const axisCount = new Set(axes.map((row) => row.axis)).size;
  const fitCount = new Set(fits.map((row) => row.beauty_code)).size;
  return { complete: axisCount >= 4 && fitCount >= 16, axisCount, fitCount };
}
async function setRequestStatus(requestId: string, status: "completed" | "submitted", key: string) {
  const response = await db(`product_analysis_requests?id=eq.${encodeURIComponent(requestId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status }),
  }, key);
  if (!response.ok) throw new Error(`분석 요청 상태 보정 실패: ${response.status}`);
}

export async function POST(request: NextRequest) {
  const { key } = config();
  if (!key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  let body: ProductRequestInput;
  try { body = await request.json() as ProductRequestInput; } catch { return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 }); }
  let inputValue = body.inputValue?.trim() ?? "";
  if (!inputValue || inputValue.length > 2000) return NextResponse.json({ ok: false, message: "상품명 또는 상품 링크를 확인해 주세요." }, { status: 400 });
  if (body.inputType !== "name" && body.inputType !== "url") return NextResponse.json({ ok: false, message: "상품 입력 유형이 올바르지 않습니다." }, { status: 400 });

  // Reuse the production real-time analysis path instead of leaving new products queued.
  // The legacy client expects requestId/sessionId and reads the stored result separately.
  let effectiveBeautyCode = body.beautyCode?.trim() ?? "";
  if (!BEAUTY_CODE.test(effectiveBeautyCode) && UUID.test(body.sessionId?.trim() ?? "")) {
    const sessionResponse = await db(`test_sessions?id=eq.${encodeURIComponent(body.sessionId!.trim())}&select=beauty_code&limit=1`, { method: "GET" }, key);
    if (sessionResponse.ok) {
      const sessions = await sessionResponse.json() as Array<{ beauty_code: string | null }>;
      effectiveBeautyCode = sessions[0]?.beauty_code ?? "";
    }
  }
  if (BEAUTY_CODE.test(effectiveBeautyCode)) {
    const forwarded = new NextRequest(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ beautyCode: effectiveBeautyCode, inputValue }),
    });
    const response = await analyzeProductFit(forwarded);
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok || result.ok !== true) {
      return NextResponse.json({
        ok: false, code: result.code || "PRODUCT_FIT_FAILED",
        message: result.message || "상품 적합도 분석에 실패했습니다. 다시 시도해 주세요.",
      }, { status: response.status });
    }
    return NextResponse.json({
      ...result, ok: true, requestId: result.requestId, sessionId: result.sessionId,
      productName: result.productName || inputValue, status: "completed",
      message: "상품 적합도 분석을 완료했습니다.",
    });
  }
  // Do not create an unprocessable 'submitted' entry without a valid Beauty Code.
  return NextResponse.json({ ok: false, code: "BEAUTY_CODE_REQUIRED",
    message: "Beauty Code를 확인할 수 없습니다. 적합도 분석 화면에서 다시 신청해 주세요." }, { status: 400 });
}
