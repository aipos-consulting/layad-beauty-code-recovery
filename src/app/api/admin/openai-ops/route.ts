import { NextRequest, NextResponse } from "next/server";

type Mode = "pilot" | "standard" | "growth" | "custom";
type Setting = {
  setting_key: string;
  mode: Mode;
  monthly_budget_usd: number;
  warning_low_percent: number;
  warning_high_percent: number;
  hard_stop_enabled: boolean;
  updated_at: string;
};

type CostPoint = { date: string; cost: number };

function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

function openAIConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY,
    adminKey: process.env.OPENAI_ADMIN_KEY,
    projectId: process.env.OPENAI_PROJECT_ID,
    model: process.env.OPENAI_MODEL ?? process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-5-mini",
  };
}

async function db(url: string, key: string, path: string, init: RequestInit = {}) {
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

async function readSetting(url: string, key: string): Promise<Setting> {
  const response = await db(url, key, "ai_operation_settings?setting_key=eq.default&select=*&limit=1");
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json() as Setting[];
  return rows[0] ?? {
    setting_key: "default",
    mode: "pilot",
    monthly_budget_usd: 20,
    warning_low_percent: 50,
    warning_high_percent: 80,
    hard_stop_enabled: true,
    updated_at: new Date().toISOString(),
  };
}

function utcStartOfMonth() {
  const now = new Date();
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
}

function startDaysAgo(days: number) {
  return Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
}

async function fetchCosts(adminKey: string, projectId: string, days = 180): Promise<CostPoint[]> {
  const params = new URLSearchParams({
    start_time: String(startDaysAgo(days)),
    end_time: String(Math.floor(Date.now() / 1000) + 1),
    bucket_width: "1d",
    limit: String(Math.min(days, 180)),
  });
  params.append("project_ids", projectId);
  const response = await fetch(`https://api.openai.com/v1/organization/costs?${params.toString()}`, {
    headers: { Authorization: `Bearer ${adminKey}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`OpenAI costs ${response.status}: ${await response.text()}`);
  const payload = await response.json() as {
    data?: Array<{ start_time: number; results?: Array<{ amount?: { value?: number }; project_id?: string | null }> }>;
  };
  return (payload.data ?? []).map(bucket => ({
    date: new Date(bucket.start_time * 1000).toISOString().slice(0, 10),
    cost: (bucket.results ?? []).reduce((sum, row) => sum + Number(row.amount?.value ?? 0), 0),
  }));
}

function summarize(points: CostPoint[], budget: number) {
  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7);
  const todayCost = points.find(point => point.date === today)?.cost ?? 0;
  const recent7 = points.slice(-7).reduce((sum, point) => sum + point.cost, 0);
  const monthCost = points.filter(point => point.date.startsWith(monthPrefix)).reduce((sum, point) => sum + point.cost, 0);
  const remaining = Math.max(0, budget - monthCost);
  const usagePercent = budget > 0 ? Math.min(999, (monthCost / budget) * 100) : 0;
  const now = new Date();
  const day = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const forecast = day > 0 ? (monthCost / day) * daysInMonth : monthCost;
  return { todayCost, recent7, monthCost, remaining, usagePercent, forecast };
}

export async function GET() {
  const { url, key } = supabaseConfig();
  if (!url || !key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  const openai = openAIConfig();

  try {
    const setting = await readSetting(url, key);
    let points: CostPoint[] = [];
    let costMessage = "OpenAI Admin Key와 Project ID를 설정하면 실제 비용 추세가 표시됩니다.";
    if (openai.adminKey && openai.projectId) {
      try {
        points = await fetchCosts(openai.adminKey, openai.projectId, 180);
        costMessage = "OpenAI 프로젝트 실제 비용 데이터를 조회했습니다.";
      } catch (error) {
        costMessage = error instanceof Error ? error.message : "OpenAI 비용 조회 실패";
      }
    }
    const summary = summarize(points, Number(setting.monthly_budget_usd));
    return NextResponse.json({
      ok: true,
      setting,
      connection: {
        apiKeyConfigured: Boolean(openai.apiKey),
        adminKeyConfigured: Boolean(openai.adminKey),
        projectIdConfigured: Boolean(openai.projectId),
        model: openai.model,
        costGuardReady: Boolean(openai.adminKey && openai.projectId),
      },
      costs: { points, ...summary, message: costMessage },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "운영 설정 조회 실패" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { url, key } = supabaseConfig();
  if (!url || !key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  let body: { action?: "save" | "test"; mode?: Mode; monthlyBudgetUsd?: number; hardStopEnabled?: boolean };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 }); }

  if (body.action === "test") {
    const openai = openAIConfig();
    if (!openai.apiKey) return NextResponse.json({ ok: false, code: "OPENAI_NOT_CONFIGURED", message: "OPENAI_API_KEY가 설정되지 않았습니다." }, { status: 503 });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openai.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: openai.model, input: "Return only OK.", max_output_tokens: 8, store: false }),
    });
    if (!response.ok) return NextResponse.json({ ok: false, message: `OpenAI 연결 실패 (${response.status})`, detail: await response.text() }, { status: 502 });
    return NextResponse.json({ ok: true, message: `OpenAI 연결 정상 · ${openai.model}` });
  }

  const presets: Record<Exclude<Mode, "custom">, number> = { pilot: 20, standard: 50, growth: 100 };
  const mode = body.mode ?? "pilot";
  const budget = mode === "custom" ? Number(body.monthlyBudgetUsd) : presets[mode];
  if (!Number.isFinite(budget) || budget <= 0 || budget > 10000) {
    return NextResponse.json({ ok: false, message: "월 한도는 0보다 크고 10,000달러 이하로 입력해 주세요." }, { status: 400 });
  }

  const response = await db(url, key, "ai_operation_settings?setting_key=eq.default", {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      mode,
      monthly_budget_usd: budget,
      hard_stop_enabled: body.hardStopEnabled ?? true,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) return NextResponse.json({ ok: false, message: await response.text() }, { status: 500 });
  const rows = await response.json();
  return NextResponse.json({ ok: true, setting: rows[0] });
}

export { utcStartOfMonth };
