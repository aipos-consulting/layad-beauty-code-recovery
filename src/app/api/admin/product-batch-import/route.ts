import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const ANALYSIS_VERSION = "chatgpt-precomputed-v1";
const PROMPT_VERSION = "admin-chatgpt-batch-v1";
const BEAUTY_CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;
const AXES = ["OD","GM","PC","VE"] as const;

type Feature = { keyword:string; axis:"OD"|"GM"|"PC"|"VE"; code:"O"|"D"|"G"|"M"|"P"|"C"|"V"|"E"; sentiment:"positive"|"negative"|"neutral"|"mixed"; intensity:number; confidence:number; context?:string; evidence_excerpt?:string };
type Review = { source_label?:string; source_url:string; language_code?:string; review_text:string; features:Feature[] };
type AxisProfile = { axis:"OD"|"GM"|"PC"|"VE"; first_code:string; first_score:number; second_code:string; second_score:number; review_count:number; confidence:number };
type KeywordCandidate = { keyword:string; language_code?:string; axis:"OD"|"GM"|"PC"|"VE"; code:string; weight?:number; confidence?:number; occurrence_count?:number; sample_context?:string };
type ProductBatchItem = {
  product:{ canonical_name:string; brand?:string|null; category?:string|null; product_url?:string|null };
  reviews:Review[];
  axis_profiles:AxisProfile[];
  type_fits:Record<string,number>|Array<{beauty_code:string;fit_score:number;review_count?:number;confidence?:number}>;
  keyword_candidates?:KeywordCandidate[];
};
type ValidationRow = { index:number; name:string; errors:string[]; duplicate:boolean; duplicateReason?:"existing"|"input" };

function cfg(){ return { key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY }; }
function headers(key:string, extra?:HeadersInit):HeadersInit { const base:Record<string,string>={apikey:key,"Content-Type":"application/json"}; if(!key.startsWith("sb_secret_")) base.Authorization=`Bearer ${key}`; return {...base,...(extra??{})}; }
async function db(path:string, init:RequestInit, key:string){ return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:headers(key,init.headers),cache:"no-store"}); }
function norm(v:string){ return v.normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase(); }
function inRange(v:number,min:number,max:number){ return Number.isFinite(v)&&v>=min&&v<=max; }
function validateShape(item:ProductBatchItem,index:number){
  const errors:string[]=[];
  const p=item?.product;
  if(!p?.canonical_name?.trim()) errors.push("상품명 누락");
  if(!Array.isArray(item.reviews)||item.reviews.length<5) errors.push("리뷰 5건 미만");
  for(const [i,r] of (item.reviews??[]).entries()){
    if(!/^https?:\/\//i.test(r.source_url??"")) errors.push(`리뷰 ${i+1} URL 오류`);
    if(!r.review_text?.trim()) errors.push(`리뷰 ${i+1} 내용 누락`);
    if(!Array.isArray(r.features)||r.features.length===0) errors.push(`리뷰 ${i+1} 키워드 누락`);
    for(const f of r.features??[]){ if(!AXES.includes(f.axis)) errors.push(`리뷰 ${i+1} axis 오류`); if(!inRange(Number(f.intensity),0,1)||!inRange(Number(f.confidence),0,1)) errors.push(`리뷰 ${i+1} intensity/confidence 오류`); }
  }
  if(!Array.isArray(item.axis_profiles)||item.axis_profiles.length!==4||new Set(item.axis_profiles.map(x=>x.axis)).size!==4) errors.push("4축 프로필 오류");
  const fits=Array.isArray(item.type_fits)?item.type_fits:Object.entries(item.type_fits??{}).map(([beauty_code,fit_score])=>({beauty_code,fit_score:Number(fit_score)}));
  if(fits.length!==16||new Set(fits.map(x=>x.beauty_code)).size!==16||fits.some(x=>!BEAUTY_CODES.includes(x.beauty_code as typeof BEAUTY_CODES[number])||!inRange(Number(x.fit_score),0,100))) errors.push("16개 Beauty Code 점수 오류");
  return { index, name:p?.canonical_name??`#${index+1}`, errors };
}

async function findExistingProductId(item:ProductBatchItem,key:string){
  const name=item.product?.canonical_name?.trim(); if(!name) return null;
  const lookup=await db(`products?normalized_name=eq.${encodeURIComponent(norm(name))}&deleted_at=is.null&select=id&limit=1`,{method:"GET"},key);
  if(!lookup.ok) throw new Error(`중복 상품 확인 실패: ${await lookup.text()}`);
  const rows=await lookup.json() as Array<{id:string}>;
  return rows[0]?.id??null;
}

async function validateBatch(items:ProductBatchItem[],key:string){
  const rows:ValidationRow[]=[];
  const seen=new Set<string>();
  for(let i=0;i<items.length;i++){
    const base=validateShape(items[i],i);
    const normalized=items[i]?.product?.canonical_name?norm(items[i].product.canonical_name):"";
    let duplicate=false; let duplicateReason:ValidationRow["duplicateReason"];
    if(normalized&&seen.has(normalized)){ duplicate=true; duplicateReason="input"; }
    else if(normalized){
      seen.add(normalized);
      const existingId=await findExistingProductId(items[i],key);
      if(existingId){ duplicate=true; duplicateReason="existing"; }
    }
    rows.push({...base,duplicate,duplicateReason});
  }
  return rows;
}

async function createProduct(item:ProductBatchItem,key:string){
  const name=item.product.canonical_name.trim(); const normalized=norm(name);
  const ins=await db("products",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({canonical_name:name,normalized_name:normalized,brand:item.product.brand??null,category:item.product.category??null,product_url:item.product.product_url??null,verification_status:"verified"})},key);
  if(!ins.ok) throw new Error(`상품 저장 실패: ${await ins.text()}`); const rows=await ins.json() as Array<{id:string}>; if(!rows[0]?.id) throw new Error("상품 ID 생성 실패"); return rows[0].id;
}

