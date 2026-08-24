import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const BEAUTY_CODE = /^[OD][GM][PC][VE]$/;
const MODEL = "gpt-5.4-nano";
const ANALYSIS_VERSION = "layad-hybrid-v3-calibrated";
const BEAUTY_CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;

type Signals = { oil_control:number; hydration:number; glow_finish:number; matte_finish:number; precision_required:number; ease_of_use:number; variability:number; consistency:number };
type AiResult = { canonical_name?:string; brand?:string|null; category?:string|null; confidence?:number; evidence_count?:number; signals?:Partial<Signals> };
type BeginRow = { request_id:string; session_id:string; product_id:string; product_name:string|null; request_status:string; resolved_by_alias:boolean; cached_fit_score:number|null; cached_confidence:number|null; cached_review_count:number|null; ai_mode:string|null };

function dbHeaders(key:string, extra?:HeadersInit):HeadersInit { const h:Record<string,string>={apikey:key,"Content-Type":"application/json"}; if(!key.startsWith("sb_secret_")) h.Authorization=`Bearer ${key}`; return {...h,...(extra??{})}; }
async function db(path:string, init:RequestInit, key:string){ return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:dbHeaders(key,init.headers),cache:"no-store"}); }
function normalize(v:string){ return v.normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase(); }
function device(ua:string){ if(/ipad|tablet/i.test(ua)) return "tablet"; if(/mobile|iphone|android/i.test(ua)) return "mobile"; return ua?"desktop":"unknown"; }
async function resolveUrl(value:string){ try{ const p=new URL(value); const r=await fetch(p.toString(),{method:"GET",redirect:"follow",cache:"no-store",headers:{"User-Agent":"Mozilla/5.0 (compatible; LAYADProductResolver/2.0)"},signal:AbortSignal.timeout(2500)}); return new URL(r.url||p.toString()).toString(); }catch{return value;} }
function clamp(v:unknown){ const n=Number(v); return Number.isFinite(n)?Math.max(0,Math.min(100,n)):50; }
function normSignals(r:Partial<Signals>|undefined):Signals { return {oil_control:clamp(r?.oil_control),hydration:clamp(r?.hydration),glow_finish:clamp(r?.glow_finish),matte_finish:clamp(r?.matte_finish),precision_required:clamp(r?.precision_required),ease_of_use:clamp(r?.ease_of_use),variability:clamp(r?.variability),consistency:clamp(r?.consistency)}; }
function rawScore(code:string,s:Signals){ const v=[code[0]==="O"?s.oil_control:s.hydration,code[1]==="G"?s.glow_finish:s.matte_finish,code[2]==="P"?s.precision_required:s.ease_of_use,code[3]==="V"?s.variability:s.consistency]; return Math.round(v.reduce((a,b)=>a+b,0)/4); }
function displayScore(raw:number){ return Math.round(40 + raw * 0.6); }
function outputText(p:unknown){ const d=p as {output?:Array<{content?:Array<{type?:string;text?:string}>}>}; for(const i of d.output??[]) for(const c of i.content??[]) if(c.type==="output_text"&&c.text) return c.text; return ""; }
function parse(text:string):AiResult { return JSON.parse(text.trim().replace(/^```json\s*/i,"").replace(/```$/i,"").trim()) as AiResult; }

