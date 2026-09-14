import { NextResponse } from "next/server";

const BEAUTY_CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;
const RETRYABLE_STATUS = new Set([502,503,504]);

function config(){
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

function sleep(ms:number){ return new Promise(resolve=>setTimeout(resolve,ms)); }

async function readTable<T>(url:string,key:string,path:string):Promise<T>{
  let lastError:Error|undefined;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetch(`${url}/rest/v1/${path}`,{
        headers:{apikey:key,Authorization:`Bearer ${key}`},
        cache:"no-store",
      });
      if(response.ok) return await response.json() as T;
      const text=await response.text();
      const error=new Error(`Supabase read failed: ${response.status} ${text}`);
      if(!RETRYABLE_STATUS.has(response.status) || attempt===1) throw error;
      lastError=error;
    }catch(error){
      const e=error instanceof Error?error:new Error("Supabase read failed");
      if(attempt===1) throw e;
      lastError=e;
    }
    await sleep(700);
  }
  throw lastError??new Error("Supabase read failed");
}

function normalize(value:string){
  return value.trim().replace(/\s+/g," ").toLowerCase();
}

export async function GET(){
  const {url,key}=config();
  if(!url||!key) return NextResponse.json({ok:false,code:"SUPABASE_NOT_CONFIGURED"},{status:503});

  try{
    const [requests,products,fits]=await Promise.all([
      readTable<Array<{id:string;product_id:string|null;input_type:"name"|"url";input_value:string;status:string;created_at:string;session_id:string}>>(
        url,key,
        "product_analysis_requests?select=id,product_id,input_type,input_value,status,created_at,session_id&order=created_at.asc&limit=10000",
      ),
      readTable<Array<{id:string;canonical_name:string|null;brand:string|null;category:string|null;product_url:string|null}>>(
        url,key,
        "products?select=id,canonical_name,brand,category,product_url&limit=10000",
      ),
      readTable<Array<{product_id:string;beauty_code:string}>>(
        url,key,
        "product_type_fits?select=product_id,beauty_code&limit=10000",
      ),
    ]);

    const productById=new Map(products.map(product=>[product.id,product]));
    const fitCodesByProduct=new Map<string,Set<string>>();
    for(const fit of fits){
      const set=fitCodesByProduct.get(fit.product_id)??new Set<string>();
      set.add(fit.beauty_code);
      fitCodesByProduct.set(fit.product_id,set);
    }

    const groups=new Map<string,typeof requests>();
    for(const request of requests){
      const keyValue=request.product_id ?? `${request.input_type}:${normalize(request.input_value)}`;
      const rows=groups.get(keyValue)??[];
      rows.push(request);
      groups.set(keyValue,rows);
    }

    const pending=[...groups.entries()].flatMap(([groupKey,rows])=>{
      const productId=rows.find(row=>row.product_id)?.product_id??null;
      const fitCount=productId?(fitCodesByProduct.get(productId)?.size??0):0;
      if(fitCount>=BEAUTY_CODES.length) return [];

      const actionable=rows.filter(row=>["submitted","collecting_reviews","analyzing","failed","insufficient_reviews"].includes(row.status));
      if(actionable.length===0) return [];

      const first=actionable[0];
      const last=actionable[actionable.length-1];
      const product=productId?productById.get(productId):undefined;
      const rawName=product?.canonical_name?.trim() || (first.input_type==="name"?first.input_value.trim():"");
      const displayName=rawName || "상품명 확인 필요";
      const productUrl=product?.product_url || (first.input_type==="url"?first.input_value:null);
      const statusCounts=actionable.reduce<Record<string,number>>((acc,row)=>{acc[row.status]=(acc[row.status]??0)+1;return acc;},{});

      return [{
        key:groupKey,
        requestId:first.id,
        productId,
        name:displayName,
        brand:product?.brand??null,
        category:product?.category??null,
        productUrl,
        inputType:first.input_type,
        inputValue:first.input_value,
        requestCount:rows.length,
        uniqueSessions:new Set(rows.map(row=>row.session_id)).size,
        fitCount,
        firstRequestedAt:first.created_at,
        lastRequestedAt:last.created_at,
        statusCounts,
      }];
    }).sort((a,b)=>new Date(a.firstRequestedAt).getTime()-new Date(b.firstRequestedAt).getTime());

    return NextResponse.json({ok:true,total:pending.length,beautyCodes:BEAUTY_CODES,pending});
  }catch(error){
    return NextResponse.json({ok:false,code:"PENDING_ANALYSIS_READ_FAILED",message:error instanceof Error?error.message:"조회에 실패했습니다."},{status:500});
  }
}
