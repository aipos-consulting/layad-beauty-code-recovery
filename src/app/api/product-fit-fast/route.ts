import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const BEAUTY_CODE = /^[OD][GM][PC][VE]$/;
const MODEL = "gpt-5.4-nano";
const ANALYSIS_VERSION = "layad-chatgpt-reference-v7-direct16-fallback";
const BEAUTY_CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;

type BeautyCode = typeof BEAUTY_CODES[number];
type AiResult = {
  canonical_name?: string;
  brand?: string | null;
  category?: string | null;
  confidence?: number;
  evidence_count?: number;
  fits?: Partial<Record<BeautyCode, number>>;
};
type BeginRow = { request_id:string; session_id:string; product_id:string; product_name:string|null; request_status:string; resolved_by_alias:boolean; cached_fit_score:number|null; cached_confidence:number|null; cached_review_count:number|null; ai_mode:string|null };

function dbHeaders(key:string, extra?:HeadersInit):HeadersInit { const h:Record<string,string>={apikey:key,"Content-Type":"application/json"}; if(!key.startsWith("sb_secret_")) h.Authorization=`Bearer ${key}`; return {...h,...(extra??{})}; }
async function db(path:string, init:RequestInit, key:string){ return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:dbHeaders(key,init.headers),cache:"no-store"}); }
function normalize(v:string){ return v.normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase(); }
function device(ua:string){ if(/ipad|tablet/i.test(ua)) return "tablet"; if(/mobile|iphone|android/i.test(ua)) return "mobile"; return ua?"desktop":"unknown"; }
async function resolveUrl(value:string){ try{ const p=new URL(value); const r=await fetch(p.toString(),{method:"GET",redirect:"follow",cache:"no-store",headers:{"User-Agent":"Mozilla/5.0 (compatible; LAYADProductResolver/2.0)"},signal:AbortSignal.timeout(3500)}); return new URL(r.url||p.toString()).toString(); }catch{return value;} }
function outputText(p:unknown){ const d=p as {output?:Array<{content?:Array<{type?:string;text?:string}>}>}; for(const i of d.output??[]) for(const c of i.content??[]) if(c.type==="output_text"&&c.text) return c.text; return ""; }
function clampScore(v:unknown){ const n=Math.round(Number(v)); return Number.isFinite(n)?Math.max(0,Math.min(100,n)):50; }
function parse(text:string):AiResult {
  const cleaned=text.trim().replace(/^```json\s*/i,"").replace(/```$/i,"").trim();
  if(!cleaned) throw new Error("OpenAI 응답에 분석 JSON이 없습니다.");
  const start=cleaned.indexOf("{");
  const end=cleaned.lastIndexOf("}");
  if(start<0||end<=start) throw new Error("OpenAI 분석 JSON이 완전하지 않습니다.");
  const parsed=JSON.parse(cleaned.slice(start,end+1)) as AiResult;
  const missing=BEAUTY_CODES.filter(code=>parsed.fits?.[code]===undefined || !Number.isFinite(Number(parsed.fits?.[code])));
  if(missing.length) throw new Error(`16유형 점수가 완전하지 않습니다: ${missing.join(",")}`);
  return parsed;
}

const codeList=BEAUTY_CODES.join(", ");
function buildPrompt(inputValue:string, fallback=false){
  return `당신은 LAYAD BEAUTY CODE의 화장품 상품 적합도 분석 담당자입니다.\n\n분석 대상 상품: ${inputValue}\n\nBeauty Code 공식 축 정의\n- O/D: 피부 유분·건조 성향과 제품의 궁합\n- G/M: Glow(윤광·촉촉한 표현) / Matte(보송·매트한 표현)\n- P = Precise: 정교함·완성도 중심. 제품을 세밀하게 조절하고, 레이어링·커버·발색·지속력·피니시를 원하는 수준으로 최적화할 가치가 큰 경우 P 적합도가 높다. 사용이 쉽다는 이유만으로 C로 판단하지 않는다.\n- C = Convenient: 간편함·편의성 중심. 빠르고 단순하며 수정이 쉽고, 특별한 기술이나 세밀한 조절 없이도 무난한 결과를 얻는 것이 핵심 가치인 경우 C 적합도가 높다.\n- V = Variable: 제품·환경·사용량·도구·피부 상태 등에 따라 결과가 달라지는 성향\n- E = Even: 비교적 일정하고 안정적인 결과\n\n공개적으로 확인 가능한 상품 정보만 사용하고, 확인할 수 없는 사실은 추정하지 마세요. 공식 상품 정보와 공개 리뷰/사용 경험을 우선 참고하세요. ${fallback?"웹 검색 도구를 사용할 수 없는 대체 분석입니다. 확실히 알 수 없는 특성은 중립적으로 평가하고 confidence를 0.35 이하로 낮추세요.":"웹 검색으로 상품을 먼저 정확히 식별하세요."}\n\n중요: 신호 몇 개를 산식으로 합성하지 말고, 상품 전체 특성을 종합하여 16개 유형을 서로 직접 비교 평가하세요. P/C는 반드시 위 공식 정의에 따라 판단하고, P를 단순히 '바르기 어려움'으로 해석하지 마세요. 같은 O/D, G/M, V/E 조건에서는 P와 C 중 제품의 핵심 가치에 더 맞는 쪽이 분명히 높아야 합니다. 실제 근거가 있으면 유형별 상대 차이가 드러나도록 점수를 사용하세요. 모든 점수를 동일하게 만들지 마세요.\n\n다음 16개 코드를 빠짐없이 0~100 정수로 평가하세요: ${codeList}.\n\nJSON만 반환하세요. 형식: {"canonical_name":"상품명","brand":"브랜드 또는 null","category":"카테고리 또는 null","confidence":0.0,"evidence_count":0,"fits":{"OGPV":0,"OGPE":0,"OGCV":0,"OGCE":0,"OMPV":0,"OMPE":0,"OMCV":0,"OMCE":0,"DGPV":0,"DGPE":0,"DGCV":0,"DGCE":0,"DMPV":0,"DMPE":0,"DMCV":0,"DMCE":0}}`;
}

