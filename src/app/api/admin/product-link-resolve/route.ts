import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";

function cfg(){ return { key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY }; }
function headers(key:string, extra?:HeadersInit):HeadersInit { const base:Record<string,string>={apikey:key,"Content-Type":"application/json"}; if(!key.startsWith("sb_secret_")) base.Authorization=`Bearer ${key}`; return {...base,...(extra??{})}; }

export async function GET(request:NextRequest){
  const productId=request.nextUrl.searchParams.get("productId");
  const {key}=cfg();
  if(!productId) return NextResponse.json({ok:false,message:"productId가 필요합니다."},{status:400});
  if(!key) return NextResponse.json({ok:false,message:"Supabase server key가 없습니다."},{status:503});

  const pRes=await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&deleted_at=is.null&select=id,canonical_name,product_url&limit=1`,{headers:headers(key),cache:"no-store"});
  if(!pRes.ok) return NextResponse.json({ok:false,message:await pRes.text()},{status:500});
  const product=(await pRes.json() as Array<{id:string;canonical_name:string|null;product_url:string|null}>)[0];
  if(!product?.product_url) return NextResponse.json({ok:false,message:"상품 링크가 없습니다."},{status:404});

  try{
    const res=await fetch(product.product_url,{method:"GET",redirect:"follow",cache:"no-store",headers:{"User-Agent":"Mozilla/5.0 (compatible; LAYAD-Owner/1.0)"}});
    const finalUrl=res.url||product.product_url;
    const text=(await res.text()).slice(0,200000);
    const title=(text.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]??"").trim();
    const ogTitle=(text.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]??"").trim();
    const reviewHints=[...text.matchAll(/(?:review|리뷰|구매평)[^0-9]{0,30}([0-9][0-9,]*)/gi)].slice(0,20).map(m=>m[0]);
    return NextResponse.json({ok:true,product,requestedUrl:product.product_url,finalUrl,status:res.status,title,ogTitle,reviewHints});
  }catch(e){
    return NextResponse.json({ok:false,product,requestedUrl:product.product_url,message:e instanceof Error?e.message:"링크 확인 실패"},{status:502});
  }
}