export async function POST(request:NextRequest){
  const startedAll=Date.now();
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY;
  const openai=process.env.OPENAI_API_KEY;
  if(!key||!openai) return NextResponse.json({ok:false,code:!key?"SUPABASE_NOT_CONFIGURED":"OPENAI_NOT_CONFIGURED"},{status:503});
  try{
    const body=await request.json() as {beautyCode?:string;inputValue?:string};
    const beautyCode=body.beautyCode?.trim()??"";
    let inputValue=body.inputValue?.trim()??"";
    if(!BEAUTY_CODE.test(beautyCode)) return NextResponse.json({ok:false,message:"Beauty Code를 확인해 주세요."},{status:400});
    if(!inputValue||inputValue.length>2000) return NextResponse.json({ok:false,message:"상품명 또는 상품 링크를 확인해 주세요."},{status:400});
    const inputType=/^https?:\/\//i.test(inputValue)?"url":"name";
    if(inputType==="url") inputValue=await resolveUrl(inputValue);

    const beginStarted=Date.now();
    const beginResponse=await db("rpc/begin_product_fit_analysis_v2",{method:"POST",body:JSON.stringify({
      p_input_type:inputType,
      p_input_value:inputValue,
      p_normalized_name:normalize(inputValue),
      p_beauty_code:beautyCode,
      p_country_code:request.headers.get("x-vercel-ip-country")||null,
      p_region_code:request.headers.get("x-vercel-ip-country-region")||null,
      p_device_type:device(request.headers.get("user-agent")??""),
    })},key);
    const beginMs=Date.now()-beginStarted;
    if(!beginResponse.ok) throw new Error(`상품 준비 실패: ${beginResponse.status} ${(await beginResponse.text()).slice(0,300)}`);
    const row=(await beginResponse.json() as BeginRow[])[0];
    if(!row?.request_id||!row.product_id) throw new Error("상품 준비 결과가 올바르지 않습니다.");
    if(row.request_status==="completed"&&row.cached_fit_score!=null){
      return NextResponse.json({ok:true,status:"completed",cached:true,requestId:row.request_id,sessionId:row.session_id,productName:row.product_name||inputValue,beautyCode,fitScore:Math.round(Number(row.cached_fit_score)),confidence:Number(row.cached_confidence??0),reviewCount:Number(row.cached_review_count??0),timings:{beginMs,openAiMs:0,finalizeMs:0,totalMs:Date.now()-startedAll}});
    }
    if(row.ai_mode==="off") return NextResponse.json({ok:false,code:"AI_MODE_OFF",message:"실시간 분석이 현재 중지되어 있습니다."},{status:503});

    const prompt=`Research only public web information for this cosmetics product: ${inputValue}. Return JSON only: {"canonical_name":"","brand":null,"category":null,"confidence":0.0,"evidence_count":0,"signals":{"oil_control":0,"hydration":0,"glow_finish":0,"matte_finish":0,"precision_required":0,"ease_of_use":0,"variability":0,"consistency":0}}. Signal values are integers 0-100. confidence is 0-1. Do not invent facts; lower confidence when evidence is weak.`;
    const aiStarted=Date.now();
    const aiResponse=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${openai}`,"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,input:prompt,tools:[{type:"web_search"}],max_output_tokens:450}),cache:"no-store",signal:AbortSignal.timeout(7500)});
    const openAiMs=Date.now()-aiStarted;
    const aiPayload=await aiResponse.json().catch(()=>({}));
    if(!aiResponse.ok) throw new Error((aiPayload as {error?:{message?:string}}).error?.message??`OpenAI 호출 실패: ${aiResponse.status}`);
    const parsed=parse(outputText(aiPayload));
    const confidence=Math.max(0,Math.min(1,Number(parsed.confidence??0)));
    if(confidence<0.6){
      await db(`product_analysis_requests?id=eq.${row.request_id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"insufficient_reviews",error_message:"공개 근거가 충분하지 않아 자동 분석을 보류했습니다.",updated_at:new Date().toISOString()})},key);
      return NextResponse.json({ok:true,status:"insufficient_reviews",requestId:row.request_id,sessionId:row.session_id,confidence,message:"공개 근거가 충분하지 않아 자동 분석을 보류했습니다.",timings:{beginMs,openAiMs,finalizeMs:0,totalMs:Date.now()-startedAll}});
    }

    const s=normSignals(parsed.signals);
    const evidence=Math.max(0,Math.min(99,Math.round(Number(parsed.evidence_count??0))));
    const fits=BEAUTY_CODES.map(code=>{ const raw=rawScore(code,s); return {beauty_code:code,raw_fit_score:raw,fit_score:displayScore(raw)}; });
    const myFit=fits.find(f=>f.beauty_code===beautyCode)!;
    const usage=aiPayload as {usage?:{input_tokens?:number;output_tokens?:number}};
    const canonical=parsed.canonical_name?.trim()||inputValue;
    const finalizeStarted=Date.now();
    const finalize=await db("rpc/finalize_product_fit_analysis_v2",{method:"POST",body:JSON.stringify({
      p_request_id:row.request_id,p_product_id:row.product_id,p_input_type:inputType,p_canonical_name:canonical,
      p_brand:parsed.brand?.trim()||"",p_category:parsed.category?.trim()||"",p_confidence:confidence,p_evidence_count:evidence,
      p_analysis_version:ANALYSIS_VERSION,p_model_name:MODEL,p_input_tokens:Number(usage.usage?.input_tokens??0),p_output_tokens:Number(usage.usage?.output_tokens??0),
      p_started_at:new Date(aiStarted).toISOString(),p_fits:fits,
    })},key);
    const finalizeMs=Date.now()-finalizeStarted;
    if(!finalize.ok) throw new Error(`분석 결과 저장 실패: ${finalize.status} ${(await finalize.text()).slice(0,300)}`);

    return NextResponse.json({ok:true,status:"completed",cached:false,requestId:row.request_id,sessionId:row.session_id,productName:canonical,beautyCode,fitScore:myFit.fit_score,confidence,reviewCount:evidence,timings:{beginMs,openAiMs,finalizeMs,totalMs:Date.now()-startedAll}});
  }catch(error){
    const message=error instanceof Error?error.message:"적합도 분석에 실패했습니다.";
    console.error("Single-call product fit failed",error);
    return NextResponse.json({ok:false,code:"PRODUCT_FIT_FAILED",message,timings:{totalMs:Date.now()-startedAll}},{status:500});
  }
}
