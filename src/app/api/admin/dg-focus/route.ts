import { NextResponse } from "next/server";

type Visit = {
  visit_id: string;
  first_seen_at: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  site_source_name: string | null;
  has_fbclid: boolean;
  test_completed: boolean;
  beauty_code: string | null;
  test_session_id: string | null;
};

type ProductRequest = {
  id: string;
  session_id: string;
  product_id: string | null;
  input_value: string;
  status: string;
  created_at: string;
};

type Product = { id: string; canonical_name: string | null; brand: string | null; category: string | null };

const DG_CODES = ["DGPV", "DGPE", "DGCV", "DGCE"];

function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

async function readAll<T>(url: string, key: string, path: string, pageSize = 1000) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const res = await fetch(`${url}/rest/v1/${path}&limit=${pageSize}&offset=${offset}`, {
      headers: headers(key),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
    const page = (await res.json()) as T[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

function referrerHost(referrer: string | null) {
  if (!referrer) return "";
  try { return new URL(referrer).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

function isHost(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

function sourceOf(row: Visit) {
  const explicit = row.utm_source?.trim() || row.site_source_name?.trim();
  if (explicit) return explicit.toLowerCase();
  const host = referrerHost(row.referrer);
  if (isHost(host, "cafe.naver.com")) return "naver_cafe";
  if (isHost(host, "instagram.com")) return "instagram";
  if (isHost(host, "facebook.com") || isHost(host, "fb.com")) return "facebook";
  if (isHost(host, "naver.com")) return "naver";
  if (host === "google.com" || host.startsWith("google.") || host.includes(".google.")) return "google";
  if (isHost(host, "line.me") || isHost(host, "line-apps.com")) return "line";
  if (row.has_fbclid) return "meta";
  return "direct";
}

function mediumOf(row: Visit) {
  const explicit = row.utm_medium?.trim();
  if (explicit) return explicit.toLowerCase();
  const host = referrerHost(row.referrer);
  if (isHost(host, "cafe.naver.com")) return "community";
  if (isHost(host, "instagram.com") || isHost(host, "facebook.com") || isHost(host, "fb.com") || isHost(host, "line.me") || isHost(host, "line-apps.com")) return "referral";
  if (isHost(host, "naver.com") || host === "google.com" || host.startsWith("google.") || host.includes(".google.")) return "organic";
  return "none";
}

function channelLabel(source: string, medium: string) {
  const key = `${source} / ${medium}`;
  const labels: Record<string, string> = {
    "instagram / paid": "인스타그램 광고",
    "instagram / paid_social": "인스타그램 광고",
    "ig / paid": "인스타그램 광고",
    "ig / paid_social": "인스타그램 광고",
    "facebook / paid": "페이스북 광고",
    "facebook / paid_social": "페이스북 광고",
    "fb / paid": "페이스북 광고",
    "fb / paid_social": "페이스북 광고",
    "direct / none": "직접 유입",
    "naver / organic": "네이버 검색",
    "google / organic": "구글 검색",
    "naver_cafe / community": "네이버카페",
    "kakao / share": "카카오 공유 유입",
    "link_copy / share": "복사 링크 유입",
  };
  return labels[key] ?? key;
}

export async function GET() {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ ok: false, message: "Supabase 설정을 확인해 주세요." }, { status: 503 });

  try {
    const visits = await readAll<Visit>(
      url,
      key,
      "marketing_visits?select=visit_id,first_seen_at,referrer,utm_source,utm_medium,site_source_name,has_fbclid,test_completed,beauty_code,test_session_id&order=first_seen_at.desc",
    );

    const completed = visits.filter((v) => v.test_completed && v.beauty_code);
    const dgVisits = completed.filter((v) => DG_CODES.includes((v.beauty_code ?? "").trim()));
    const dgSessionIds = new Set(dgVisits.map((v) => v.test_session_id).filter((v): v is string => Boolean(v)));

    const requests = await readAll<ProductRequest>(
      url,
      key,
      "product_analysis_requests?deleted_at=is.null&select=id,session_id,product_id,input_value,status,created_at&order=created_at.desc",
    );
    const dgRequests = requests.filter((r) => dgSessionIds.has(r.session_id));
    const dgAnalyzingSessions = new Set(dgRequests.map((r) => r.session_id));

    const products = await readAll<Product>(
      url,
      key,
      "products?deleted_at=is.null&select=id,canonical_name,brand,category&order=updated_at.desc",
    );
    const productMap = new Map(products.map((p) => [p.id, p]));

    const subtypeMap = new Map<string, number>(DG_CODES.map((code) => [code, 0]));
    for (const row of dgVisits) {
      const code = (row.beauty_code ?? "").trim();
      subtypeMap.set(code, (subtypeMap.get(code) ?? 0) + 1);
    }

    const channelMap = new Map<string, { key: string; label: string; users: number; analyses: number }>();
    const requestsBySession = new Map<string, number>();
    for (const r of dgRequests) requestsBySession.set(r.session_id, (requestsBySession.get(r.session_id) ?? 0) + 1);
    for (const row of dgVisits) {
      const source = sourceOf(row);
      const medium = mediumOf(row);
      const keyName = `${source} / ${medium}`;
      const current = channelMap.get(keyName) ?? { key: keyName, label: channelLabel(source, medium), users: 0, analyses: 0 };
      current.users += 1;
      if (row.test_session_id) current.analyses += requestsBySession.get(row.test_session_id) ?? 0;
      channelMap.set(keyName, current);
    }

    const productCounts = new Map<string, { name: string; brand: string; category: string; requests: number; sessions: Set<string> }>();
    for (const r of dgRequests) {
      const product = r.product_id ? productMap.get(r.product_id) : undefined;
      const name = product?.canonical_name?.trim() || r.input_value || "(상품명 없음)";
      const keyName = r.product_id || name.toLowerCase();
      const current = productCounts.get(keyName) ?? {
        name,
        brand: product?.brand ?? "-",
        category: product?.category ?? "-",
        requests: 0,
        sessions: new Set<string>(),
      };
      current.requests += 1;
      current.sessions.add(r.session_id);
      productCounts.set(keyName, current);
    }

    const dgUsers = dgVisits.length;
    const completedUsers = completed.length;

    return NextResponse.json({
      ok: true,
      kpis: {
        totalVisits: visits.length,
        completedUsers,
        dgUsers,
        dgShare: completedUsers ? Math.round((dgUsers / completedUsers) * 1000) / 10 : 0,
        dgAnalysisUsers: dgAnalyzingSessions.size,
        dgAnalysisRate: dgUsers ? Math.round((dgAnalyzingSessions.size / dgUsers) * 1000) / 10 : 0,
        dgAnalysisRequests: dgRequests.length,
      },
      subtypes: DG_CODES.map((code) => ({
        code,
        count: subtypeMap.get(code) ?? 0,
        share: dgUsers ? Math.round(((subtypeMap.get(code) ?? 0) / dgUsers) * 1000) / 10 : 0,
      })),
      channels: [...channelMap.values()]
        .map((row) => ({ ...row, analysisRate: row.users ? Math.round((row.analyses / row.users) * 1000) / 10 : 0 }))
        .sort((a, b) => b.users - a.users),
      products: [...productCounts.values()]
        .map((row) => ({ name: row.name, brand: row.brand, category: row.category, requests: row.requests, users: row.sessions.size }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 20),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message.slice(0, 500) : "조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
