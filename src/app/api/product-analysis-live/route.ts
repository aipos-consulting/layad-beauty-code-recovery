import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODEL = "gpt-5.4-mini";
const ANALYSIS_VERSION = "layad-hybrid-v1";

const BEAUTY_CODES = [
  "OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE",
  "DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE",
] as const;

type Signals = {
  oil_control: number;
  hydration: number;
  glow_finish: number;
  matte_finish: number;
  precision_required: number;
  ease_of_use: number;
  variability: number;
  consistency: number;
};

type AiResult = {
  canonical_name?: string;
  brand?: string | null;
  category?: string | null;
  confidence?: number;
  evidence_count?: number;
  signals?: Partial<Signals>;
  summary?: string;
};

function dbHeaders(key: string, extra?: HeadersInit): HeadersInit {
  const base: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) base.Authorization = `Bearer ${key}`;
  return { ...base, ...(extra ?? {}) };
}

async function db(path: string, init: RequestInit, key: string) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: dbHeaders(key, init.headers),
    cache: "no-store",
  });
}

function clamp(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50;
}

function normalizeSignals(raw: Partial<Signals> | undefined): Signals {
  return {
    oil_control: clamp(raw?.oil_control),
    hydration: clamp(raw?.hydration),
    glow_finish: clamp(raw?.glow_finish),
    matte_finish: clamp(raw?.matte_finish),
    precision_required: clamp(raw?.precision_required),
    ease_of_use: clamp(raw?.ease_of_use),
    variability: clamp(raw?.variability),
    consistency: clamp(raw?.consistency),
  };
}