async function importOne(item:ProductBatchItem,key:string){
  const productId=await createProduct(item,key);
  const runRes=await db("review_analysis_runs",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({product_id:productId,status:"completed",provider:"chatgpt-manual",model_name:"ChatGPT",prompt_version:PROMPT_VERSION,analysis_version:ANALYSIS_VERSION,input_review_count:item.reviews.length,started_at:new Date().toISOString(),completed_at:new Date().toISOString()})},key);
  if(!runRes.ok) throw new Error(`분석 기록 저장 실패: ${await runRes.text()}`); const runId=(await runRes.json() as Array<{id:string}>)[0]?.id;
  if(!runId) throw new Error("분석 기록 ID 생성 실패");

  const sourceRows=item.reviews.map(r=>({product_id:productId,source_type:"import",source_label:r.source_label??"ChatGPT source",source_url:r.source_url,country_code:null}));
  const srcRes=await db("review_sources?select=id,source_url",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(sourceRows)},key);
  if(!srcRes.ok) throw new Error(`리뷰 출처 저장 실패: ${await srcRes.text()}`); const sources=await srcRes.json() as Array<{id:string;source_url:string}>; const sourceMap=new Map(sources.map(x=>[x.source_url,x.id]));

  const reviewRows=item.reviews.map((r,i)=>({product_id:productId,source_id:sourceMap.get(r.source_url)??null,external_review_key:`chatgpt-import:${runId}:${i}`,review_text:r.review_text.slice(0,20000),language_code:(r.language_code??"ko").slice(0,12)}));
  const revRes=await db("reviews?select=id,external_review_key",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(reviewRows)},key);
  if(!revRes.ok) throw new Error(`리뷰 저장 실패: ${await revRes.text()}`); const reviews=await revRes.json() as Array<{id:string;external_review_key:string}>; const reviewMap=new Map(reviews.map(x=>[x.external_review_key,x.id]));

  const featureRows:Record<string,unknown>[]=[];
  item.reviews.forEach((r,i)=>{ const reviewId=reviewMap.get(`chatgpt-import:${runId}:${i}`); if(!reviewId)return; r.features.forEach(f=>featureRows.push({review_id:reviewId,analysis_run_id:runId,axis:f.axis,code:f.code,feature_label:f.keyword.slice(0,200),sentiment:f.sentiment,intensity:f.intensity,confidence:f.confidence,context_text:(f.context??"").slice(0,1000),evidence_excerpt:(f.evidence_excerpt??"").slice(0,500),condition_tags:{},verified:true})); });
  const featRes=await db("review_features",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(featureRows)},key); if(!featRes.ok) throw new Error(`리뷰 키워드 저장 실패: ${await featRes.text()}`);

  const profileRows=item.axis_profiles.map(x=>({product_id:productId,axis:x.axis,first_code:x.first_code,first_score:x.first_score,second_code:x.second_code,second_score:x.second_score,review_count:x.review_count,confidence:x.confidence,analysis_version:ANALYSIS_VERSION,updated_at:new Date().toISOString()}));
  const profRes=await db("product_axis_profiles?on_conflict=product_id,axis",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(profileRows)},key); if(!profRes.ok) throw new Error(`4축 저장 실패: ${await profRes.text()}`);

  const fits=Array.isArray(item.type_fits)?item.type_fits:Object.entries(item.type_fits).map(([beauty_code,fit_score])=>({beauty_code,fit_score:Number(fit_score),review_count:item.reviews.length,confidence:0.8}));
  const fitRows=fits.map(x=>({product_id:productId,beauty_code:x.beauty_code,fit_score:x.fit_score,review_count:x.review_count??item.reviews.length,confidence:x.confidence??0.8,analysis_version:ANALYSIS_VERSION,updated_at:new Date().toISOString()}));
  const fitRes=await db("product_type_fits?on_conflict=product_id,beauty_code",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(fitRows)},key); if(!fitRes.ok) throw new Error(`16유형 점수 저장 실패: ${await fitRes.text()}`);

  const masterRes=await db("review_keyword_master?active=eq.true&select=canonical_keyword,language_code,synonyms",{method:"GET"},key);
  const known=new Set<string>(); if(masterRes.ok){ const masters=await masterRes.json() as Array<{canonical_keyword:string;language_code:string;synonyms:unknown}>; for(const m of masters){ known.add(`${m.language_code}:${norm(m.canonical_keyword)}`); if(Array.isArray(m.synonyms)) for(const s of m.synonyms) if(typeof s==="string") known.add(`${m.language_code}:${norm(s)}`); } }
  const supplied=item.keyword_candidates??item.reviews.flatMap(r=>r.features.map(f=>({keyword:f.keyword,language_code:r.language_code??"ko",axis:f.axis,code:f.code,weight:f.intensity,confidence:f.confidence,occurrence_count:1,sample_context:f.context??f.evidence_excerpt??""})));
  let candidateCount=0;
  for(const c of supplied){ const lang=c.language_code??"ko"; if(!c.keyword?.trim()||known.has(`${lang}:${norm(c.keyword)}`)) continue; const q=`review_keyword_candidates?candidate_keyword=eq.${encodeURIComponent(c.keyword.trim())}&language_code=eq.${encodeURIComponent(lang)}&suggested_axis=eq.${c.axis}&suggested_code=eq.${c.code}&status=eq.pending&select=id,occurrence_count&limit=1`; const er=await db(q,{method:"GET"},key); if(er.ok){ const rows=await er.json() as Array<{id:number;occurrence_count:number}>; if(rows[0]) await db(`review_keyword_candidates?id=eq.${rows[0].id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({occurrence_count:rows[0].occurrence_count+(c.occurrence_count??1),last_product_id:productId,ai_confidence:c.confidence??0.7,sample_context:(c.sample_context??"").slice(0,1000),updated_at:new Date().toISOString()})},key); else await db("review_keyword_candidates",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({candidate_keyword:c.keyword.trim(),language_code:lang,suggested_axis:c.axis,suggested_code:c.code,suggested_weight:c.weight??0.7,ai_confidence:c.confidence??0.7,occurrence_count:c.occurrence_count??1,first_product_id:productId,last_product_id:productId,sample_context:(c.sample_context??"").slice(0,1000),status:"pending"})},key); candidateCount++; }
  }
  return {productId,runId,reviewCount:item.reviews.length,featureCount:featureRows.length,candidateCount};
}

export async function POST(request:NextRequest){
  const {key}=cfg(); if(!key) return NextResponse.json({ok:false,message:"Supabase server key가 없습니다."},{status:503});
  let body:{items?:ProductBatchItem[];validateOnly?:boolean}; try{body=await request.json();}catch{return NextResponse.json({ok:false,message:"JSON 형식이 올바르지 않습니다."},{status:400});}
  const items=body.items??[]; if(items.length===0||items.length>100) return NextResponse.json({ok:false,message:"1~100개 상품만 처리할 수 있습니다."},{status:400});
  const validation=await validateBatch(items,key);
  const invalid=validation.filter(v=>v.errors.length);
  const duplicates=validation.filter(v=>v.duplicate);
  const executable=validation.filter(v=>!v.duplicate&&!v.errors.length);
  if(body.validateOnly) return NextResponse.json({ok:true,total:items.length,valid:executable.length,invalid:invalid.length,duplicates:duplicates.length,validation});

  const results=[] as Array<Record<string,unknown>>;
  for(const row of validation){
    const item=items[row.index];
    if(row.duplicate){ results.push({index:row.index,name:row.name,ok:true,skipped:true,status:"already_exists",error:"이미 생성된 상품"}); continue; }
    if(row.errors.length){ results.push({index:row.index,name:row.name,ok:false,skipped:true,status:"invalid",error:row.errors.join(" · ")}); continue; }
    try{ results.push({index:row.index,name:row.name,ok:true,status:"completed",...await importOne(item,key)}); }
    catch(e){ results.push({index:row.index,name:row.name,ok:false,status:"failed",error:e instanceof Error?e.message:"저장 실패"}); }
  }
  const completed=results.filter(r=>r.status==="completed").length;
  const skippedDuplicates=results.filter(r=>r.status==="already_exists").length;
  const failed=results.filter(r=>r.status==="failed"||r.status==="invalid").length;
  return NextResponse.json({ok:failed===0,total:items.length,completed,duplicates:skippedDuplicates,failed,results},{status:failed?207:200});
}
