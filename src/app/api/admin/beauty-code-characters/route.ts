import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CODES = ["DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE","OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE"];

function client() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = client();
  if (!supabase) return NextResponse.json({ ok: false, message: "Supabase 설정이 없습니다." }, { status: 503 });
  const { data, error } = await supabase.from("beauty_code_characters").select("beauty_code,nickname,image_url").order("beauty_code");
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  const map = new Map((data ?? []).map(row => [row.beauty_code, row]));
  return NextResponse.json({ ok: true, characters: CODES.map(code => map.get(code) ?? { beauty_code: code, nickname: "", image_url: null }) });
}

export async function POST(request: Request) {
  const supabase = client();
  if (!supabase) return NextResponse.json({ ok: false, message: "Supabase 설정이 없습니다." }, { status: 503 });
  const form = await request.formData();
  const beautyCode = String(form.get("beautyCode") ?? "").trim().toUpperCase();
  const nickname = String(form.get("nickname") ?? "").trim();
  const file = form.get("image");
  if (!CODES.includes(beautyCode)) return NextResponse.json({ ok: false, message: "올바른 Beauty Code가 아닙니다." }, { status: 400 });
  if (!nickname) return NextResponse.json({ ok: false, message: "별명을 입력해 주세요." }, { status: 400 });

  let imageUrl: string | null | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ ok: false, message: "이미지는 5MB 이하만 등록할 수 있습니다." }, { status: 400 });
    if (!["image/png","image/jpeg","image/webp"].includes(file.type)) return NextResponse.json({ ok: false, message: "PNG, JPG, WEBP 이미지만 등록할 수 있습니다." }, { status: 400 });
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${beautyCode.toLowerCase()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("beauty-code-characters").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true, cacheControl: "60" });
    if (uploadError) return NextResponse.json({ ok: false, message: uploadError.message }, { status: 500 });
    imageUrl = supabase.storage.from("beauty-code-characters").getPublicUrl(path).data.publicUrl + `?v=${Date.now()}`;
  }

  const payload: { nickname: string; updated_at: string; image_url?: string } = { nickname, updated_at: new Date().toISOString() };
  if (imageUrl) payload.image_url = imageUrl;
  const { data, error } = await supabase.from("beauty_code_characters").update(payload).eq("beauty_code", beautyCode).select("beauty_code,nickname,image_url").single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, character: data });
}
