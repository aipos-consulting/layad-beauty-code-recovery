import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";

function cfg(){ return { key: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY }; }
function headers(key:string, extra?:HeadersInit):HeadersInit { const base:Record<string,string>={apikey:key,"Content-Type":"application/json"}; if(!key.startsWith("sb_secret_")) base.Authorization=`Bearer ${key}`; return {...base,...(extra??{})}; }
async function db(path:string, init:RequestInit, key:string, cached=false){ return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:headers(key,init.headers),...(cached?{next:{revalidate:300}}:{cache:"no-store" as const})}); }
async function json<T>(res:Response,label:string):Promise<T>{ if(!res.ok) throw new Error(`${label}: ${await res.text()}`); return res.json() as Promise<T>; }
async function dbAll<T>(path:string,key:string,label:string,cached=true):Promise<T[]>{ const all:T[]=[]; const pageSize=1000; for(let offset=0;;offset+=pageSize){ const sep=path.includes("?")?"&":"?"; const res=await db(`${path}${sep}limit=${pageSize}&offset=${offset}`,{method:"GET"},key,cached); const page=await json<T[]>(res,label); all.push(...page); if(page.length<pageSize) break; if(offset>=99000) throw new Error(`${label}: pagination safety limit exceeded`); } return all; }

type Product = { id:string; canonical_name:string; brand:string|null; category:string|null; verification_status:string; updated_at:string };
type Run = { id:string; product_id:string; provider:string|null; model_name:string|null; analysis_version:string|null; input_review_count:number|null; completed_at:string|null; created_at:string };
type Review = { id:string; product_id:string; source_id:string|null; review_text:string; language_code:string|null; created_at:string };
type Source = { id:string; source_label:string|null; source_url:string; source_type:string };
type Feature = { id:string; review_id:string; axis:string; code:string; feature_label:string; sentiment:string; intensity:number; confidence:number; context_text:string|null; evidence_excerpt:string|null };
type Axis = { product_id:string; axis:string; first_code:string; first_score:number; second_code:string; second_score:number; review_count:number; confidence:number; analysis_version:string|null; updated_at:string };
type Fit = { product_id:string; beauty_code:string; fit_score:number; review_count:number; confidence:number; analysis_version:string|null; updated_at:string };

