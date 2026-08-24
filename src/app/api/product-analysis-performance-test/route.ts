import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const started = performance.now();

  const requestStarted = performance.now();
  const submitResponse = await fetch(`${origin}/api/product-analysis-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      beautyCode: "DGPV",
      inputType: "name",
      inputValue: "에스티로더 더블웨어 파운데이션",
    }),
    cache: "no-store",
  });
  const submitMs = performance.now() - requestStarted;
  const submit = await submitResponse.json() as {
    ok?: boolean;
    requestId?: string;
    sessionId?: string;
    status?: string;
    productId?: string;
    productName?: string;
    resolvedByAlias?: boolean;
    message?: string;
  };

  if (!submitResponse.ok || !submit.ok || !submit.requestId || !submit.sessionId) {
    return NextResponse.json({
      ok: false,
      phase: "submit",
      submitMs: Math.round(submitMs),
      totalMs: Math.round(performance.now() - started),
      submit,
    }, { status: 500 });
  }

  const resultStarted = performance.now();
  const resultResponse = await fetch(
    `${origin}/api/product-analysis-result?sessionId=${encodeURIComponent(submit.sessionId)}&requestId=${encodeURIComponent(submit.requestId)}`,
    { cache: "no-store" },
  );
  const resultMs = performance.now() - resultStarted;
  const result = await resultResponse.json() as {
    ok?: boolean;
    status?: string;
    userBeautyCode?: string | null;
    fits?: Array<{ beautyCode: string; fitScore: number }>;
  };

  const totalMs = performance.now() - started;
  const userFit = result.fits?.find((fit) => fit.beautyCode === "DGPV") ?? null;

  return NextResponse.json({
    ok: submitResponse.ok && resultResponse.ok && result.ok === true && result.status === "completed",
    targetUnder10Seconds: totalMs < 10000,
    timings: {
      submitMs: Math.round(submitMs),
      resultMs: Math.round(resultMs),
      totalMs: Math.round(totalMs),
    },
    submit: {
      status: submit.status,
      productName: submit.productName,
      resolvedByAlias: submit.resolvedByAlias ?? false,
      message: submit.message,
    },
    result: {
      status: result.status,
      userBeautyCode: result.userBeautyCode,
      fit: userFit,
      fitCount: result.fits?.length ?? 0,
    },
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