function scoreCode(code: string, signals: Signals) {
  const values = [
    code[0] === "O" ? signals.oil_control : signals.hydration,
    code[1] === "G" ? signals.glow_finish : signals.matte_finish,
    code[2] === "P" ? signals.precision_required : signals.ease_of_use,
    code[3] === "V" ? signals.variability : signals.consistency,
  ];
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function extractOutputText(payload: unknown) {
  const data = payload as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

function parseJsonText(text: string): AiResult {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed) as AiResult;
}

async function setRequestStatus(requestId: string, status: string, key: string, errorMessage: string | null = null) {
  await db(`product_analysis_requests?id=eq.${requestId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status, error_message: errorMessage, updated_at: new Date().toISOString() }),
  }, key);
}

export async function POST(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!serviceKey) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  if (!openaiKey) return NextResponse.json({ ok: false, code: "OPENAI_NOT_CONFIGURED" }, { status: 503 });

  let requestId = "";
  try {
    const body = await request.json() as { requestId?: string };
    requestId = body.requestId?.trim() ?? "";
    if (!UUID.test(requestId)) return NextResponse.json({ ok: false, message: "분석 요청 ID가 올바르지 않습니다." }, { status: 400 });

    const requestResponse = await db(
      `product_analysis_requests?id=eq.${requestId}&select=id,status,input_type,input_value,product_id&limit=1`,
      { method: "GET" }, serviceKey,
    );
    if (!requestResponse.ok) throw new Error(`분석 요청 조회 실패: ${requestResponse.status}`);
    const rows = await requestResponse.json() as Array<{ id: string; status: string; input_type: string; input_value: string; product_id: string | null }>;
    const row = rows[0];
    if (!row?.product_id) return NextResponse.json({ ok: false, message: "분석할 상품을 찾지 못했습니다." }, { status: 404 });
    if (row.status === "completed") return NextResponse.json({ ok: true, status: "completed", cached: true });

    const settingsResponse = await db(
      "ai_operation_settings?setting_key=eq.default&select=mode,hard_stop_enabled&limit=1",
      { method: "GET" }, serviceKey,
    );
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json() as Array<{ mode?: string; hard_stop_enabled?: boolean }>;
      if (settings[0]?.mode === "off") {
        return NextResponse.json({ ok: false, code: "AI_MODE_OFF", message: "실시간 분석이 현재 중지되어 있습니다." }, { status: 503 });
      }
    }

    await setRequestStatus(requestId, "analyzing", serviceKey);

    const prompt = `You are the product-signal classifier for LAYAD Beauty Code.\nResearch only publicly verifiable information about this cosmetics product using web search. Do not invent unavailable facts.\nProduct input: ${row.input_value}\nInput type: ${row.input_type}\n\nReturn JSON only with exactly these keys:\n{\n  \"canonical_name\": \"string\",\n  \"brand\": \"string or null\",\n  \"category\": \"string or null\",\n  \"confidence\": 0.0,\n  \"evidence_count\": 0,\n  \"signals\": {\n    \"oil_control\": 0,\n    \"hydration\": 0,\n    \"glow_finish\": 0,\n    \"matte_finish\": 0,\n    \"precision_required\": 0,\n    \"ease_of_use\": 0,\n    \"variability\": 0,\n    \"consistency\": 0\n  },\n  \"summary\": \"short Korean evidence-based summary\"\n}\nAll signal values must be integers 0-100. confidence must be 0-1. Use low confidence when evidence is weak.`;

    const started = Date.now();
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        tools: [{ type: "web_search" }],
        reasoning: { effort: "low" },
        max_output_tokens: 700,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });
    const elapsedMs = Date.now() - started;
    const aiPayload = await aiResponse.json().catch(() => ({}));
    if (!aiResponse.ok) {
      const message = (aiPayload as { error?: { message?: string } }).error?.message ?? `OpenAI 호출 실패: ${aiResponse.status}`;
      throw new Error(message);
    }

    const parsed = parseJsonText(extractOutputText(aiPayload));
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0)));
    if (confidence < 0.6) {
      await setRequestStatus(requestId, "insufficient_reviews", serviceKey, "공개 근거가 충분하지 않아 자동 분석을 보류했습니다.");
      return NextResponse.json({ ok: true, status: "insufficient_reviews", confidence, elapsedMs, message: "공개 근거가 충분하지 않아 자동 분석을 보류했습니다." });
    }

    const signals = normalizeSignals(parsed.signals);
    const reviewCount = Math.max(0, Math.min(99, Math.round(Number(parsed.evidence_count ?? 0))));
    const fits = BEAUTY_CODES.map((beautyCode) => ({
      product_id: row.product_id,
      beauty_code: beautyCode,
      fit_score: scoreCode(beautyCode, signals),
      review_count: reviewCount,
      confidence,
      analysis_version: ANALYSIS_VERSION,
      updated_at: new Date().toISOString(),
    }));

    const fitResponse = await db("product_type_fits?on_conflict=product_id,beauty_code", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(fits),
    }, serviceKey);
    if (!fitResponse.ok) throw new Error(`적합도 저장 실패: ${fitResponse.status} ${(await fitResponse.text()).slice(0, 300)}`);

    const canonicalName = parsed.canonical_name?.trim() || row.input_value;
    const normalizedName = canonicalName.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
    await db(`products?id=eq.${row.product_id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        canonical_name: canonicalName,
        normalized_name: normalizedName,
        brand: parsed.brand?.trim() || null,
        category: parsed.category?.trim() || null,
        verification_status: row.input_type === "url" ? "link_verified" : "name_verified",
        updated_at: new Date().toISOString(),
      }),
    }, serviceKey);

    await setRequestStatus(requestId, "completed", serviceKey);

    const usage = aiPayload as { usage?: { input_tokens?: number; output_tokens?: number } };
    await db("review_analysis_runs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        product_id: row.product_id,
        status: "completed",
        provider: "openai",
        model_name: MODEL,
        prompt_version: "layad-signal-v1",
        analysis_version: ANALYSIS_VERSION,
        input_review_count: reviewCount,
        input_tokens: Number(usage.usage?.input_tokens ?? 0),
        output_tokens: Number(usage.usage?.output_tokens ?? 0),
        started_at: new Date(started).toISOString(),
        completed_at: new Date().toISOString(),
      }),
    }, serviceKey);

    return NextResponse.json({
      ok: true,
      status: "completed",
      cached: false,
      elapsedMs,
      confidence,
      productName: canonicalName,
      summary: parsed.summary ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "실시간 분석에 실패했습니다.";
    if (requestId && UUID.test(requestId)) await setRequestStatus(requestId, "failed", serviceKey, message.slice(0, 500)).catch(() => undefined);
    console.error("Hybrid realtime product analysis failed", error);
    return NextResponse.json({ ok: false, code: "REALTIME_ANALYSIS_FAILED", message }, { status: 500 });
  }
}
