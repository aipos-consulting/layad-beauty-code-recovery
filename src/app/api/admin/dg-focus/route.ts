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
};

type TestSession = {
  id: string;
  completed: boolean;
  beauty_code: string | null;
  excluded_from_statistics: boolean | null;
};

type UserBeautyCode = {
  user_id: string;
  beauty_code: string;
  is_current: boolean;
};

type SavedProduct = {
  user_id: string;
  product_ref: string;
  product_name: string;
  beauty_code: string;
  fit_score: number | null;
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

function subtypeStats(codes: Array<string | null>) {
  const map = new Map<string, number>(DG_CODES.map((code) => [code, 0]));
  for (const raw of codes) {
    const code = (raw ?? "").trim();
    if (DG_CODES.includes(code)) map.set(code, (map.get(code) ?? 0) + 1);
  }
  const total = [...map.values()].reduce((sum, value) => sum + value, 0);
  return DG_CODES.map((code) => ({
    code,
    count: map.get(code) ?? 0,
    share: total ? Math.round(((map.get(code) ?? 0) / total) * 1000) / 10 : 0,
  }));
}

export async function GET() {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ ok: false, message: "Supabase 설정을 확인해 주세요." }, { status: 503 });

  try {
    const [visits, sessions, currentCodes, savedProducts, products] = await Promise.all([
      readAll<Visit>(url, key, "marketing_visits?select=visit_id,first_seen_at,referrer,utm_source,utm_medium,site_source_name,has_fbclid,test_completed,beauty_code&order=first_seen_at.desc"),
      readAll<TestSession>(url, key, "test_sessions?select=id,completed,beauty_code,excluded_from_statistics&order=created_at.desc"),
      readAll<UserBeautyCode>(url, key, "user_beauty_codes?is_current=eq.true&select=user_id,beauty_code,is_current&order=created_at.desc"),
      readAll<SavedProduct>(url, key, "user_saved_products?select=user_id,product_ref,product_name,beauty_code,fit_score,created_at&order=created_at.desc"),
      readAll<Product>(url, key, "products?deleted_at=is.null&select=id,canonical_name,brand,category&order=updated_at.desc"),
    ]);

    // VISIT: 마케팅 유입/완료 방문 기준. 동일 사용자의 재방문·재테스트가 중복될 수 있습니다.
    const completedVisits = visits.filter((v) => v.test_completed && v.beauty_code);
    const dgVisits = completedVisits.filter((v) => DG_CODES.includes((v.beauty_code ?? "").trim()));

    // SESSION: 실제 테스트 세션 기준. 통계 제외 세션은 제외합니다.
    const completedSessions = sessions.filter((s) => s.completed && !s.excluded_from_statistics && s.beauty_code);
    const dgSessions = completedSessions.filter((s) => DG_CODES.includes((s.beauty_code ?? "").trim()));

    // MEMBER: 현재 회원의 Beauty Code 기준. 상품행동은 user_id로 연결합니다.
    const dgMemberCode = new Map<string, string>();
    for (const row of currentCodes) {
      const code = (row.beauty_code ?? "").trim();
      if (DG_CODES.includes(code)) dgMemberCode.set(row.user_id, code);
    }
    const dgMemberIds = new Set(dgMemberCode.keys());
    const dgSavedProducts = savedProducts.filter((row) => dgMemberIds.has(row.user_id));
    const dgAnalysisMembers = new Set(dgSavedProducts.map((row) => row.user_id));

    const productMap = new Map(products.map((p) => [p.id, p]));

    const channelMap = new Map<string, { key: string; label: string; visits: number }>();
    for (const row of dgVisits) {
      const source = sourceOf(row);
      const medium = mediumOf(row);
      const keyName = `${source} / ${medium}`;
      const current = channelMap.get(keyName) ?? { key: keyName, label: channelLabel(source, medium), visits: 0 };
      current.visits += 1;
      channelMap.set(keyName, current);
    }

    const productCounts = new Map<string, { name: string; brand: string; category: string; results: number; members: Set<string> }>();
    for (const row of dgSavedProducts) {
      const product = productMap.get(row.product_ref);
      const name = product?.canonical_name?.trim() || row.product_name?.trim() || "(상품명 없음)";
      const keyName = row.product_ref || name.toLowerCase();
      const current = productCounts.get(keyName) ?? {
        name,
        brand: product?.brand ?? "-",
        category: product?.category ?? "-",
        results: 0,
        members: new Set<string>(),
      };
      current.results += 1;
      current.members.add(row.user_id);
      productCounts.set(keyName, current);
    }

    const dgMembers = dgMemberIds.size;

    return NextResponse.json({
      ok: true,
      kpis: {
        totalVisits: visits.length,
        completedVisits: completedVisits.length,
        dgVisits: dgVisits.length,
        dgVisitShare: completedVisits.length ? Math.round((dgVisits.length / completedVisits.length) * 1000) / 10 : 0,
        completedSessions: completedSessions.length,
        dgSessions: dgSessions.length,
        dgSessionShare: completedSessions.length ? Math.round((dgSessions.length / completedSessions.length) * 1000) / 10 : 0,
        dgMembers,
        dgAnalysisMembers: dgAnalysisMembers.size,
        dgAnalysisRate: dgMembers ? Math.round((dgAnalysisMembers.size / dgMembers) * 1000) / 10 : 0,
        dgAnalysisResults: dgSavedProducts.length,
      },
      visitSubtypes: subtypeStats(dgVisits.map((row) => row.beauty_code)),
      sessionSubtypes: subtypeStats(dgSessions.map((row) => row.beauty_code)),
      memberSubtypes: subtypeStats([...dgMemberCode.values()]),
      channels: [...channelMap.values()]
        .map((row) => ({ ...row, share: dgVisits.length ? Math.round((row.visits / dgVisits.length) * 1000) / 10 : 0 }))
        .sort((a, b) => b.visits - a.visits),
      products: [...productCounts.values()]
        .map((row) => ({ name: row.name, brand: row.brand, category: row.category, results: row.results, members: row.members.size }))
        .sort((a, b) => b.results - a.results)
        .slice(0, 20),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message.slice(0, 500) : "조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
