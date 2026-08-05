import { NextRequest, NextResponse } from "next/server";

function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

async function db(url: string, key: string, path: string, init: RequestInit) {
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
  const { url, key } = config();
  if (!url || !key) {
    return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  let body: { requestId?: string; action?: "start" | "prepare-next" | "hold" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 });
  }

  if (body.action === "prepare-next") {
    const pending = await db(
      url,
      key,
      "product_analysis_requests?status=in.(submitted,collecting_reviews)&select=id&order=created_at.asc&limit=1",
      { method: "GET" },
    );
    if (!pending.ok) {
      return NextResponse.json({ ok: false, code: "DATABASE_READ_FAILED", detail: await pending.text() }, { status: 500 });
    }
    const rows = (await pending.json()) as Array<{ id: string }>;
    const next = rows[0];
    if (!next) return NextResponse.json({ ok: true, requestId: null, message: "분석 대기 상품이 없습니다." });

    const update = await db(url, key, `product_analysis_requests?id=eq.${next.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "analyzing", error_message: null, updated_at: new Date().toISOString() }),
    });
    if (!update.ok) {
      return NextResponse.json({ ok: false, code: "REQUEST_UPDATE_FAILED", detail: await update.text() }, { status: 500 });
    }
    return NextResponse.json({ ok: true, requestId: next.id });
  }

  if (!body.requestId || !/^[0-9a-f-]{36}$/i.test(body.requestId)) {
    return NextResponse.json({ ok: false, message: "신청 ID를 확인해 주세요." }, { status: 400 });
  }

  const patch = body.action === "hold"
    ? { status: "failed", error_message: "운영자 보류", updated_at: new Date().toISOString() }
    : { status: "analyzing", error_message: null, updated_at: new Date().toISOString() };

  const update = await db(url, key, `product_analysis_requests?id=eq.${body.requestId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!update.ok) {
    return NextResponse.json({ ok: false, code: "REQUEST_UPDATE_FAILED", detail: await update.text() }, { status: 500 });
  }

  return NextResponse.json({ ok: true, requestId: body.requestId, action: body.action ?? "start" });
}
