import { NextResponse } from "next/server";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";

function supabaseHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openaiAdminKey = process.env.OPENAI_ADMIN_KEY;
  const openaiProjectId = process.env.OPENAI_PROJECT_ID;

  let databaseReachable = false;
  let analysisRunTableReachable = false;
  let budgetSettingReachable = false;
  let costGuardReachable = false;
  let budgetAvailable: boolean | null = null;
  let settingsStatus: number | null = null;
  let runsStatus: number | null = null;
  let settingsError: string | null = null;
  let runsError: string | null = null;

  if (serviceKey) {
    const headers = supabaseHeaders(serviceKey);
    try {
      const [settingsResponse, runsResponse] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/ai_operation_settings?setting_key=eq.default&select=monthly_budget_usd&limit=1`, {
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }),
        fetch(`${SUPABASE_URL}/rest/v1/review_analysis_runs?select=id&limit=1`, {
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }),
      ]);
      settingsStatus = settingsResponse.status;
      runsStatus = runsResponse.status;
      databaseReachable = settingsResponse.ok || runsResponse.ok;
      budgetSettingReachable = settingsResponse.ok;
      analysisRunTableReachable = runsResponse.ok;

      if (!settingsResponse.ok) {
        settingsError = (await settingsResponse.text()).slice(0, 500);
      }
      if (!runsResponse.ok) {
        runsError = (await runsResponse.text()).slice(0, 500);
      }

      if (settingsResponse.ok && openaiAdminKey && openaiProjectId) {
        const settings = (await settingsResponse.json()) as Array<{ monthly_budget_usd?: number }>;
        const budget = Number(settings[0]?.monthly_budget_usd ?? 20);
        const now = new Date();
        const start = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
        const params = new URLSearchParams({
          start_time: String(start),
          end_time: String(Math.floor(Date.now() / 1000) + 1),
          bucket_width: "1d",
          limit: "31",
        });
        params.append("project_ids", openaiProjectId);
        const costResponse = await fetch(`https://api.openai.com/v1/organization/costs?${params.toString()}`, {
          headers: { Authorization: `Bearer ${openaiAdminKey}`, "Content-Type": "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        costGuardReachable = costResponse.ok;
        if (costResponse.ok) {
          const payload = await costResponse.json() as { data?: Array<{ results?: Array<{ amount?: { value?: number } }> }> };
          const spent = (payload.data ?? []).reduce(
            (sum, bucketRow) => sum + (bucketRow.results ?? []).reduce((inner, row) => inner + Number(row.amount?.value ?? 0), 0),
            0,
          );
          budgetAvailable = spent < budget;
        }
      }
    } catch (error) {
      databaseReachable = false;
      settingsError = error instanceof Error ? error.message.slice(0, 500) : "unknown error";
    }
  }

  const checks = {
    supabaseConfigured: Boolean(serviceKey),
    databaseReachable,
    analysisRunTableReachable,
    openaiApiConfigured: Boolean(openaiApiKey),
    costGuardConfigured: Boolean(openaiAdminKey && openaiProjectId),
    budgetSettingReachable,
    costGuardReachable,
    budgetAvailable,
  };

  const ready = checks.supabaseConfigured
    && checks.databaseReachable
    && checks.analysisRunTableReachable
    && checks.openaiApiConfigured
    && checks.costGuardConfigured
    && checks.budgetSettingReachable
    && checks.costGuardReachable
    && checks.budgetAvailable !== false;

  return NextResponse.json({
    ok: true,
    ready,
    checks,
    diagnostics: {
      settingsStatus,
      runsStatus,
      settingsError,
      runsError,
      supabaseKeyType: serviceKey?.startsWith("sb_secret_") ? "secret" : serviceKey ? "legacy-or-other" : "missing",
    },
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
