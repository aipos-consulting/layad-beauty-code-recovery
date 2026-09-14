import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://mbunlzldwpjgichedzfa.supabase.co";
const ACTIONABLE = "submitted,collecting_reviews,analyzing,failed,insufficient_reviews";

function dbHeaders(key:string, extra?:HeadersInit):HeadersInit {
  const headers:Record<string,string>={apikey:key,"Content-Type":"application/json"};
  if(!key.startsWith("sb_secret_")) headers.Authorization=`Bearer ${key}`;
  return {...headers,...(extra??{})};
}

async function db(path:string, init:RequestInit, key:string){
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
    ...init,
    headers:dbHeaders(key,init.headers),
    cache:"no-store",
  });
}

export async function POST(request:NextRequest){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if(!key) return NextResponse.json({ok:false,code:"SUPABASE_NOT_CONFIGURED",message:"Supabase 관리자 키가 설정되지 않았습니다."},{status:503});

  try{
    const body=await request.json() as {requestId?:string;reason?:string};
    const requestId=String(body.requestId??"").trim();
    if(!requestId) return NextResponse.json({ok:false,message:"요청 ID가 없습니다."},{status:400});

    const read=await db(`product_analysis_requests?id=eq.${encodeURIComponent(requestId)}&select=id,product_id,status&limit=1`,{method:"GET"},key);
    if(!read.ok) throw new Error(`요청 조회 실패: ${read.status}`);
    const row=((await read.json()) as Array<{id:string;product_id:string|null;status:string}>)[0];
    if(!row) return NextResponse.json({ok:false,message:"대상 요청을 찾을 수 없습니다."},{status:404});
    if(row.status==="excluded") return NextResponse.json({ok:true,status:"excluded",excludedCount:0,cached:true});

    const reason=String(body.reason??"관리자 대기목록 제외").trim().slice(0,500) || "관리자 대기목록 제외";
    const now=new Date().toISOString();
    const filter=row.product_id
      ? `product_id=eq.${encodeURIComponent(row.product_id)}&status=in.(${ACTIONABLE})`
      : `id=eq.${encodeURIComponent(requestId)}&status=in.(${ACTIONABLE})`;

    const update=await db(`product_analysis_requests?${filter}`,{
      method:"PATCH",
      headers:{Prefer:"return=representation"},
      body:JSON.stringify({status:"excluded",error_message:`[대기목록 제외] ${reason}`,updated_at:now}),
    },key);
    if(!update.ok) throw new Error(`대기목록 제외 처리 실패: ${update.status} ${await update.text()}`);
    const changed=await update.json() as Array<{id:string}>;

    return NextResponse.json({ok:true,status:"excluded",excludedCount:changed.length,productId:row.product_id});
  }catch(error){
    return NextResponse.json({ok:false,code:"EXCLUDE_PENDING_FAILED",message:error instanceof Error?error.message:"대기목록 제외 처리에 실패했습니다."},{status:500});
  }
}
