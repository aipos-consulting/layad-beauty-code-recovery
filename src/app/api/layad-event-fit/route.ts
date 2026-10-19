import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// Latest complete LAYAD Glow Layering Cream Primer result set (2026-09-28).
const PRODUCT_ID = "e893ee04-4f6d-4b02-8fb5-99764e3be4cf";
const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"];

export async function GET() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) return NextResponse.json({ ok: false }, { status: 503 });
  const headers: Record<string,string> = { apikey:key };
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/product_type_fits?select=beauty_code,fit_score&product_id=eq.${PRODUCT_ID}&limit=16`, { headers, cache: "no-store", signal: AbortSignal.timeout(7000) });
    if (!r.ok) throw new Error(`Database response ${r.status}`);
    const rows = await r.json() as {beauty_code:string;fit_score:number}[];
    if (rows.length !== 16 || !CODES.every(code => rows.some(row => row.beauty_code === code && Number.isFinite(Number(row.fit_score))))) {
      throw new Error("Incomplete 16-code result");
    }
    return NextResponse.json({ok:true,scores:Object.fromEntries(rows.map(row => [row.beauty_code, Math.round(Number(row.fit_score))]))}, {headers:{"Cache-Control":"public, s-maxage=1800, stale-while-revalidate=3600"}});
  } catch (error) {
    console.error("LAYAD event fit scores unavailable", error);
    return NextResponse.json({ok:false,message:"Recommendation data unavailable"},{status:503});
  }
}
