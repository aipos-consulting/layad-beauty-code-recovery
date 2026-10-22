import { NextResponse } from "next/server";

const LIMITS = {
  supabaseDbMb: 500,
  supabaseEgressGb: 5,
  supabaseStorageMb: 1000,
  vercelTransferGb: 100,
  vercelEdgeRequests: 1_000_000,
};

const WARNING_THRESHOLD = 80;
function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

function headers(key: string): Record<string, string> {
  return { apikey: key, ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }) };
}

async function readUsage(url: string, key: string) {
  const response = await fetch(`${url}/rest/v1/rpc/admin_capacity_usage`, {
    method: "POST", headers: { ...headers(key), "Content-Type": "application/json" },
    body: "{}", cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Supabase capacity measurement failed: ${response.status}`);
  const usage = await response.json() as { dbBytes: number; storageBytes: number; measuredAt: string };
  if (![usage.dbBytes, usage.storageBytes].every(v => Number.isFinite(Number(v)) && Number(v) >= 0)) {
    throw new Error("Supabase capacity measurement unavailable");
  }
  return usage;
}

async function countRows(url: string, key: string, path: string): Promise<number> {
  const r = await fetch(`${url}/rest/v1/${path}`, {
    headers: { ...headers(key), Prefer: "count=exact", Range: "0-0" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`Supabase count failed: ${r.status}`);
  const total = (r.headers.get("content-range") ?? "").split("/")[1];
  if (!total || total === "*") throw new Error("Supabase exact count unavailable");
  return Number(total);
}

function pct(value: number, limit: number) {
  return Math.round((value / limit) * 1000) / 10;
}

function kstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function kstDayRange(daysAgo: number) {
  const now = new Date();
  const { year, month, day } = kstDateParts(now);
  const anchor = new Date(Date.UTC(year, month - 1, day - daysAgo));
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const d = anchor.getUTCDate();
  const start = new Date(Date.UTC(y, m, d - 1, 15, 0, 0));
  const end = new Date(Date.UTC(y, m, d, 15, 0, 0));
  return { start: start.toISOString(), end: end.toISOString(), label: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

export async function GET() {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  try {
    const [marketingVisits, testSessions, analysisRequests, users, productTypeFits, usage] = await Promise.all([
      countRows(url, key, "marketing_visits?select=visit_id"),
      countRows(url, key, "test_sessions?select=id"),
      countRows(url, key, "product_analysis_requests?select=id"),
      countRows(url, key, "layad_users?select=id"),
      countRows(url, key, "product_type_fits?select=product_id"),
      readUsage(url, key),
    ]);

    const recentDays = await Promise.all([1, 2, 3, 4, 5].map(async daysAgo => {
      const range = kstDayRange(daysAgo);
      const visits = await countRows(url, key, `marketing_visits?select=visit_id&created_at=gte.${encodeURIComponent(range.start)}&created_at=lt.${encodeURIComponent(range.end)}`);
      return { date: range.label, visits };
    }));
    recentDays.sort((a, b) => a.date.localeCompare(b.date));

    const avgDailyVisits = recentDays.length ? recentDays.reduce((s, r) => s + r.visits, 0) / recentDays.length : 0;
    const projectedMonthlyVisits = Math.round(avgDailyVisits * 30);

    const dbMb = Number(usage.dbBytes) / 1_000_000;
    const storageMb = Number(usage.storageBytes) / 1_000_000;

    // 무료 플랜 Capacity Planning용 보수적 가정치: Supabase 100KB/visit, Vercel 1MB + 10 edge requests/visit.
    const projectedSupabaseEgressGb = Math.round(projectedMonthlyVisits * 0.0001 * 100) / 100;
    const projectedVercelTransferGb = Math.round(projectedMonthlyVisits * 0.001 * 100) / 100;
    const projectedVercelEdgeRequests = projectedMonthlyVisits * 10;

    const metrics = [
      { key: "supabase_db", label: "Supabase DB", value: dbMb, unit: "MB", limit: LIMITS.supabaseDbMb, percent: pct(dbMb, LIMITS.supabaseDbMb), basis: "actual" },
      { key: "supabase_storage", label: "Supabase File Storage", value: storageMb, unit: "MB", limit: LIMITS.supabaseStorageMb, percent: pct(storageMb, LIMITS.supabaseStorageMb), basis: "actual" },
      { key: "supabase_egress", label: "Supabase Egress", value: projectedSupabaseEgressGb, unit: "GB/month", limit: LIMITS.supabaseEgressGb, percent: pct(projectedSupabaseEgressGb, LIMITS.supabaseEgressGb), basis: "projection" },
      { key: "vercel_transfer", label: "Vercel Transfer", value: projectedVercelTransferGb, unit: "GB/month", limit: LIMITS.vercelTransferGb, percent: pct(projectedVercelTransferGb, LIMITS.vercelTransferGb), basis: "projection" },
      { key: "vercel_edge_requests", label: "Vercel Edge Requests", value: projectedVercelEdgeRequests, unit: "requests/month", limit: LIMITS.vercelEdgeRequests, percent: pct(projectedVercelEdgeRequests, LIMITS.vercelEdgeRequests), basis: "projection" },
    ].map(m => ({ ...m, status: m.percent >= WARNING_THRESHOLD ? "warning" : "normal" }));

    const warnings = metrics
      .filter(m => m.percent >= WARNING_THRESHOLD)
      .map(m => `${m.label} ${m.basis === "projection" ? "예상 사용률" : "사용률"} ${m.percent}% — ${m.basis === "projection" ? "추정치이므로 실제 사용량을 먼저 확인하세요." : "무료 한도에 가까워지고 있습니다. 유료 전환을 검토하세요."}`);

    const measured = metrics.filter(m => m.key.startsWith("supabase_") && m.basis === "actual");
    const highest = Math.max(...measured.map(m => m.percent));
    const level = highest >= 100 ? "limit" : highest >= 90 ? "urgent" : highest >= 80 ? "warning" : "normal";
    const upgradeNotice = {
      level,
      title: level === "limit" ? "Supabase 무료 한도 도달" : level === "urgent" ? "Supabase 유료 전환 준비" : level === "warning" ? "Supabase 유료 전환 검토" : "Supabase 저장 용량 여유",
      message: level === "limit" ? "DB 또는 파일 저장량이 무료 한도에 도달했습니다. 서비스 제한을 피하려면 사용량 정리 또는 유료 전환을 즉시 확인하세요."
        : level === "urgent" ? "DB 또는 파일 저장량이 무료 한도의 90% 이상입니다. 유료 전환 또는 용량 정리를 준비하세요."
        : level === "warning" ? "DB 또는 파일 저장량이 무료 한도의 80% 이상입니다. 유료 전환이 필요한 시점에 가까워지고 있습니다."
        : "DB와 파일 저장량은 무료 한도의 80% 미만입니다. 월간 전송량은 별도 확인이 필요합니다.",
    };

    return NextResponse.json({
      ok: true,
      warningThreshold: WARNING_THRESHOLD,
      recentDays,
      avgDailyVisits: Math.round(avgDailyVisits),
      projectedMonthlyVisits,
      counts: { marketingVisits, testSessions, analysisRequests, users, productTypeFits },
      metrics,
      warnings,
      upgradeNotice,
      measuredAt: usage.measuredAt,
      assumptions: {
        supabaseEgressKbPerVisit: 100,
        vercelTransferMbPerVisit: 1,
        vercelEdgeRequestsPerVisit: 10,
        dbBaseline: "Live pg_database_size measurement",
      },
      refreshedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, code: "CAPACITY_READ_FAILED", message: (e instanceof Error ? e.message : "Unknown").slice(0, 500) }, { status: 500 });
  }
}
