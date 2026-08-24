import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const started = performance.now();
  const response = await fetch(`${request.nextUrl.origin}/api/product-fit-fast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      beautyCode: "DGPV",
      inputValue: "ROUND LAB 1025 Dokdo Toner",
    }),
    cache: "no-store",
  });
  const wrapperMs = performance.now() - started;
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json({
    ok: response.ok && Boolean((payload as { ok?: boolean }).ok),
    wrapperMs: Math.round(wrapperMs),
    payload,
  }, {
    status: response.ok ? 200 : 500,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
