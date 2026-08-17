import { NextRequest, NextResponse } from "next/server";

const CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;

function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

async function db(url: string, key: string, path: string) {
  return fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
}

function parseOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  if (response.output_text) return response.output_text;
  return response.output?.flatMap(item => item.content ?? []).map(item => item.text ?? "").join("") ?? "";
}

async function checkCostGuard(url: string, key: string) {
  const settingResponse = await db(url, key, "ai_operation_settings?setting_key=eq.default&select=monthly_budget_usd&limit=1");
  if (!settingResponse.ok) throw new Error("AI 운영 한도 설정을 읽지 못했습니다.");
  const settings = await settingResponse.json() as Array<{ monthly_budget_usd: number }>;
  const budget = Number(settings[0]?.monthly_budget_usd ?? 20);

  const adminKey = process.env.OPENAI_ADMIN_KEY;
  const projectId = process.env.OPENAI_PROJECT_ID;
  if (!adminKey || !projectId) return { allowed: false, spent: 0, budget, code: "COST_GUARD_NOT_CONFIGURED" };

  const now = new Date();
  const start = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
  const params = new URLSearchParams({
    start_time: String(start),
    end_time: String(Math.floor(Date.now() / 1000) + 1),
    bucket_width: "1d",
    limit: "31",
  });
  params.append("project_ids", projectId);
  const response = await fetch(`https://api.openai.com/v1/organization/costs?${params.toString()}`, {
    headers: { Authorization: `Bearer ${adminKey}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return { allowed: false, spent: 0, budget, code: "COST_GUARD_CHECK_FAILED" };
  const payload = await response.json() as { data?: Array<{ results?: Array<{ amount?: { value?: number } }> }> };
  const spent = (payload.data ?? []).reduce((sum, bucket) => sum + (bucket.results ?? []).reduce((inner, row) => inner + Number(row.amount?.value ?? 0), 0), 0);
  return { allowed: spent < budget, spent, budget, code: spent >= budget ? "MONTHLY_BUDGET_REACHED" : undefined };
}

export async function POST(request: NextRequest) {
  let body: { requestId?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 }); }

  if (!body.requestId || !/^[0-9a-f-]{36}$/i.test(body.requestId)) {
    return NextResponse.json({ ok: false, message: "분석 요청 ID를 확인해 주세요." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, code: "AI_NOT_CONFIGURED", message: "AI 분석 설정이 아직 연결되지 않았습니다. 수동 분석으로 계속해 주세요." }, { status: 503 });

  const { url, key } = supabaseConfig();
  if (!url || !key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED", message: "데이터 저장 설정을 확인해 주세요." }, { status: 503 });

  try {
    const guard = await checkCostGuard(url, key);
    if (!guard.allowed) {
      const message = guard.code === "MONTHLY_BUDGET_REACHED"
        ? `월 AI 운영 한도 $${guard.budget.toFixed(2)}에 도달했습니다. 자동 분석이 차단되었습니다. 오너가 월 한도를 상향하면 자동으로 재개됩니다.`
        : "비용 한도를 검증할 수 없어 AI 자동 분석을 안전 차단했습니다. OPENAI_ADMIN_KEY와 OPENAI_PROJECT_ID를 확인해 주세요.";
      return NextResponse.json({ ok: false, code: guard.code, message, spent: guard.spent, budget: guard.budget }, { status: 429 });
    }
  } catch (error) {
    return NextResponse.json({ ok: false, code: "COST_GUARD_ERROR", message: error instanceof Error ? error.message : "AI 비용 한도 확인 실패" }, { status: 503 });
  }

  const requestResponse = await db(url, key, `product_analysis_requests?id=eq.${body.requestId}&select=id,input_type,input_value&limit=1`);
  if (!requestResponse.ok) return NextResponse.json({ ok: false, code: "DATABASE_READ_FAILED" }, { status: 500 });
  const rows = await requestResponse.json() as Array<{ id: string; input_type: "name" | "url"; input_value: string }>;
  const row = rows[0];
  if (!row) return NextResponse.json({ ok: false, message: "상품 신청을 찾을 수 없습니다." }, { status: 404 });

  const scoreProperties = Object.fromEntries(CODES.map(code => [code, { type: "integer", minimum: 0, maximum: 100 }]));
  const prompt = `LAYAD BEAUTY CODE 상품 적합도 운영자용 초안을 작성하세요.\n\n상품: ${row.input_value}\n입력 형태: ${row.input_type}\n\n축 정의:\n- O/D: 유분 관리 성향 / 건조 관리 성향\n- G/M: 글로우 표현 / 매트 표현\n- P/C: 정교함·완성도 중심 / 간편함·편의성 중심\n- V/E: 제품·환경에 따라 결과가 달라짐 / 비교적 일정하고 안정적인 결과\n\n공개적으로 확인 가능한 사실만 사용하고, 확인할 수 없는 내용은 추정하지 마세요. 16개 코드 각각에 0~100 정수 점수를 부여하고 짧은 검토 요약을 작성하세요. 이 결과는 자동 공개되지 않고 운영자가 반드시 검토합니다.`;

  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-5-mini",
      store: false,
      tools: [{ type: "web_search" }],
      input: prompt,
      text: { format: { type: "json_schema", name: "layad_fit_analysis", strict: true, schema: {
        type: "object", additionalProperties: false,
        properties: { summary: { type: "string" }, scores: { type: "object", additionalProperties: false, properties: scoreProperties, required: [...CODES] } },
        required: ["summary", "scores"],
      } } },
    }),
  });

  if (!aiResponse.ok) {
    const detail = await aiResponse.text();
    return NextResponse.json({ ok: false, code: "AI_ANALYSIS_FAILED", message: "AI 분석에 실패했습니다. 수동 입력으로 계속할 수 있습니다.", detail }, { status: 502 });
  }

  try {
    const payload = await aiResponse.json();
    const outputText = parseOutputText(payload);
    const parsed = JSON.parse(outputText) as { summary?: string; scores?: Record<string, number> };
    const valid = CODES.every(code => Number.isInteger(parsed.scores?.[code]) && parsed.scores![code] >= 0 && parsed.scores![code] <= 100);
    if (!valid) throw new Error("invalid scores");
    return NextResponse.json({ ok: true, summary: parsed.summary ?? "AI 초안을 검토해 주세요.", scores: parsed.scores });
  } catch {
    return NextResponse.json({ ok: false, code: "AI_RESPONSE_INVALID", message: "AI 결과 형식을 확인하지 못했습니다. 수동 입력으로 계속할 수 있습니다." }, { status: 502 });
  }
}
