import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function client() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  const supabase = client();
  if (!supabase) return NextResponse.json({ ok: false, message: "Supabase 설정이 없습니다." }, { status: 503 });

  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase();
  if (!code || !/^[OD][GM][PC][VE]$/.test(code)) {
    return NextResponse.json({ ok: false, message: "올바른 Beauty Code가 필요합니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("beauty_code_characters")
    .select("beauty_code,nickname,image_url")
    .eq("beauty_code", code)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: "캐릭터 정보를 불러오지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, character: data ?? null });
}
