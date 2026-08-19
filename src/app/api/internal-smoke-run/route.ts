import { NextRequest, NextResponse } from "next/server";
import { POST as runProductAnalysis } from "../product-analysis-run/route";

const REQUEST_ID = "f7a37021-d5bb-4540-b55f-4c947aaf0eab";
const NONCE = "layad-smoke-20260819-a7f3c1e94b";

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
