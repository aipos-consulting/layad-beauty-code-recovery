import { NextResponse } from "next/server";

type Visit = {
  visit_id: string;
  first_seen_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  placement: string | null;
  site_source_name: string | null;
  has_fbclid: boolean;
  test_started: boolean;
  test_completed: boolean;
  beauty_code: string | null;
  naver_cafe_clicked: boolean;
};

type Group = {
  key: string;
  label: string;
  visits: number;
  starts: number;
  completes: number;
};

function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

function clean(value: string | null, fallback = "(미설정)") {
  return value?.trim() || fallback;
}

function groupBy(rows: Visit[], keyOf: (row: Visit) => string, labelOf?: (row: Visit) => string): Group[] {
  const map = new Map<string, Group>();
  for (const row of rows) {
    const key = keyOf(row);
    const current = map.get(key) ?? {
      key,
      label: labelOf ? labelOf(row) : key,
      visits: 0,
      starts: 0,
      completes: 0,
    };
    current.visits += 1;
    if (row.test_started) current.starts += 1;
    if (row.test_completed) current.completes += 1;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.visits - a.visits);
}

export async function GET() {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  const select = [
    "visit_id","first_seen_at","utm_source","utm_medium","utm_campaign","utm_content","utm_term",
    "campaign_id","adset_id","ad_id","placement","site_source_name","has_fbclid",
    "test_started","test_completed","beauty_code","naver_cafe_clicked",
  ].join(",");

  try {
    const response = await fetch(`${url}/rest/v1/marketing_visits?select=${select}&order=first_seen_at.desc&limit=10000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Supabase read failed: ${response.status} ${await response.text()}`);
    const rows = (await response.json()) as Visit[];

    const totalVisits = rows.length;
    const metaRows = rows.filter((row) => row.has_fbclid || ["ig", "fb", "instagram", "facebook", "meta"].includes((row.utm_source ?? row.site_source_name ?? "").toLowerCase()));
    const starts = rows.filter((row) => row.test_started).length;
    const completes = rows.filter((row) => row.test_completed).length;
    const cafeClicks = rows.filter((row) => row.naver_cafe_clicked).length;

    const sourceStats = groupBy(
      rows,
      (row) => `${clean(row.utm_source, "direct")} / ${clean(row.utm_medium, "none")}`,
    ).slice(0, 20);

    const campaignStats = groupBy(
      rows.filter((row) => row.utm_campaign || row.campaign_id),
      (row) => row.campaign_id || clean(row.utm_campaign),
      (row) => clean(row.utm_campaign, row.campaign_id || "(미설정)"),
    ).slice(0, 30);

    const adStats = groupBy(
      rows.filter((row) => row.utm_content || row.ad_id),
      (row) => row.ad_id || clean(row.utm_content),
      (row) => clean(row.utm_content, row.ad_id || "(미설정)"),
    ).slice(0, 40);

    const placementStats = groupBy(
      rows.filter((row) => row.placement || row.site_source_name || row.utm_source),
      (row) => `${clean(row.site_source_name, clean(row.utm_source, "unknown"))}:${clean(row.placement, "unknown")}`,
      (row) => `${clean(row.site_source_name, clean(row.utm_source, "unknown"))} · ${clean(row.placement, "unknown")}`,
    ).slice(0, 20);

    const recent = rows.slice(0, 100).map((row) => ({
      firstSeenAt: row.first_seen_at,
      source: clean(row.utm_source, row.site_source_name || (row.has_fbclid ? "meta" : "direct")),
      medium: clean(row.utm_medium, "none"),
      campaign: clean(row.utm_campaign),
      content: clean(row.utm_content),
      placement: clean(row.placement),
      started: row.test_started,
      completed: row.test_completed,
      beautyCode: row.beauty_code,
    }));

    return NextResponse.json({
      ok: true,
      kpis: {
        totalVisits,
        metaVisits: metaRows.length,
        starts,
        completes,
        cafeClicks,
        startRate: totalVisits ? Math.round((starts / totalVisits) * 1000) / 10 : 0,
        completionRate: starts ? Math.round((completes / starts) * 1000) / 10 : 0,
        cafeClickRate: completes ? Math.round((cafeClicks / completes) * 1000) / 10 : 0,
      },
      sourceStats,
      campaignStats,
      adStats,
      placementStats,
      recent,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, code: "MARKETING_READ_FAILED", message: error instanceof Error ? error.message.slice(0, 500) : "Unknown" }, { status: 500 });
  }
}
