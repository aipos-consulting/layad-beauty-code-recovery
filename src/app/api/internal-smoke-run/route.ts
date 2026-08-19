import { NextRequest, NextResponse } from "next/server";
import { POST as runProductAnalysis } from "../product-analysis-run/route";

const REQUEST_ID = "e6c98c3e-45b7-4b7c-b2f4-a1a63316cff3";
const NONCE = "layad-smoke-20260819-b2f8e6c1";

export async function GET(request: NextRequest) {
  const nonce = request.nextUrl.searchParams.get("nonce");
  if (nonce !== NONCE) return NextResponse.json({ ok: false }, { status: 404 });

  const runRequest = new NextRequest(new URL("/api/product-analysis-run", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId: REQUEST_ID }),
  });

  const response = await runProductAnalysis(runRequest);
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status, headers: { "Cache-Control": "no-store" } });
}
