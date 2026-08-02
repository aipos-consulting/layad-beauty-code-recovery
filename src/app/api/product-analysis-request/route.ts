import { NextRequest, NextResponse } from "next/server";

type ProductRequestInput = {
  sessionId: string;
  inputType: "name" | "url";
  inputValue: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, serviceRoleKey };
}

export async function POST(request: NextRequest) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, code: "SUPABASE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  let body: ProductRequestInput;
  try {
    body = (await request.json()) as ProductRequestInput;
  } catch {
    return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!/^[0-9a-f-]{36}$/i.test(body.sessionId)) {
    return NextResponse.json({ ok: false, message: "세션 ID가 올바르지 않습니다." }, { status: 400 });
  }

  if (body.inputType !== "name" && body.inputType !== "url") {
    return NextResponse.json({ ok: false, message: "상품 입력 유형이 올바르지 않습니다." }, { status: 400 });
  }

  const inputValue = body.inputValue?.trim();
  if (!inputValue || inputValue.length > 2000) {
    return NextResponse.json({ ok: false, message: "상품 입력값을 확인해 주세요." }, { status: 400 });
  }

  if (body.inputType === "url") {
    try {
      const parsed = new URL(inputValue);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
    } catch {
      return NextResponse.json({ ok: false, message: "공개 상품 링크를 입력해 주세요." }, { status: 400 });
    }
  }

  const response = await fetch(`${url}/rest/v1/product_analysis_requests`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      session_id: body.sessionId,
      input_type: body.inputType,
      input_value: inputValue,
      status: "submitted",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Supabase product request insert failed", response.status, await response.text());
    return NextResponse.json({ ok: false, code: "DATABASE_WRITE_FAILED" }, { status: 500 });
  }

  const rows = (await response.json()) as Array<{ id: string }>;
  return NextResponse.json({ ok: true, requestId: rows[0]?.id });
}