async function oneOpenAICall(openai:string,prompt:string,useWeb:boolean,timeoutMs:number){
  const body:Record<string,unknown>={model:MODEL,input:prompt,max_output_tokens:1250};
  if(useWeb) body.tools=[{type:"web_search"}];
  const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{Authorization:`Bearer ${openai}`,"Content-Type":"application/json"},
    body:JSON.stringify(body),
    cache:"no-store",
    signal:AbortSignal.timeout(timeoutMs),
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error((payload as {error?:{message?:string}}).error?.message??`OpenAI 호출 실패: ${response.status}`);
  const parsed=parse(outputText(payload));
  return {payload,parsed};
}

async function analyzeWithFallback(openai:string,inputValue:string){
  let primaryError:unknown;
  for(let attempt=0;attempt<2;attempt+=1){
    try{
      return {...await oneOpenAICall(openai,buildPrompt(inputValue,false),true,attempt===0?16000:12000),mode:"web" as const};
    }catch(error){
      primaryError=error;
      if(attempt===0) await new Promise(resolve=>setTimeout(resolve,250));
    }
  }
  console.warn("Primary web analysis failed; using low-confidence fallback",primaryError);
  try{
    return {...await oneOpenAICall(openai,buildPrompt(inputValue,true),false,7000),mode:"fallback" as const};
  }catch(fallbackError){
    console.error("Fallback product analysis failed",fallbackError);
    throw primaryError instanceof Error?primaryError:fallbackError;
  }
}

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
      p_input_type:inputType,p_input_value:inputValue,p_normalized_name:normalize(inputValue),p_beauty_code:beautyCode,
      p_country_code:request.headers.get("x-vercel-ip-country")||null,p_region_code:request.headers.get("x-vercel-ip-country-region")||null,
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

    const aiStarted=Date.now();
    const {payload:aiPayload,parsed,mode}=await analyzeWithFallback(openai,inputValue);
    const openAiMs=Date.now()-aiStarted;
    const confidence=Math.max(0,Math.min(mode==="fallback"?0.35:1,Number(parsed.confidence??0)));
    const evidence=Math.max(0,Math.min(99,Math.round(Number(parsed.evidence_count??0))));
    const fits=BEAUTY_CODES.map(code=>{ const score=clampScore(parsed.fits?.[code]); return {beauty_code:code,raw_fit_score:score,fit_score:score}; });
    const myFit=fits.find(f=>f.beauty_code===beautyCode)!;
    const usage=aiPayload as {usage?:{input_tokens?:number;output_tokens?:number}};
    const canonical=parsed.canonical_name?.trim()||inputValue;

    const finalizeStarted=Date.now();
    const finalize=await db("rpc/finalize_product_fit_analysis_v2",{method:"POST",body:JSON.stringify({
      p_request_id:row.request_id,p_product_id:row.product_id,p_input_type:inputType,p_canonical_name:canonical,
      p_brand:parsed.brand?.trim()||"",p_category:parsed.category?.trim()||"",p_confidence:confidence,p_evidence_count:evidence,
      p_analysis_version:`${ANALYSIS_VERSION}${mode==="fallback"?"-low-confidence":""}`,p_model_name:MODEL,
      p_input_tokens:Number(usage.usage?.input_tokens??0),p_output_tokens:Number(usage.usage?.output_tokens??0),
      p_started_at:new Date(aiStarted).toISOString(),p_fits:fits,
    })},key);
    const finalizeMs=Date.now()-finalizeStarted;
    if(!finalize.ok) throw new Error(`분석 결과 저장 실패: ${finalize.status} ${(await finalize.text()).slice(0,300)}`);

    return NextResponse.json({ok:true,status:"completed",cached:false,analysisMode:mode,requestId:row.request_id,sessionId:row.session_id,productName:canonical,beautyCode,fitScore:myFit.fit_score,confidence,reviewCount:evidence,timings:{beginMs,openAiMs,finalizeMs,totalMs:Date.now()-startedAll}});
  }catch(error){
    const isTimeout=error instanceof Error && (error.name==="TimeoutError" || /timeout|timed out|시간.*초과/i.test(error.message));
    const isMalformed=error instanceof SyntaxError || (error instanceof Error && /JSON|완전하지|16유형/i.test(error.message));
    const message=isTimeout?"상품 분석 서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.":isMalformed?"상품 분석 결과를 완성하지 못했습니다. 다시 한 번 시도해 주세요.":error instanceof Error?error.message:"적합도 분석에 실패했습니다.";
    console.error("Single-call product fit failed",error);
    return NextResponse.json({ok:false,code:isTimeout?"PRODUCT_FIT_TIMEOUT":isMalformed?"PRODUCT_FIT_INCOMPLETE":"PRODUCT_FIT_FAILED",message,timings:{totalMs:Date.now()-startedAll}},{status:isTimeout?504:500});
  }
}
