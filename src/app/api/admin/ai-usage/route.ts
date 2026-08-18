import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";

type CostBucket = {
  start_time?: number;
  end_time?: number;
  results?: Array<{ amount?: { value?: number; currency?: string }; project_id?: string | null; line_item?: string | null }>;
};

type CostPayload = { data?: CostBucket[]; has_more?: boolean; next_page?: string | null };

type Setting = {
  monthly_budget_usd: number | string;
  warning_low_percent: number;
  warning_high_percent: number;
  hard_stop_enabled: boolean;
  mode: string;
};

function config() {
  return {
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
    adminKey: process.env.OPENAI_ADMIN_KEY,
    projectId: process.env.OPENAI_PROJECT_ID,
    model: process.env.OPENAI_MODEL ?? process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-5-mini",
  };
}

function supabaseHeaders(key: string): HeadersInit {
  const base: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) base.Authorization = `Bearer ${key}`;
  return base;
}

async function readSupabase<T>(path: string, key: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: supabaseHeaders(key),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase read failed (${response.status})`);
  return await response.json() as T;
}

function startOfUtcMonth(now = new Date()) {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
}

function dateKey(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const { serviceKey, adminKey, projectId, model } = config();
  if (!serviceKey) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  try {
    const settings = await readSupabase<Setting[]>(
      "ai_operation_settings?setting_key=eq.default&select=monthly_budget_usd,warning_low_percent,warning_high_percent,hard_stop_enabled,mode&limit=1",
      serviceKey,
    );
    const setting = settings[0] ?? { monthly_budget_usd: 20, warning_low_percent: 50, warning_high_percent: 80, hard_stop_enabled: true, mode: "pilot" };
    const budget = Number(setting.monthly_budget_usd ?? 20);

    if (!adminKey || !projectId) {
      return NextResponse.json({
        ok: false,
        code: "COST_GUARD_NOT_CONFIGURED",
        message: "OpenAI 비용 검증용 Admin Key 또는 Project ID가 연결되지 않았습니다.",
        budget,
        hardStopEnabled: Boolean(setting.hard_stop_enabled),
      }, { status: 503 });
    }

    const url = new URL(request.url);
    const requestedDays = Number(url.searchParams.get("days") ?? 31);
    const days = Number.isFinite(requestedDays) ? Math.min(31, Math.max(7, Math.round(requestedDays))) : 31;
    const now = new Date();
    const monthStart = startOfUtcMonth(now);
    const rangeStart = Math.max(monthStart, Math.floor((Date.now() - (days - 1) * 86400000) / 1000));
    const end = Math.floor(Date.now() / 1000) + 1;

    const params = new URLSearchParams({
      start_time: String(rangeStart),
      end_time: String(end),
      bucket_width: "1d",
      limit: "31",
    });
    params.append("project_ids", projectId);

    const costResponse = await fetch(`https://api.openai.com/v1/organization/costs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${adminKey}`, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!costResponse.ok) {
      const detail = (await costResponse.text()).slice(0, 400);
      return NextResponse.json({ ok: false, code: "OPENAI_COSTS_READ_FAILED", message: `OpenAI 비용 조회 실패 (${costResponse.status})`, detail }, { status: 502 });
    }

    const payload = await costResponse.json() as CostPayload;
    const daily = (payload.data ?? []).map((bucket) => ({
      date: dateKey(bucket.start_time ?? 0),
      costUsd: Number((bucket.results ?? []).reduce((sum, row) => sum + Number(row.amount?.value ?? 0), 0).toFixed(6)),
    }));
    const spent = Number(daily.reduce((sum, row) => sum + row.costUsd, 0).toFixed(6));
    const remaining = Number(Math.max(0, budget - spent).toFixed(6));
    const utilizationPercent = budget > 0 ? Number(Math.min(100, spent / budget * 100).toFixed(2)) : 100;
    const blocked = Boolean(setting.hard_stop_enabled) && spent >= budget;
    const warning = utilizationPercent >= Number(setting.warning_high_percent)
      ? "high"
      : utilizationPercent >= Number(setting.warning_low_percent)
        ? "low"
        : "normal";

    const monthIso = new Date(monthStart * 1000).toISOString();
    const runs = await readSupabase<Array<{ status: string; input_tokens: number | null; output_tokens: number | null; created_at: string }>>(
      `review_analysis_runs?created_at=gte.${encodeURIComponent(monthIso)}&select=status,input_tokens,output_tokens,created_at&order=created_at.desc&limit=5000`,
      serviceKey,
    );
    const completedRuns = runs.filter((row) => row.status === "completed").length;
    const failedRuns = runs.filter((row) => row.status === "failed").length;
    const inputTokens = runs.reduce((sum, row) => sum + Number(row.input_tokens ?? 0), 0);
    const outputTokens = runs.reduce((sum, row) => sum + Number(row.output_tokens ?? 0), 0);

    return NextResponse.json({
      ok: true,
      source: "OpenAI organization Costs API",
      projectId,
      model,
      mode: setting.mode,
      budgetUsd: budget,
      spentUsd: spent,
      remainingUsd: remaining,
      utilizationPercent,
      warning,
      warningLowPercent: Number(setting.warning_low_percent),
      warningHighPercent: Number(setting.warning_high_percent),
      hardStopEnabled: Boolean(setting.hard_stop_enabled),
      blocked,
      month: new Date().toISOString().slice(0, 7),
      daily,
      localRuns: { total: runs.length, completed: completedRuns, failed: failedRuns, inputTokens, outputTokens },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      code: "AI_USAGE_READ_FAILED",
      message: error instanceof Error ? error.message : "AI 사용량 조회에 실패했습니다.",
    }, { status: 500 });
  }
}
