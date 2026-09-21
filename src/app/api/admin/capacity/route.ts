import { NextResponse } from "next/server";

const LIMITS = {
  supabaseDbMb: 500,
  supabaseEgressGb: 5,
  vercelTransferGb: 100,
  vercelEdgeRequests: 1_000_000,
};

const WARNING_THRESHOLD = 80;
const BASELINE = {
  dbMb: 23,
  marketingVisits: 7874,
  testSessions: 1175,
  analysisRequests: 607,
  users: 206,
  productTypeFits: 5744,
};

function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

async function countRows(url: string, key: string, path: string): Promise<number> {
  const r = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
    cache: "no-store",
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
    const [marketingVisits, testSessions, analysisRequests, users, productTypeFits] = await Promise.all([
      countRows(url, key, "marketing_visits?select=id"),
      countRows(url, key, "test_sessions?select=id"),
      countRows(url, key, "product_analysis_requests?select=id"),
      countRows(url, key, "layad_users?select=id"),
      countRows(url, key, "product_type_fits?select=id"),
    ]);

    const recentDays = await Promise.all([1, 2, 3, 4, 5].map(async daysAgo => {
      const range = kstDayRange(daysAgo);
      const visits = await countRows(url, key, `marketing_visits?select=id&created_at=gte.${encodeURIComponent(range.start)}&created_at=lt.${encodeURIComponent(range.end)}`);
      return { date: range.label, visits };
    }));
    recentDays.sort((a, b) => a.date.localeCompare(b.date));

    const avgDailyVisits = recentDays.length ? recentDays.reduce((s, r) => s + r.visits, 0) / recentDays.length : 0;
    const projectedMonthlyVisits = Math.round(avgDailyVisits * 30);

    // 2026-09-21 실제 DB 23MB 측정값을 기준점으로 두고 이후 증가분을 보수적으로 추정합니다.
    const deltaBytes =
      Math.max(0, marketingVisits - BASELINE.marketingVisits) * 740 +
      Math.max(0, testSessions - BASELINE.testSessions) * 425 +
      Math.max(0, analysisRequests - BASELINE.analysisRequests) * 715 +
      Math.max(0, users - BASELINE.users) * 480 +
      Math.max(0, productTypeFits - BASELINE.productTypeFits) * 235;
    const estimatedDbMb = Math.round((BASELINE.dbMb + deltaBytes / 1024 / 1024) * 10) / 10;

    // 무료 플랜 Capacity Planning용 보수적 가정치: Supabase 100KB/visit, Vercel 1MB + 10 edge requests/visit.
    const projectedSupabaseEgressGb = Math.round(projectedMonthlyVisits * 0.0001 * 100) / 100;
    const projectedVercelTransferGb = Math.round(projectedMonthlyVisits * 0.001 * 100) / 100;
    const projectedVercelEdgeRequests = projectedMonthlyVisits * 10;

    const metrics = [
      { key: "supabase_db", label: "Supabase DB", value: estimatedDbMb, unit: "MB", limit: LIMITS.supabaseDbMb, percent: pct(estimatedDbMb, LIMITS.supabaseDbMb), basis: "actual+estimate" },
      { key: "supabase_egress", label: "Supabase Egress", value: projectedSupabaseEgressGb, unit: "GB/month", limit: LIMITS.supabaseEgressGb, percent: pct(projectedSupabaseEgressGb, LIMITS.supabaseEgressGb), basis: "projection" },
      { key: "vercel_transfer", label: "Vercel Transfer", value: projectedVercelTransferGb, unit: "GB/month", limit: LIMITS.vercelTransferGb, percent: pct(projectedVercelTransferGb, LIMITS.vercelTransferGb), basis: "projection" },
      { key: "vercel_edge_requests", label: "Vercel Edge Requests", value: projectedVercelEdgeRequests, unit: "requests/month", limit: LIMITS.vercelEdgeRequests, percent: pct(projectedVercelEdgeRequests, LIMITS.vercelEdgeRequests), basis: "projection" },
    ].map(m => ({ ...m, status: m.percent >= WARNING_THRESHOLD ? "warning" : "normal" }));

    const warnings = metrics
      .filter(m => m.percent >= WARNING_THRESHOLD)
      .map(m => `주의: ${m.label} 예상 사용률 ${m.percent}% — 무료 한도 80% 임계점에 도달했습니다.`);

    return NextResponse.json({
      ok: true,
      warningThreshold: WARNING_THRESHOLD,
      recentDays,
      avgDailyVisits: Math.round(avgDailyVisits),
      projectedMonthlyVisits,
      counts: { marketingVisits, testSessions, analysisRequests, users, productTypeFits },
      metrics,
      warnings,
      assumptions: {
        supabaseEgressKbPerVisit: 100,
        vercelTransferMbPerVisit: 1,
        vercelEdgeRequestsPerVisit: 10,
        dbBaseline: "2026-09-21 23MB actual measurement",
      },
      refreshedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, code: "CAPACITY_READ_FAILED", message: (e instanceof Error ? e.message : "Unknown").slice(0, 500) }, { status: 500 });
  }
}
