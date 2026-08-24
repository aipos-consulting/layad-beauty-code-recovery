import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const started = Date.now();
  const response = await fetch(`${request.nextUrl.origin}/api/product-analysis-live`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId: "86b59f11-680b-4199-bd4e-14f94bb6938a" }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json({ httpStatus: response.status, totalMs: Date.now() - started, payload }, { status: response.ok ? 200 : 500 });
}
