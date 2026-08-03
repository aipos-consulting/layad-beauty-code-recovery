import { NextResponse } from "next/server";

const BEAUTY_CODES = [
  "OGPV", "OGPE", "OGCV", "OGCE", "OMPV", "OMPE", "OMCV", "OMCE",
  "DGPV", "DGPE", "DGCV", "DGCE", "DMPV", "DMPE", "DMCV", "DMCE",
] as const;

const REGION_NAMES: Record<string, string> = {
  "11": "서울", "26": "부산", "27": "대구", "28": "인천", "29": "광주",
  "30": "대전", "31": "울산", "41": "경기", "42": "강원", "43": "충북",
  "44": "충남", "45": "전북", "46": "전남", "47": "경북", "48": "경남", "50": "제주",
  "13": "도쿄", "CA": "캘리포니아", "NY": "뉴욕",
};

function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

async function readTable<T>(url: string, key: string, path: string): Promise<T> {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase read failed: ${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

async function readOptionalTable<T>(url: string, key: string, path: string, fallback: T) {
  try { return { data: await readTable<T>(url, key, path), warning: null as string | null }; }
  catch (error) {
    const message = error instanceof Error ? error.message : "선택 테이블 조회 실패";
    return { data: fallback, warning: message };
  }
}

function normalizeProduct(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ""); }
  catch { return value.trim().replace(/\s+/g, " ").slice(0, 80); }
}

