import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://mbunlzldwpjgichedzfa.supabase.co";
const CODES = ["DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE","OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE"];

function key() {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

function authHeaders(serverKey: string, extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = { apikey: serverKey };
  if (!serverKey.startsWith("sb_secret_")) headers.Authorization = `Bearer ${serverKey}`;
  return { ...headers, ...(extra ?? {}) };
}

async function db(path: string, init: RequestInit, serverKey: string) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: authHeaders(serverKey, init.headers),
    cache: "no-store",
  });
}

export async function GET() {
  const serverKey = key();
  if (!serverKey) return NextResponse.json({ ok: false, message: "Supabase 설정이 없습니다." }, { status: 503 });

  const response = await db(
    "beauty_code_characters?select=beauty_code,nickname,image_url&order=beauty_code.asc",
    { method: "GET" },
    serverKey,
  );
  if (!response.ok) return NextResponse.json({ ok: false, message: await response.text() }, { status: 500 });

  const data = await response.json() as Array<{ beauty_code: string; nickname: string; image_url: string | null }>;
  const map = new Map(data.map((row) => [row.beauty_code, row]));
  return NextResponse.json({ ok: true, characters: CODES.map((code) => map.get(code) ?? { beauty_code: code, nickname: "", image_url: null }) });
}

export async function POST(request: Request) {
  const serverKey = key();
  if (!serverKey) return NextResponse.json({ ok: false, message: "Supabase 설정이 없습니다." }, { status: 503 });

  const form = await request.formData();
  const beautyCode = String(form.get("beautyCode") ?? "").trim().toUpperCase();
  const nickname = String(form.get("nickname") ?? "").trim();
  const file = form.get("image");

  if (!CODES.includes(beautyCode)) return NextResponse.json({ ok: false, message: "올바른 Beauty Code가 아닙니다." }, { status: 400 });
  if (!nickname) return NextResponse.json({ ok: false, message: "별명을 입력해 주세요." }, { status: 400 });

  let imageUrl: string | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ ok: false, message: "이미지는 5MB 이하만 등록할 수 있습니다." }, { status: 400 });
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return NextResponse.json({ ok: false, message: "PNG, JPG, WEBP 이미지만 등록할 수 있습니다." }, { status: 400 });

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const objectPath = `${beautyCode.toLowerCase()}.${ext}`;
    const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/beauty-code-characters/${objectPath}`, {
      method: "POST",
      headers: authHeaders(serverKey, {
        "Content-Type": file.type,
        "x-upsert": "true",
        "cache-control": "max-age=60",
      }),
      body: await file.arrayBuffer(),
      cache: "no-store",
    });
    if (!uploadResponse.ok) return NextResponse.json({ ok: false, message: await uploadResponse.text() }, { status: 500 });

    imageUrl = `${SUPABASE_URL}/storage/v1/object/public/beauty-code-characters/${objectPath}?v=${Date.now()}`;
  }

  const payload: Record<string, string> = {
    nickname,
    updated_at: new Date().toISOString(),
  };
  if (imageUrl) payload.image_url = imageUrl;

  const updateResponse = await db(
    `beauty_code_characters?beauty_code=eq.${encodeURIComponent(beautyCode)}&select=beauty_code,nickname,image_url`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    },
    serverKey,
  );
  if (!updateResponse.ok) return NextResponse.json({ ok: false, message: await updateResponse.text() }, { status: 500 });

  const rows = await updateResponse.json() as Array<{ beauty_code: string; nickname: string; image_url: string | null }>;
  return NextResponse.json({ ok: true, character: rows[0] ?? { beauty_code: beautyCode, nickname, image_url: imageUrl ?? null } });
}
