import { NextRequest, NextResponse } from "next/server";

function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

function headers(key: string, extra?: Record<string, string>) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function readJson<T>(url: string, key: string, path: string): Promise<T> {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: headers(key), cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (await r.json()) as T;
}

export async function GET(req: NextRequest) {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const pageSize = 50;
    const q = (sp.get("q") || "").trim();
    const verified = sp.get("verified") || "all";
    const locale = (sp.get("locale") || "all").trim();
    const offset = (page - 1) * pageSize;

    const filters: string[] = [];
    if (q) filters.push(`email=ilike.*${encodeURIComponent(q)}*`);
    if (verified === "yes") filters.push("email_verified=eq.true");
    if (verified === "no") filters.push("email_verified=eq.false");
    if (locale !== "all") filters.push(`locale=eq.${encodeURIComponent(locale)}`);

    const userPath = `layad_users?select=id,email,email_verified,locale,created_at,updated_at&order=created_at.desc&limit=${pageSize}&offset=${offset}${filters.length ? `&${filters.join("&")}` : ""}`;
    const userRes = await fetch(`${url}/rest/v1/${userPath}`, {
      headers: headers(key, { Prefer: "count=exact" }),
      cache: "no-store",
    });
    if (!userRes.ok) throw new Error(`${userRes.status} ${await userRes.text()}`);

    const users = (await userRes.json()) as Array<{ id: string; email: string; email_verified: boolean; locale: string | null; created_at: string; updated_at: string }>;
    const contentRange = userRes.headers.get("content-range") || "";
    const totalMatch = contentRange.match(/\/(\d+)$/);
    const total = totalMatch ? Number(totalMatch[1]) : users.length;

    const ids = users.map(u => u.id);
    if (!ids.length) return NextResponse.json({ ok: true, members: [], total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), locales: [] });

    const inIds = ids.map(id => `"${id}"`).join(",");
    const [profiles, codes, saves] = await Promise.all([
      readJson<Array<{ user_id: string; nickname: string | null }>>(url, key, `user_profiles?select=user_id,nickname&user_id=in.(${encodeURIComponent(inIds)})`),
      readJson<Array<{ user_id: string; beauty_code: string; created_at: string }>>(url, key, `user_beauty_codes?select=user_id,beauty_code,created_at&is_current=eq.true&user_id=in.(${encodeURIComponent(inIds)})`),
      readJson<Array<{ user_id: string; created_at: string }>>(url, key, `user_saved_products?select=user_id,created_at&user_id=in.(${encodeURIComponent(inIds)})`),
    ]);

    const profileMap = new Map(profiles.map(p => [p.user_id, p.nickname]));
    const codeMap = new Map(codes.map(c => [c.user_id, c.beauty_code]));
    const saveMap = new Map<string, { count: number; lastAt: string | null }>();
    for (const s of saves) {
      const cur = saveMap.get(s.user_id) ?? { count: 0, lastAt: null };
      cur.count += 1;
      if (!cur.lastAt || s.created_at > cur.lastAt) cur.lastAt = s.created_at;
      saveMap.set(s.user_id, cur);
    }

    const members = users.map(u => {
      const save = saveMap.get(u.id) ?? { count: 0, lastAt: null };
      const recentActivityAt = [u.updated_at, save.lastAt].filter(Boolean).sort().at(-1) ?? u.updated_at;
      return {
        id: u.id,
        email: u.email,
        nickname: profileMap.get(u.id) ?? null,
        emailVerified: u.email_verified,
        locale: u.locale,
        beautyCode: codeMap.get(u.id) ?? null,
        savedProducts: save.count,
        createdAt: u.created_at,
        recentActivityAt,
      };
    });

    const localeRows = await readJson<Array<{ locale: string | null }>>(url, key, "layad_users?select=locale&locale=not.is.null&limit=1000");
    const locales = [...new Set(localeRows.map(x => x.locale).filter((x): x is string => Boolean(x)))].sort();

    return NextResponse.json({ ok: true, members, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), locales });
  } catch (e) {
    return NextResponse.json({ ok: false, code: "MEMBER_READ_FAILED", message: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
