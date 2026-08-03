import { NextResponse } from "next/server";

const BEAUTY_CODES = [
  "OGPV", "OGPE", "OGCV", "OGCE", "OMPV", "OMPE", "OMCV", "OMCE",
  "DGPV", "DGPE", "DGCV", "DGCE", "DMPV", "DMPE", "DMCV", "DMCE",
] as const;

function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

async function readTable<T>(url: string, key: string, path: string): Promise<T> {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase read failed: ${response.status} ${detail}`);
  }
  return (await response.json()) as T;
}

function normalizeProduct(value: string) {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return value.trim().replace(/\s+/g, " ").slice(0, 80);
  }
}

export async function GET() {
  const { url, key } = config();
  if (!url || !key) {
    return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const [sessions, requests, completedFits] = await Promise.all([
      readTable<Array<{
        id: string;
        beauty_code: string | null;
        beauty_code_source: "test" | "manual";
        age_band: string | null;
        country_code: string | null;
        created_at: string;
        completed: boolean;
      }>>(url, key, "test_sessions?select=id,beauty_code,beauty_code_source,age_band,country_code,created_at,completed&order=created_at.desc&limit=10000"),
      readTable<Array<{
        id: string;
        session_id: string;
        input_type: "name" | "url";
        input_value: string;
        status: string;
        created_at: string;
      }>>(url, key, "product_analysis_requests?select=id,session_id,input_type,input_value,status,created_at&order=created_at.desc&limit=10000"),
      readTable<Array<{ product_id: string }>>(url, key, "product_type_fits?select=product_id&limit=10000"),
    ]);

    const completedSessions = sessions.filter((session) => session.completed && session.beauty_code);
    const testCount = completedSessions.filter((session) => session.beauty_code_source === "test").length;
    const manualCount = completedSessions.filter((session) => session.beauty_code_source === "manual").length;

    const typeCounts = Object.fromEntries(BEAUTY_CODES.map((code) => [code, 0])) as Record<string, number>;
    for (const session of completedSessions) {
      if (session.beauty_code && session.beauty_code in typeCounts) typeCounts[session.beauty_code] += 1;
    }

    const axisCounts: Record<string, number> = { O: 0, D: 0, G: 0, M: 0, P: 0, C: 0, V: 0, E: 0 };
    for (const session of completedSessions) {
      for (const letter of session.beauty_code ?? "") {
        if (letter in axisCounts) axisCounts[letter] += 1;
      }
    }

    const productGroups = new Map<string, {
      name: string;
      count: number;
      sessions: Set<string>;
      statusCounts: Record<string, number>;
      typeCounts: Record<string, number>;
      lastRequestedAt: string;
      inputType: "name" | "url";
    }>();
    const sessionCode = new Map(completedSessions.map((session) => [session.id, session.beauty_code]));

    for (const request of requests) {
      const keyName = normalizeProduct(request.input_value).toLowerCase();
      const group = productGroups.get(keyName) ?? {
        name: normalizeProduct(request.input_value),
        count: 0,
        sessions: new Set<string>(),
        statusCounts: {},
        typeCounts: {},
        lastRequestedAt: request.created_at,
        inputType: request.input_type,
      };
      group.count += 1;
      group.sessions.add(request.session_id);
      group.statusCounts[request.status] = (group.statusCounts[request.status] ?? 0) + 1;
      const code = sessionCode.get(request.session_id);
      if (code) group.typeCounts[code] = (group.typeCounts[code] ?? 0) + 1;
      if (request.created_at > group.lastRequestedAt) group.lastRequestedAt = request.created_at;
      productGroups.set(keyName, group);
    }

    const topProducts = [...productGroups.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((group) => ({
        name: group.name,
        count: group.count,
        uniqueSessions: group.sessions.size,
        topCode: Object.entries(group.typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-",
        status: Object.entries(group.statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "submitted",
      }));

    const statusCounts = requests.reduce<Record<string, number>>((acc, request) => {
      acc[request.status] = (acc[request.status] ?? 0) + 1;
      return acc;
    }, {});

    const recentRequests = requests.slice(0, 8).map((request) => ({
      id: request.id,
      value: normalizeProduct(request.input_value),
      inputType: request.input_type,
      status: request.status,
      createdAt: request.created_at,
      beautyCode: sessionCode.get(request.session_id) ?? "-",
    }));

    const uniqueCompletedProducts = new Set(completedFits.map((row) => row.product_id)).size;

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      kpis: {
        totalUsers: completedSessions.length,
        testCompleted: testCount,
        manualSelected: manualCount,
        productRequests: requests.length,
        requestedProducts: productGroups.size,
        completedProducts: uniqueCompletedProducts,
      },
      typeStats: BEAUTY_CODES.map((code) => ({ code, count: typeCounts[code] })),
      axes: {
        O: axisCounts.O, D: axisCounts.D,
        G: axisCounts.G, M: axisCounts.M,
        P: axisCounts.P, C: axisCounts.C,
        V: axisCounts.V, E: axisCounts.E,
      },
      sourceRatio: {
        test: completedSessions.length ? Math.round((testCount / completedSessions.length) * 100) : 0,
        manual: completedSessions.length ? Math.round((manualCount / completedSessions.length) * 100) : 0,
      },
      statusCounts,
      topProducts,
      recentRequests,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, code: "DASHBOARD_READ_FAILED" }, { status: 500 });
  }
}