function topCode(rows: Array<{ beauty_code: string | null }>) {
  const counts: Record<string, number> = {};
  for (const row of rows) if (row.beauty_code) counts[row.beauty_code] = (counts[row.beauty_code] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
}

export async function GET() {
  const { url, key } = config();
  if (!url || !key) {
    return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const sessions = await readTable<Array<{
      id: string; beauty_code: string | null; beauty_code_source: "test" | "manual";
      age_band: string | null; country_code: string | null; region_code: string | null;
      created_at: string; completed: boolean;
    }>>(url, key, "test_sessions?select=id,beauty_code,beauty_code_source,age_band,country_code,region_code,created_at,completed&order=created_at.desc&limit=10000");

    const requestResult = await readOptionalTable<Array<{
      id: string; session_id: string; input_type: "name" | "url"; input_value: string; status: string; created_at: string;
    }>>(url, key, "product_analysis_requests?select=id,session_id,input_type,input_value,status,created_at&order=created_at.desc&limit=10000", []);

    const fitResult = await readOptionalTable<Array<{ product_id: string }>>(
      url, key, "product_type_fits?select=product_id&limit=10000", []
    );

    const requests = requestResult.data;
    const completedSessions = sessions.filter((s) => s.completed && s.beauty_code);
    const testCount = completedSessions.filter((s) => s.beauty_code_source === "test").length;
    const manualCount = completedSessions.filter((s) => s.beauty_code_source === "manual").length;

    const typeCounts = Object.fromEntries(BEAUTY_CODES.map((code) => [code, 0])) as Record<string, number>;
    const axisCounts: Record<string, number> = { O: 0, D: 0, G: 0, M: 0, P: 0, C: 0, V: 0, E: 0 };
    for (const session of completedSessions) {
      if (session.beauty_code && session.beauty_code in typeCounts) typeCounts[session.beauty_code] += 1;
      for (const letter of session.beauty_code ?? "") if (letter in axisCounts) axisCounts[letter] += 1;
    }

    const ageOrder = ["14-19", "20-29", "30-39", "40-49", "50-59", "60+", "prefer_not_to_say"];
    const ageLabels: Record<string, string> = {
      "14-19": "14–19세", "20-29": "20–29세", "30-39": "30–39세", "40-49": "40–49세",
      "50-59": "50–59세", "60+": "60세 이상", "prefer_not_to_say": "응답하지 않음",
    };
    const ageStats = ageOrder.map((ageBand) => {
      const rows = completedSessions.filter((s) => (s.age_band ?? "prefer_not_to_say") === ageBand);
      return { key: ageBand, label: ageLabels[ageBand], count: rows.length, topCode: topCode(rows) };
    });

    const countryNames: Record<string, string> = { KR: "대한민국", JP: "일본", US: "미국" };
    const countryMap = new Map<string, typeof completedSessions>();
    for (const row of completedSessions) {
      const code = row.country_code ?? "UNKNOWN";
      countryMap.set(code, [...(countryMap.get(code) ?? []), row]);
    }
    const countryStats = [...countryMap.entries()].map(([code, rows]) => ({
      code, label: countryNames[code] ?? (code === "UNKNOWN" ? "국가 확인 불가" : code), count: rows.length, topCode: topCode(rows),
    })).sort((a, b) => b.count - a.count);

    const krRows = completedSessions.filter((s) => s.country_code === "KR");
    const regionMap = new Map<string, typeof completedSessions>();
    for (const row of krRows) {
      const code = row.region_code ?? "UNKNOWN";
      regionMap.set(code, [...(regionMap.get(code) ?? []), row]);
    }
    const regionStats = [...regionMap.entries()].map(([code, rows]) => ({
      code, label: REGION_NAMES[code] ?? (code === "UNKNOWN" ? "지역 확인 불가" : code), count: rows.length, topCode: topCode(rows),
    })).sort((a, b) => b.count - a.count);

    const sessionCode = new Map(completedSessions.map((s) => [s.id, s.beauty_code]));
    const productGroups = new Map<string, { name: string; count: number; sessions: Set<string>; statuses: Record<string, number>; types: Record<string, number> }>();
    for (const request of requests) {
      const keyName = normalizeProduct(request.input_value).toLowerCase();
      const group = productGroups.get(keyName) ?? { name: normalizeProduct(request.input_value), count: 0, sessions: new Set<string>(), statuses: {}, types: {} };
      group.count += 1;
      group.sessions.add(request.session_id);
      group.statuses[request.status] = (group.statuses[request.status] ?? 0) + 1;
      const code = sessionCode.get(request.session_id);
      if (code) group.types[code] = (group.types[code] ?? 0) + 1;
      productGroups.set(keyName, group);
    }

    const topProducts = [...productGroups.values()].sort((a, b) => b.count - a.count).slice(0, 8).map((g) => ({
      name: g.name, count: g.count, uniqueSessions: g.sessions.size,
      topCode: Object.entries(g.types).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-",
      status: Object.entries(g.statuses).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "submitted",
    }));

    const statusCounts = requests.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});
    const recentRequests = requests.slice(0, 12).map((r) => ({
      id: r.id, value: normalizeProduct(r.input_value), inputType: r.input_type, status: r.status,
      createdAt: r.created_at, beautyCode: sessionCode.get(r.session_id) ?? "-",
    }));

    return NextResponse.json({
      ok: true,
      kpis: {
        totalUsers: completedSessions.length, testCompleted: testCount, manualSelected: manualCount,
        productRequests: requests.length, requestedProducts: productGroups.size,
        completedProducts: new Set(fitResult.data.map((r) => r.product_id)).size,
      },
      typeStats: BEAUTY_CODES.map((code) => ({ code, count: typeCounts[code] })),
      axes: axisCounts,
      sourceRatio: {
        test: completedSessions.length ? Math.round((testCount / completedSessions.length) * 100) : 0,
        manual: completedSessions.length ? Math.round((manualCount / completedSessions.length) * 100) : 0,
      },
      ageStats, countryStats, regionStats, statusCounts, topProducts, recentRequests,
      warnings: [requestResult.warning ? "상품 신청 테이블을 확인해 주세요." : null, fitResult.warning ? "적합도 결과 테이블을 확인해 주세요." : null].filter(Boolean),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown dashboard error";
    return NextResponse.json({ ok: false, code: "DASHBOARD_READ_FAILED", message: message.slice(0, 500) }, { status: 500 });
  }
}
