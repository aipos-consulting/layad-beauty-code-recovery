import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "REALTIME_AI_DISABLED",
      message: "실시간 OpenAI 상품 분석은 비활성화되어 있습니다. 상품 요청은 ChatGPT 수동 분석 대기열에서 처리합니다.",
    },
    { status: 410 },
  );
}
