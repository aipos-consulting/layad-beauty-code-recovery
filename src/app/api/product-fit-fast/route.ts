import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const BEAUTY_CODE = /^[OD][GM][PC][VE]$/;
const MODEL = "gpt-5.4-nano";
const ANALYSIS_VERSION = "layad-v8-current-analysis-original-score";
const BEAUTY_CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;

type AxisScores = {
  dry: number;
  glow: number;
  precise: number;
  variable: number;
};
type AiResult = {
  canonical_name?: string;
  brand?: string | null;
  category?: string | null;
  confidence?: number;
  evidence_count?: number;
  axis_scores?: Partial<AxisScores>;
};
type BeginRow = { request_id:string; session_id:string; product_id:string; product_name:string|null; request_status:string; resolved_by_alias:boolean; cached_fit_score:number|null; cached_confidence:number|null; cached_review_count:number|null; ai_mode:string|null };

function dbHeaders(key:string, extra?:HeadersInit):HeadersInit { const h:Record<string,string>={apikey:key,"Content-Type":"application/json"}; if(!key.startsWith("sb_secret_")) h.Authorization=`Bearer ${key}`; return {...h,...(extra??{})}; }
async function db(path:string, init:RequestInit, key:string){ return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:dbHeaders(key,init.headers),cache:"no-store"}); }
function normalize(v:string){ return v.normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase(); }
function device(ua:string){ if(/ipad|tablet/i.test(ua)) return "tablet"; if(/mobile|iphone|android/i.test(ua)) return "mobile"; return ua?"desktop":"unknown"; }
async function resolveUrl(value:string){ try{ const p=new URL(value); const r=await fetch(p.toString(),{method:"GET",redirect:"follow",cache:"no-store",headers:{"User-Agent":"Mozilla/5.0 (compatible; LAYADProductResolver/2.0)"},signal:AbortSignal.timeout(3500)}); return new URL(r.url||p.toString()).toString(); }catch{return value;} }
function outputText(p:unknown){ const d=p as {output?:Array<{content?:Array<{type?:string;text?:string}>}>}; for(const i of d.output??[]) for(const c of i.content??[]) if(c.type==="output_text"&&c.text) return c.text; return ""; }
function clamp(v:unknown){ const n=Number(v); return Number.isFinite(n)?Math.max(0,Math.min(100,n)):50; }
function parse(text:string):AiResult {
  const cleaned=text.trim().replace(/^```json\s*/i,"").replace(/```$/i,"").trim();
  if(!cleaned) throw new Error("OpenAI 응답에 분석 JSON이 없습니다.");
  const start=cleaned.indexOf("{");
  const end=cleaned.lastIndexOf("}");
  if(start<0||end<=start) throw new Error("OpenAI 분석 JSON이 완전하지 않습니다.");
  const parsed=JSON.parse(cleaned.slice(start,end+1)) as AiResult;
  const a=parsed.axis_scores;
  if(!a || [a.dry,a.glow,a.precise,a.variable].some(v=>!Number.isFinite(Number(v)))) throw new Error("4축 분석 점수가 완전하지 않습니다.");
  return parsed;
}

