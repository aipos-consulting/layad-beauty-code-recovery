import { NextResponse } from "next/server";

function config(){return{url:process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY};}
async function fetchJson<T>(url:string,key:string,path:string,headers:Record<string,string>={}){const r=await fetch(`${url}/rest/v1/${path}`,{headers:{apikey:key,Authorization:`Bearer ${key}`,...headers},cache:"no-store"});if(!r.ok)throw new Error(`${r.status} ${await r.text()}`);return {data:await r.json() as T,headers:r.headers};}

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {url,key}=config();
  if(!url||!key)return NextResponse.json({ok:false,message:"Supabase 설정이 없습니다."},{status:503});
  try{
    const u=new URL(req.url);
    const page=Math.max(1,Number(u.searchParams.get("page")||1));
    const pageSize=Math.min(50,Math.max(10,Number(u.searchParams.get("pageSize")||20)));
    const q=(u.searchParams.get("q")||"").trim();
    const code=(u.searchParams.get("code")||"all").trim();
    const minScoreRaw=u.searchParams.get("minScore")||"";
    const maxScoreRaw=u.searchParams.get("maxScore")||"";
    const minScore=minScoreRaw===""?null:Math.max(0,Math.min(100,Number(minScoreRaw)));
    const maxScore=maxScoreRaw===""?null:Math.max(0,Math.min(100,Number(maxScoreRaw)));
    const offset=(page-1)*pageSize;
    const filters=[`user_id=eq.${encodeURIComponent(id)}`];
    if(q)filters.push(`product_name=ilike.*${encodeURIComponent(q)}*`);
    if(code!=="all")filters.push(`beauty_code=eq.${encodeURIComponent(code)}`);
    if(minScore!==null&&!Number.isNaN(minScore))filters.push(`fit_score=gte.${minScore}`);
    if(maxScore!==null&&!Number.isNaN(maxScore))filters.push(`fit_score=lte.${maxScore}`);
    const path=`user_saved_products?select=id,product_ref,product_name,beauty_code,fit_score,created_at&${filters.join("&")}&order=created_at.desc&limit=${pageSize}&offset=${offset}`;
    const {data,headers}=await fetchJson<Array<{id:string;product_ref:string;product_name:string;beauty_code:string;fit_score:number;created_at:string}>>(url,key,path,{Prefer:"count=exact"});
    const cr=headers.get("content-range")||"";
    const total=Number(cr.split("/")[1]||0);
    const totalPages=Math.max(1,Math.ceil(total/pageSize));
    const {data:codes}=await fetchJson<Array<{beauty_code:string}>>(url,key,`user_saved_products?select=beauty_code&user_id=eq.${encodeURIComponent(id)}&order=beauty_code.asc&limit=1000`);
    const beautyCodes=[...new Set(codes.map(x=>x.beauty_code).filter(Boolean))];
    return NextResponse.json({ok:true,items:data,total,page,pageSize,totalPages,beautyCodes});
  }catch(e){return NextResponse.json({ok:false,message:e instanceof Error?e.message:"저장상품 조회에 실패했습니다."},{status:500});}
}