export async function GET(request:NextRequest){
  const {key}=cfg();
  if(!key) return NextResponse.json({ok:false,message:"Supabase server key가 없습니다."},{status:503});
  try{
    const productId=request.nextUrl.searchParams.get("productId");
    const forceFresh=request.nextUrl.searchParams.get("fresh")==="1";
    if(productId){
      const [pRes,runRes,revRes,srcRes,axisRes,fitRes]=await Promise.all([
        db(`products?id=eq.${encodeURIComponent(productId)}&select=id,canonical_name,brand,category,verification_status,updated_at&limit=1`,{method:"GET"},key),
        db(`review_analysis_runs?product_id=eq.${encodeURIComponent(productId)}&status=eq.completed&select=id,product_id,provider,model_name,analysis_version,input_review_count,completed_at,created_at&order=completed_at.desc.nullslast&limit=10`,{method:"GET"},key),
        db(`reviews?product_id=eq.${encodeURIComponent(productId)}&select=id,product_id,source_id,review_text,language_code,created_at&order=created_at.asc&limit=100`,{method:"GET"},key),
        db(`review_sources?product_id=eq.${encodeURIComponent(productId)}&select=id,source_label,source_url,source_type&limit=100`,{method:"GET"},key),
        db(`product_axis_profiles?product_id=eq.${encodeURIComponent(productId)}&select=product_id,axis,first_code,first_score,second_code,second_score,review_count,confidence,analysis_version,updated_at&order=axis.asc`,{method:"GET"},key),
        db(`product_type_fits?product_id=eq.${encodeURIComponent(productId)}&select=product_id,beauty_code,fit_score,review_count,confidence,analysis_version,updated_at&order=beauty_code.asc`,{method:"GET"},key),
      ]);
      const products=await json<Product[]>(pRes,"상품 조회 실패");
      const runs=await json<Run[]>(runRes,"분석 기록 조회 실패");
      const reviews=await json<Review[]>(revRes,"리뷰 조회 실패");
      const sources=await json<Source[]>(srcRes,"리뷰 출처 조회 실패");
      const axes=await json<Axis[]>(axisRes,"4축 조회 실패");
      const fits=await json<Fit[]>(fitRes,"적합도 조회 실패");
      const reviewIds=reviews.map(r=>r.id);
      let features:Feature[]=[];
      if(reviewIds.length){
        const fRes=await db(`review_features?review_id=in.(${reviewIds.map(encodeURIComponent).join(",")})&select=id,review_id,axis,code,feature_label,sentiment,intensity,confidence,context_text,evidence_excerpt&order=review_id.asc`,{method:"GET"},key);
        features=await json<Feature[]>(fRes,"리뷰 키워드 조회 실패");
      }
      const sourceMap=new Map(sources.map(s=>[s.id,s]));
      const featureMap=new Map<string,Feature[]>();
      for(const f of features) featureMap.set(f.review_id,[...(featureMap.get(f.review_id)??[]),f]);
      return NextResponse.json({ok:true,product:products[0]??null,runs,axes,fits,evidenceCount:Number(runs[0]?.input_review_count??0),storedReviewCount:reviews.length,reviews:reviews.map(r=>({...r,source:r.source_id?sourceMap.get(r.source_id)??null:null,features:featureMap.get(r.id)??[]}))});
    }

    const [products,runs,reviews,features,axes,fits,candidates,masters]=await Promise.all([
      dbAll<Product>("products?deleted_at=is.null&select=id,canonical_name,brand,category,verification_status,updated_at&order=updated_at.desc",key,"상품 목록 조회 실패",!forceFresh),
      dbAll<Run>("review_analysis_runs?status=eq.completed&select=id,product_id,provider,model_name,analysis_version,input_review_count,completed_at,created_at&order=completed_at.desc.nullslast",key,"분석 기록 조회 실패",!forceFresh),
      dbAll<{id:string;product_id:string}>("reviews?select=id,product_id",key,"리뷰 집계 조회 실패",!forceFresh),
      dbAll<{id:string;review_id:string}>("review_features?select=id,review_id",key,"키워드 집계 조회 실패",!forceFresh),
      dbAll<{product_id:string;axis:string}>("product_axis_profiles?select=product_id,axis",key,"4축 집계 조회 실패",!forceFresh),
      dbAll<{product_id:string;beauty_code:string}>("product_type_fits?select=product_id,beauty_code",key,"적합도 집계 조회 실패",!forceFresh),
      dbAll<Record<string,unknown>>("review_keyword_candidates?select=id,candidate_keyword,language_code,suggested_axis,suggested_code,suggested_weight,ai_confidence,occurrence_count,status,first_product_id,last_product_id,sample_context,updated_at&order=updated_at.desc.nullslast",key,"Candidate 조회 실패",!forceFresh),
      dbAll<Record<string,unknown>>("review_keyword_master?select=id,canonical_keyword,language_code,axis,code,default_weight,active,synonyms,updated_at&order=updated_at.desc.nullslast",key,"Master 조회 실패",!forceFresh),
    ]);

    const reviewProduct=new Map(reviews.map(r=>[r.id,r.product_id]));
    const storedReviewCount=new Map<string,number>(); for(const r of reviews) storedReviewCount.set(r.product_id,(storedReviewCount.get(r.product_id)??0)+1);
    const featureCount=new Map<string,number>(); for(const f of features){ const pid=reviewProduct.get(f.review_id); if(pid) featureCount.set(pid,(featureCount.get(pid)??0)+1); }
    const axisCount=new Map<string,Set<string>>(); for(const a of axes){ const set=axisCount.get(a.product_id)??new Set<string>(); set.add(a.axis); axisCount.set(a.product_id,set); }
    const fitCount=new Map<string,Set<string>>(); for(const f of fits){ const set=fitCount.get(f.product_id)??new Set<string>(); set.add(f.beauty_code); fitCount.set(f.product_id,set); }
    const lastRun=new Map<string,Run>(); for(const r of runs) if(!lastRun.has(r.product_id)) lastRun.set(r.product_id,r);
    const candidateCount=new Map<string,number>(); for(const c of candidates){ const pid=String(c.last_product_id??c.first_product_id??""); if(pid) candidateCount.set(pid,(candidateCount.get(pid)??0)+1); }

    const productRows=products.map(p=>{
      const run=lastRun.get(p.id);
      const axisN=axisCount.get(p.id)?.size??0;
      const fitN=fitCount.get(p.id)?.size??0;
      const legacy=fitN>=16&&axisN<4;
      return {
        ...p,
        review_count:storedReviewCount.get(p.id)??0,
        evidence_count:Number(run?.input_review_count??0),
        feature_count:featureCount.get(p.id)??0,
        axis_count:axisN,
        fit_count:fitN,
        candidate_count:candidateCount.get(p.id)??0,
        last_analysis_at:run?.completed_at??null,
        analysis_version:run?.analysis_version??null,
        legacy,
        complete:axisN>=4&&fitN>=16,
      };
    }).sort((a,b)=>String(b.last_analysis_at??b.updated_at).localeCompare(String(a.last_analysis_at??a.updated_at)));

    return NextResponse.json({ok:true,products:productRows,candidates,masters,summary:{products:productRows.length,completed:productRows.filter(p=>p.complete).length,candidates:candidates.length,masters:masters.length}});
  }catch(e){ return NextResponse.json({ok:false,message:e instanceof Error?e.message:"조회 중 오류가 발생했습니다."},{status:500}); }
}
