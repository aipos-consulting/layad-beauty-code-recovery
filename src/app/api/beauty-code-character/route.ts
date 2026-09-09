import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://mbunlzldwpjgichedzfa.supabase.co";

type Locale = "ko" | "en" | "ja";
type CharacterRow = { beauty_code: string; nickname: string; image_url: string | null; image_url_en: string | null; image_url_ja: string | null };

function key() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? null;
}

function authHeaders(serverKey: string): HeadersInit {
  const headers: Record<string, string> = { apikey: serverKey };
  if (!serverKey.startsWith("sb_secret_")) headers.Authorization = `Bearer ${serverKey}`;
  return headers;
}

function localeFromRequest(request: Request): Locale {
  const requested = new URL(request.url).searchParams.get("locale");
  if (requested === "ko" || requested === "en" || requested === "ja") return requested;
  const cookieLocale = request.headers.get("cookie")?.match(/(?:^|;\s*)layad-locale=(ko|en|ja)(?:;|$)/)?.[1];
  if (cookieLocale === "en" || cookieLocale === "ja") return cookieLocale;
  return "ko";
}

function resolveImage(row: CharacterRow, locale: Locale) {
  if (locale === "en") return row.image_url_en || row.image_url;
  if (locale === "ja") return row.image_url_ja || row.image_url;
  return row.image_url;
}

export async function GET(request: Request) {
  const serverKey = key();
  if (!serverKey) return NextResponse.json({ ok: false, message: "Supabase 설정이 없습니다." }, { status: 503 });

  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase();
  if (!code || !/^[OD][GM][PC][VE]$/.test(code)) {
    return NextResponse.json({ ok: false, message: "올바른 Beauty Code가 필요합니다." }, { status: 400 });
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/beauty_code_characters?beauty_code=eq.${encodeURIComponent(code)}&select=beauty_code,nickname,image_url,image_url_en,image_url_ja&limit=1`,
    { headers: authHeaders(serverKey), cache: "no-store" },
  );

  if (!response.ok) return NextResponse.json({ ok: false, message: await response.text() }, { status: 500 });

  const rows = await response.json() as CharacterRow[];
  const row = rows[0] ?? null;
  if (!row) return NextResponse.json({ ok: true, character: null });

  const locale = localeFromRequest(request);
  return NextResponse.json({ ok: true, character: { beauty_code: row.beauty_code, nickname: row.nickname, image_url: resolveImage(row, locale) } });
}
