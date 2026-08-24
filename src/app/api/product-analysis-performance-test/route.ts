import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const started = performance.now();
  const beautyCode = "DGPV";
  const inputValue = "ANUA Heartleaf 77% Soothing Toner";

  const requestStarted = performance.now();
  const submitResponse = await fetch(`${origin}/api/product-analysis-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beautyCode, inputType: "name", inputValue }),
    cache: "no-store",
  });
  const submitMs = performance.now() - requestStarted;
  const submit = await submitResponse.json().catch(() => ({})) as { ok?:boolean;requestId?:string;sessionId?:string;status?:string;productName?:string;message?:string };
  if (!submitResponse.ok || !submit.ok || !submit.requestId || !submit.sessionId) {
    return NextResponse.json({ ok:false,phase:"submit",timings:{submitMs:Math.round(submitMs),totalMs:Math.round(performance.now()-started)},submit },{status:500});
  }

  let liveMs = 0;
  let live: { ok?:boolean;status?:string;elapsedMs?:number;message?:string } | null = null;
  if (submit.status !== "completed") {
    const liveStarted = performance.now();
    const liveResponse = await fetch(`${origin}/api/product-analysis-live`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: submit.requestId }),
      cache: "no-store",
    });
    liveMs = performance.now() - liveStarted;
    live = await liveResponse.json().catch(() => ({}));
    if (!liveResponse.ok || !live?.ok || live.status !== "completed") {
      return NextResponse.json({ok:false,phase:"live",timings:{submitMs:Math.round(submitMs),liveMs:Math.round(liveMs),totalMs:Math.round(performance.now()-started)},submit,live},{status:500});
    }
  }

  const resultStarted = performance.now();
  const resultResponse = await fetch(`${origin}/api/product-analysis-result?sessionId=${encodeURIComponent(submit.sessionId)}&requestId=${encodeURIComponent(submit.requestId)}`, { cache:"no-store" });
  const resultMs = performance.now() - resultStarted;
  const result = await resultResponse.json().catch(() => ({})) as {ok?:boolean;status?:string;userBeautyCode?:string|null;fits?:Array<{beautyCode:string;fitScore:number}>};
  const totalMs = performance.now() - started;
  return NextResponse.json({
    ok:resultResponse.ok&&result.ok===true&&result.status==="completed",
    targetUnder10Seconds:totalMs<10000,
    timings:{submitMs:Math.round(submitMs),liveMs:Math.round(liveMs),openAiMs:live?.elapsedMs??0,resultMs:Math.round(resultMs),totalMs:Math.round(totalMs)},
    submit:{status:submit.status,productName:submit.productName},
    live,
    result:{status:result.status,userBeautyCode:result.userBeautyCode,fit:result.fits?.find((f)=>f.beautyCode===beautyCode)??null,fitCount:result.fits?.length??0},
  },{headers:{"Cache-Control":"no-store, max-age=0"}});
}