function buildPrompt(inputValue:string, fallback=false){
  return `당신은 LAYAD BEAUTY CODE의 화장품 상품 적합도 분석 담당자입니다.\n\n분석 대상 상품: ${inputValue}\n\n현재 LAYAD 분석 메커니즘을 유지하되, 최종 점수는 초기 LAYAD 공식 평가체계로 계산합니다. 당신은 최종 16유형 점수를 만들지 말고, 공개 근거로 아래 4개 방향성 점수만 판정하세요.\n\n공식 축 정의\n1. dry 0~100: 100에 가까울수록 D(건성 대응)에 강함. 보습, 당김·각질·들뜸 억제, 수분 유지, 건조 피부 베이스 적합성을 봅니다. 0에 가까울수록 O(유분 대응) 성향입니다.\n2. glow 0~100: 100에 가까울수록 G(Glow). 수분광·윤기·얇고 자연스러운 피부 표현에 적합합니다. 0에 가까울수록 M(Matte) 성향입니다.\n3. precise 0~100: 100에 가까울수록 P(Precise). 난이도가 아니라 정교한 조절, 레이어링, 커버·발색·피니시 최적화, 완성도 향상의 가치가 큰 제품입니다. 사용이 쉽더라도 이런 가치가 크면 P입니다. 0에 가까울수록 C(Convenient): 빠름, 단순함, 원스텝, 수정 용이성, 별도 조절 없이 무난한 결과가 핵심 가치입니다.\n4. variable 0~100: 100에 가까울수록 V(Variable). 계절·피부 컨디션·사용량·도구·환경에 맞춰 조절 가치가 크고 결과가 달라질 수 있습니다. 0에 가까울수록 E(Even): 비교적 일정하고 안정적인 결과입니다.\n\n점수 앵커\n- 매우 강함: 85~95\n- 강함: 70~84\n- 중립/혼합: 45~55\n- 약함: 20~40\n- 극단값 0 또는 100은 명확한 공개 근거가 있을 때만 사용\n\n초기 LAYAD 점수체계는 D/O 30점, G/M 25점, P/C 20점, V/E 25점의 총 100점 구조입니다. 예를 들어 어떤 제품이 D=90, G=76, P=90, V=92라면 DGPV 점수는 약 87점입니다. 이 예시는 점수 스케일을 설명하기 위한 것이며 특정 상품을 강제로 맞추기 위한 값이 아닙니다.\n\n${fallback?"웹 검색을 사용할 수 없는 대체 분석입니다. 확실하지 않은 축은 50에 가깝게 두고 confidence를 0.35 이하로 낮추세요.":"웹 검색으로 상품을 정확히 식별하고 공식 상품 정보와 공개 리뷰/사용 경험을 우선 확인하세요."}\n확인할 수 없는 사실은 추정하지 마세요.\n\nJSON만 반환하세요. 형식: {"canonical_name":"상품명","brand":"브랜드 또는 null","category":"카테고리 또는 null","confidence":0.0,"evidence_count":0,"axis_scores":{"dry":50,"glow":50,"precise":50,"variable":50}}`;
}

async function oneOpenAICall(openai:string,prompt:string,useWeb:boolean,timeoutMs:number){
  const body:Record<string,unknown>={model:MODEL,input:prompt,max_output_tokens:800};
  if(useWeb) body.tools=[{type:"web_search"}];
  const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",headers:{Authorization:`Bearer ${openai}`,"Content-Type":"application/json"},
    body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(timeoutMs),
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error((payload as {error?:{message?:string}}).error?.message??`OpenAI 호출 실패: ${response.status}`);
  const parsed=parse(outputText(payload));
  return {payload,parsed};
}

async function analyzeWithFallback(openai:string,inputValue:string){
  let primaryError:unknown;
  for(let attempt=0;attempt<2;attempt+=1){
    try { return {...await oneOpenAICall(openai,buildPrompt(inputValue,false),true,attempt===0?16000:12000),mode:"web" as const}; }
    catch(error){ primaryError=error; if(attempt===0) await new Promise(resolve=>setTimeout(resolve,250)); }
  }
  console.warn("Primary web analysis failed; using low-confidence fallback",primaryError);
  try { return {...await oneOpenAICall(openai,buildPrompt(inputValue,true),false,7000),mode:"fallback" as const}; }
  catch(fallbackError){ console.error("Fallback product analysis failed",fallbackError); throw primaryError instanceof Error?primaryError:fallbackError; }
}

function scoreForCode(code:string,a:AxisScores){
  const od = code[0]==="D" ? a.dry : 100-a.dry;
  const gm = code[1]==="G" ? a.glow : 100-a.glow;
  const pc = code[2]==="P" ? a.precise : 100-a.precise;
  const ve = code[3]==="V" ? a.variable : 100-a.variable;
  return Math.round(od*0.30 + gm*0.25 + pc*0.20 + ve*0.25);
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
    const a:AxisScores={dry:clamp(parsed.axis_scores?.dry),glow:clamp(parsed.axis_scores?.glow),precise:clamp(parsed.axis_scores?.precise),variable:clamp(parsed.axis_scores?.variable)};
    const fits=BEAUTY_CODES.map(code=>{ const score=scoreForCode(code,a); return {beauty_code:code,raw_fit_score:score,fit_score:score}; });
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
    const isMalformed=error instanceof SyntaxError || (error instanceof Error && /JSON|완전하지|4축/i.test(error.message));
    const message=isTimeout?"상품 분석 서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.":isMalformed?"상품 분석 결과를 완성하지 못했습니다. 다시 한 번 시도해 주세요.":error instanceof Error?error.message:"적합도 분석에 실패했습니다.";
    console.error("Single-call product fit failed",error);
    return NextResponse.json({ok:false,code:isTimeout?"PRODUCT_FIT_TIMEOUT":isMalformed?"PRODUCT_FIT_INCOMPLETE":"PRODUCT_FIT_FAILED",message,timings:{totalMs:Date.now()-startedAll}},{status:isTimeout?504:500});
  }
}
