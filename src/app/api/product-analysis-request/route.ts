import { NextRequest, NextResponse } from "next/server";

type ProductRequestInput = { sessionId: string; inputType: "name" | "url"; inputValue: string };
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

  const insert = await supabase("product_analysis_requests", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ session_id: body.sessionId, input_type: body.inputType, input_value: inputValue, status: "submitted" }),
  }, supabaseUrl, serviceKey);

  if (!insert.ok) {
    console.error("Product request insert failed", insert.status, await insert.text());
    return NextResponse.json({ ok: false, code: "DATABASE_WRITE_FAILED" }, { status: 500 });
  }
  const rows = (await insert.json()) as Array<{ id: string }>;
  const requestId = rows[0]?.id;
  if (!requestId) return NextResponse.json({ ok: false, code: "DATABASE_WRITE_FAILED" }, { status: 500 });
  return NextResponse.json({ ok: true, requestId, status: "submitted", mode: "manual_chatgpt_review", message: "상품 적합도 분석 신청이 접수되었습니다." });
}
