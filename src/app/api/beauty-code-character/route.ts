import { NextResponse } from "next/server";

function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export async function GET(request: Request) {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ ok: false, message: "Supabase 설정이 없습니다." }, { status: 503 });

  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase();
  if (!code || !/^[OD][GM][PC][VE]$/.test(code)) {
    return NextResponse.json({ ok: false, message: "올바른 Beauty Code가 필요합니다." }, { status: 400 });
  }

  const response = await fetch(`${url}/rest/v1/beauty_code_characters?beauty_code=eq.${encodeURIComponent(code)}&select=beauty_code,nickname,image_url&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ ok: false, message: "캐릭터 정보를 불러오지 못했습니다." }, { status: 500 });

  const rows = await response.json() as Array<{ beauty_code: string; nickname: string; image_url: string | null }>;
  return NextResponse.json({ ok: true, character: rows[0] ?? null });
}
