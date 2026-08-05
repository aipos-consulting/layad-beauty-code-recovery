import { NextRequest, NextResponse } from "next/server";

type ProductRequestInput = {
  sessionId: string;
  inputType: "name" | "url";
  inputValue: string;
};

const TEST_PRODUCT = "layad";

function config() {
  return {
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

async function supabase(path: string, init: RequestInit, url: string, key: string) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function POST(request: NextRequest) {
  const { supabaseUrl, serviceKey } = config();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  let body: ProductRequestInput;
  try {
    body = (await request.json()) as ProductRequestInput;
  } catch {
    return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 });
  }

  const inputValue = body.inputValue?.trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(body.sessionId) || !inputValue) {
    return NextResponse.json({ ok: false, message: "요청값을 확인해 주세요." }, { status: 400 });
  }

  if (body.inputType !== "name" || inputValue !== TEST_PRODUCT) {
    return NextResponse.json({
      ok: false,
      code: "TEST_PRODUCT_ONLY",
      message: "현재 테스트 기간에는 layad 상품만 신청할 수 있습니다.",
    }, { status: 400 });
  }

  const insert = await supabase("product_analysis_requests", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      session_id: body.sessionId,
      input_type: "name",
      input_value: TEST_PRODUCT,
      status: "submitted",
      error_message: null,
    }),
  }, supabaseUrl, serviceKey);

  if (!insert.ok) {
    const detail = await insert.text();
    console.error("Product request insert failed", insert.status, detail);
    return NextResponse.json({ ok: false, code: "DATABASE_WRITE_FAILED" }, { status: 500 });
  }

  const rows = (await insert.json()) as Array<{ id: string }>;
  const requestId = rows[0]?.id;
  if (!requestId) {
    return NextResponse.json({ ok: false, code: "DATABASE_WRITE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    requestId,
    status: "submitted",
    mode: "manual_chatgpt_review",
    testProduct: TEST_PRODUCT,
    retryAllowed: true,
    message: "layad 테스트 신청이 접수되었습니다. 완료 전까지 같은 상품으로 다시 신청할 수 있습니다.",
  });
}
