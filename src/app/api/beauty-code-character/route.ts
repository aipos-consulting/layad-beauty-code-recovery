import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://mbunlzldwpjgichedzfa.supabase.co";

function key() {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

function authHeaders(serverKey: string): HeadersInit {
  const headers: Record<string, string> = { apikey: serverKey };
  if (!serverKey.startsWith("sb_secret_")) headers.Authorization = `Bearer ${serverKey}`;
  return headers;
}

export async function GET(request: Request) {
  const serverKey = key();
  if (!serverKey) return NextResponse.json({ ok: false, message: "Supabase 설정이 없습니다." }, { status: 503 });

  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase();
  if (!code || !/^[OD][GM][PC][VE]$/.test(code)) {
    return NextResponse.json({ ok: false, message: "올바른 Beauty Code가 필요합니다." }, { status: 400 });
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/beauty_code_characters?beauty_code=eq.${encodeURIComponent(code)}&select=beauty_code,nickname,image_url&limit=1`,
    { headers: authHeaders(serverKey), cache: "no-store" },
  );

  if (!response.ok) {
    return NextResponse.json({ ok: false, message: await response.text() }, { status: 500 });
  }

  const rows = await response.json() as Array<{ beauty_code: string; nickname: string; image_url: string | null }>;
  return NextResponse.json({ ok: true, character: rows[0] ?? null });
}
