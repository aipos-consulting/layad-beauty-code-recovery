import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODEL = "gpt-5.4-nano";
const ANALYSIS_VERSION = "layad-hybrid-v1-fast";
const BEAUTY_CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;

type Signals = { oil_control:number; hydration:number; glow_finish:number; matte_finish:number; precision_required:number; ease_of_use:number; variability:number; consistency:number };
type AiResult = { canonical_name?:string; brand?:string|null; category?:string|null; confidence?:number; evidence_count?:number; signals?:Partial<Signals> };

function headers(key:string, extra?:HeadersInit):HeadersInit { const h:Record<string,string>={apikey:key,"Content-Type":"application/json"}; if(!key.startsWith("sb_secret_")) h.Authorization=`Bearer ${key}`; return {...h,...(extra??{})}; }
async function db(path:string, init:RequestInit, key:string){ return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:headers(key,init.headers),cache:"no-store"}); }
function clamp(v:unknown){ const n=Number(v); return Number.isFinite(n)?Math.max(0,Math.min(100,n)):50; }
function signals(raw:Partial<Signals>|undefined):Signals { return {oil_control:clamp(raw?.oil_control),hydration:clamp(raw?.hydration),glow_finish:clamp(raw?.glow_finish),matte_finish:clamp(raw?.matte_finish),precision_required:clamp(raw?.precision_required),ease_of_use:clamp(raw?.ease_of_use),variability:clamp(raw?.variability),consistency:clamp(raw?.consistency)}; }
function score(code:string,s:Signals){ const v=[code[0]==="O"?s.oil_control:s.hydration,code[1]==="G"?s.glow_finish:s.matte_finish,code[2]==="P"?s.precision_required:s.ease_of_use,code[3]==="V"?s.variability:s.consistency]; return Math.round(v.reduce((a,b)=>a+b,0)/4); }
function outputText(p:unknown){ const d=p as {output?:Array<{content?:Array<{type?:string;text?:string}>}>}; for(const i of d.output??[]) for(const c of i.content??[]) if(c.type==="output_text"&&c.text) return c.text; return ""; }
function parse(text:string):AiResult { return JSON.parse(text.trim().replace(/^```json\s*/i,"").replace(/```$/i,"").trim()) as AiResult; }
async function setStatus(id:string,status:string,key:string,error:string|null=null){ await db(`product_analysis_requests?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status,error_message:error,updated_at:new Date().toISOString()})},key); }

export async function POST(request:NextRequest){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY;
  const openai=process.env.OPENAI_API_KEY;
  if(!key||!openai) return NextResponse.json({ok:false,code:!key?"SUPABASE_NOT_CONFIGURED":"OPENAI_NOT_CONFIGURED"},{status:503});
  let requestId="";
  try{
    const body=await request.json() as {requestId?:string}; requestId=body.requestId?.trim()??"";
    if(!UUID.test(requestId)) return NextResponse.json({ok:false,message:"분석 요청 ID가 올바르지 않습니다."},{status:400});
    const rr=await db(`product_analysis_requests?id=eq.${requestId}&select=id,status,input_type,input_value,product_id&limit=1`,{method:"GET"},key);
    if(!rr.ok) throw new Error(`분석 요청 조회 실패: ${rr.status}`);
    const row=(await rr.json() as Array<{status:string;input_type:string;input_value:string;product_id:string|null}>)[0];
    if(!row?.product_id) return NextResponse.json({ok:false,message:"분석할 상품을 찾지 못했습니다."},{status:404});
    if(row.status==="completed") return NextResponse.json({ok:true,status:"completed",cached:true});
    const settings=await db("ai_operation_settings?setting_key=eq.default&select=mode&limit=1",{method:"GET"},key);
    if(settings.ok&&((await settings.json() as Array<{mode?:string}>)[0]?.mode)==="off") return NextResponse.json({ok:false,code:"AI_MODE_OFF",message:"실시간 분석이 현재 중지되어 있습니다."},{status:503});
    await setStatus(requestId,"analyzing",key);

    const prompt=`Research only public web information for this cosmetics product: ${row.input_value}. Return JSON only: {"canonical_name":"","brand":null,"category":null,"confidence":0.0,"evidence_count":0,"signals":{"oil_control":0,"hydration":0,"glow_finish":0,"matte_finish":0,"precision_required":0,"ease_of_use":0,"variability":0,"consistency":0}}. Signal values are integers 0-100. confidence is 0-1. Do not invent facts; lower confidence when evidence is weak.`;
    const started=Date.now();
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${openai}`,"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,input:prompt,tools:[{type:"web_search"}],max_output_tokens:450}),cache:"no-store",signal:AbortSignal.timeout(7500)});
    const elapsedMs=Date.now()-started;
    const payload=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error((payload as {error?:{message?:string}}).error?.message??`OpenAI 호출 실패: ${r.status}`);
    const parsed=parse(outputText(payload));
    const confidence=Math.max(0,Math.min(1,Number(parsed.confidence??0)));
    if(confidence<0.6){ await setStatus(requestId,"insufficient_reviews",key,"공개 근거가 충분하지 않아 자동 분석을 보류했습니다."); return NextResponse.json({ok:true,status:"insufficient_reviews",confidence,elapsedMs,message:"공개 근거가 충분하지 않아 자동 분석을 보류했습니다."}); }

    const s=signals(parsed.signals); const evidence=Math.max(0,Math.min(99,Math.round(Number(parsed.evidence_count??0))));
    const fits=BEAUTY_CODES.map(beauty_code=>({product_id:row.product_id,beauty_code,fit_score:score(beauty_code,s),review_count:evidence,confidence,analysis_version:ANALYSIS_VERSION,updated_at:new Date().toISOString()}));
    const fr=await db("product_type_fits?on_conflict=product_id,beauty_code",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(fits)},key);
    if(!fr.ok) throw new Error(`적합도 저장 실패: ${fr.status}`);
    const canonical=(parsed.canonical_name?.trim()||row.input_value); const normalized=canonical.normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase();
    await db(`products?id=eq.${row.product_id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({canonical_name:canonical,normalized_name:normalized,brand:parsed.brand?.trim()||null,category:parsed.category?.trim()||null,verification_status:row.input_type==="url"?"link_verified":"name_verified",updated_at:new Date().toISOString()})},key);
    await setStatus(requestId,"completed",key);
    const usage=payload as {usage?:{input_tokens?:number;output_tokens?:number}};
    await db("review_analysis_runs",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({product_id:row.product_id,status:"completed",provider:"openai",model_name:MODEL,prompt_version:"layad-signal-fast-v1",analysis_version:ANALYSIS_VERSION,input_review_count:evidence,input_tokens:Number(usage.usage?.input_tokens??0),output_tokens:Number(usage.usage?.output_tokens??0),started_at:new Date(started).toISOString(),completed_at:new Date().toISOString()})},key);
    return NextResponse.json({ok:true,status:"completed",cached:false,elapsedMs,confidence,productName:canonical});
  }catch(error){ const message=error instanceof Error?error.message:"실시간 분석에 실패했습니다."; if(requestId&&UUID.test(requestId)) await setStatus(requestId,"failed",key,message.slice(0,500)).catch(()=>undefined); console.error("Hybrid realtime product analysis failed",error); return NextResponse.json({ok:false,code:"REALTIME_ANALYSIS_FAILED",message},{status:500}); }
}
