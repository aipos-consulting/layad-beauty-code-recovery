import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";

type Row = { brand?: string | null; product_name: string; category?: string | null };

function cfg(){ return { key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY }; }
function headers(key:string, extra?:HeadersInit):HeadersInit { const base:Record<string,string>={apikey:key,"Content-Type":"application/json"}; if(!key.startsWith("sb_secret_")) base.Authorization=`Bearer ${key}`; return {...base,...(extra??{})}; }
async function db(path:string, init:RequestInit, key:string){ return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:headers(key,init.headers),cache:"no-store"}); }
function norm(v:string){ return v.normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase(); }

async function findProduct(name:string,key:string){
  const res=await db(`products?normalized_name=eq.${encodeURIComponent(norm(name))}&deleted_at=is.null&select=id,canonical_name,brand,category,verification_status&limit=1`,{method:"GET"},key);
  if(!res.ok) throw new Error(await res.text());
  return (await res.json() as Array<{id:string;canonical_name:string|null;brand:string|null;category:string|null;verification_status:string}>)[0]??null;
}
async function fitCount(productId:string,key:string){
  const res=await db(`product_type_fits?product_id=eq.${productId}&select=beauty_code`,{method:"GET"},key);
  if(!res.ok) throw new Error(await res.text());
  return (await res.json() as unknown[]).length;
}

export async function POST(request:NextRequest){
  const {key}=cfg(); if(!key) return NextResponse.json({ok:false,message:"Supabase server key가 없습니다."},{status:503});
  let body:{items?:Row[]}; try{body=await request.json();}catch{return NextResponse.json({ok:false,message:"요청 형식이 올바르지 않습니다."},{status:400});}
  const items=body.items??[];
  if(items.length<1||items.length>100) return NextResponse.json({ok:false,message:"1~100개 상품만 등록할 수 있습니다."},{status:400});
  const seen=new Set<string>(); const results=[] as Array<Record<string,unknown>>;
  for(let i=0;i<items.length;i++){
    const row=items[i]; const name=(row.product_name??"").trim(); const normalized=norm(name);
    if(!name){results.push({index:i,name:"",status:"invalid",message:"상품명을 입력해 주세요."});continue;}
    if(seen.has(normalized)){results.push({index:i,name,status:"duplicate_input",message:"현재 목록에 중복된 상품입니다."});continue;} seen.add(normalized);
    try{
      const existing=await findProduct(name,key);
      if(existing){
        const count=await fitCount(existing.id,key);
        if(count===16){results.push({index:i,name,id:existing.id,status:"completed",message:"이미 생성된 상품",fit_count:count});continue;}
        const patch=await db(`products?id=eq.${existing.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({brand:row.brand?.trim()||existing.brand||null,category:row.category?.trim()||existing.category||null,updated_at:new Date().toISOString()})},key);
        if(!patch.ok) throw new Error(await patch.text());
        results.push({index:i,name,id:existing.id,status:"queued",message:"ChatGPT 분석 대기",fit_count:count});continue;
      }
      const ins=await db("products",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({canonical_name:name,normalized_name:normalized,brand:row.brand?.trim()||null,category:row.category?.trim()||null,verification_status:"unverified"})},key);
      if(!ins.ok) throw new Error(await ins.text()); const created=(await ins.json() as Array<{id:string}>)[0];
      results.push({index:i,name,id:created?.id,status:"queued",message:"ChatGPT 분석 대기",fit_count:0});
    }catch(e){results.push({index:i,name,status:"failed",message:e instanceof Error?e.message:"등록 실패"});}
  }
  return NextResponse.json({ok:!results.some(x=>x.status==="failed"),total:items.length,queued:results.filter(x=>x.status==="queued").length,completed:results.filter(x=>x.status==="completed").length,failed:results.filter(x=>x.status==="failed"||x.status==="invalid").length,results},{status:results.some(x=>x.status==="failed")?207:200});
}
