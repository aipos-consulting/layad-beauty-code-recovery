import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const BEAUTY_CODE = /^[OD][GM][PC][VE]$/;
const MODEL = "gpt-5.4-nano";
const ANALYSIS_VERSION = "layad-v12-category-signal-no-neutral-copy";
const BEAUTY_CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;

type TraitScores = { O:number; D:number; G:number; M:number; P:number; C:number; V:number; E:number };
type AiResult = { canonical_name?:string; brand?:string|null; category?:string|null; confidence?:number; evidence_count?:number; scores?:Partial<TraitScores> };
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
  const start=cleaned.indexOf("{"); const end=cleaned.lastIndexOf("}");
  if(start<0||end<=start) throw new Error("OpenAI 분석 JSON이 완전하지 않습니다.");
  const parsed=JSON.parse(cleaned.slice(start,end+1)) as AiResult;
  const s=parsed.scores;
  if(!s || [s.O,s.D,s.G,s.M,s.P,s.C,s.V,s.E].some(v=>!Number.isFinite(Number(v)))) throw new Error("8개 적합성 점수가 완전하지 않습니다.");
  return parsed;
}

function buildPrompt(inputValue:string,fallback=false){
  return `당신은 LAYAD Beauty Code 제품 적합도 AI 분석 담당자입니다. 아래 기준이 유일한 공식 기준입니다. 이전의 다른 LAYAD 제품 적합도 프롬프트, 가중치, 보정값, 예시 점수는 모두 무시하세요.\n\n분석 대상 상품: ${inputValue}\n\n[리뷰 분석 표본]\n- 실제 사용자 리뷰를 가능한 경우 최대 100개까지 검토하세요.\n- 목표 표본은 100개입니다. 공개적으로 확인 가능한 리뷰가 100개보다 적으면 실제 확인 가능한 수만 사용하고 숫자를 부풀리지 마세요.\n- evidence_count에는 실제 분석에 사용한 공개 리뷰/근거의 수를 0~100 정수로 기록하세요.\n- 같은 문구의 중복 리뷰, 광고성 문구, 상품과 무관한 리뷰는 표본에서 제외하세요.\n- O/D에서는 피부 타입을 직접 밝힌 리뷰를 우선하고, G/M·P/C·V/E에서도 반복성과 구체성이 높은 실제 사용 경험을 우선하세요.\n\n[공통 원칙]\n- 제품 상세페이지, 제품 카테고리 및 상품명, 실제 사용자 리뷰를 종합하여 O/D, G/M, P/C, V/E 네 축을 평가합니다.\n- 각 축은 성격이 다르므로 동일한 자료와 동일한 방식으로 평가하지 않습니다.\n- 상품명이나 명백한 제품 카테고리 자체도 해당 카테고리의 역할을 판단하는 근거입니다. 공개 리뷰가 0개라도 상품명에 '프라이머/primer', '컨실러', '픽서'처럼 역할이 명확히 드러나면 P/C 등 직접 관련된 축에는 그 카테고리 신호를 반영하세요. 다만 그 정보만으로 O/D, G/M, V/E까지 추정하지 마세요.\n- 모든 8개 점수를 똑같이 두는 것은 상품명·카테고리·상세페이지·리뷰 어디에서도 차이를 만들 근거가 전혀 없을 때만 허용합니다. 명확한 카테고리 신호가 있는데 전부 같은 점수를 반환하면 안 됩니다.\n- 단순 키워드 빈도가 아니라 제품의 객관적 특성 → 실제 사용 경험 → 해당 Beauty Code와의 적합성 순서로 판단합니다.\n- 확인할 수 없는 사실은 추정하지 않습니다. 근거가 부족한 항목은 중립에 가깝게 두고 confidence를 낮춥니다.\n\n[1. O / D — Skin Type, 가중치 30%]\n핵심: 제품이 지성 피부와 건성 피부에서 각각 얼마나 적합하게 작용하는가. 실제 사용자 리뷰를 가장 중요하게 참고하고, 리뷰어가 피부 타입을 직접 밝힌 리뷰에 높은 신뢰도를 둡니다.\nO 적합: 지성 피부에서 잘 맞음, 유분/번들거림 적음, 피지 무너짐 적음, 지속력, 답답하지 않음, 산뜻함, T존 유지.\nO 부적합: 너무 리치함, 기름짐, 번들거림, 유분과 섞여 무너짐, 무거움, 지성 피부 밀림.\nD 적합: 건성 피부에서 잘 맞음, 촉촉함, 당김/들뜸/각질 부각 적음, 수분 유지, 건조 부위 밀착.\nD 부적합: 건조함, 당김, 빠르게 마름, 각질 부각, 들뜸, 메마름, 건조 부위 갈라짐.\n중요: '매트하다' 자체를 D 부적합으로 판단하지 않습니다. 매트하면서도 건조하지 않으면 D형에 적합할 수 있습니다.\n\n[2. G / M — Finish Preference, 가중치 25%]\n핵심: 실제 메이크업 피니시가 Glowy와 Matte 중 어디에 가까운가. 상세페이지 50% + 사용자 리뷰 50%로 봅니다.\n상세페이지 G 신호: Glow/Glowy, Radiant, Dewy, Luminous, 윤광, 물광, 광채, 촉촉한 피부 표현, 생기, 빛나는 피부.\n상세페이지 M 신호: Matte, Semi-matte, Soft matte, Blur, 보송, 매끈, 벨벳, 모공 커버, 번들거림 조절, 깔끔한 피부 표현.\n상세페이지로 브랜드 의도를 파악한 뒤 리뷰로 실제 피니시를 검증합니다. 둘이 충돌하면 반복적이고 구체적인 리뷰를 반영하여 조정합니다.\n\n[3. P / C — Makeup Style, 가중치 25%]\n핵심: 완성도를 높이기 위한 전문적·세분화된 역할인지, 여러 과정을 줄여 쉽고 간편한 메이크업을 가능하게 하는지 평가합니다. 제품 카테고리와 상품명 자체를 중요한 정보로 활용합니다.\nP에 상대적으로 유리: 프라이머, 모공 프라이머, 글로우 프라이머, 컬러 코렉터, 컨실러, 픽서, 메이크업 베이스, 부분용 베이스, 세팅 파우더처럼 한 단계를 추가하거나 특정 결과를 정교하게 개선하는 제품. 단 카테고리만으로 P를 확정하지 않습니다.\nC에 상대적으로 유리: 톤업 선크림, 선케어+베이스 겸용, 쿠션 파운데이션, 멀티밤, 올인원 베이스, 스킨케어 결합 베이스, 별도 도구 없이 간편한 제품. 2 in 1, Multi, All-in-one, One step, Quick, Easy 등의 표현을 참고합니다.\nP 추가 신호: 양 조절에 따라 결과 변화, 레이어링, 부위별 사용, 다른 제품과 조합 시 완성도 향상, 도구/사용법에 따른 다양한 표현, 특정 문제의 정교한 보완.\nC 추가 신호: 대충 발라도 잘 됨, 손으로 가능, 바쁜 아침, 하나만 발라도 충분, 쉬움, 빠름, 초보자 적합, 여러 단계 생략.\n중요: P/C는 우열이 아니라 메이크업 과정에서의 역할과 효율 차이입니다.\n\n[4. V / E — Makeup Variability, 가중치 20%]\n핵심: V/E는 다른 세 축보다 제품 선택을 크게 좌우하지 않습니다. E를 기본값으로 두고, 제품·계절·환경 변화에 유연하게 대응할 수 있는지와 전체 리뷰 경향을 종합해 V 적합성을 평가합니다. 민감성/예민함은 메인 분류가 아니라 보조 리뷰 신호입니다.\nE: 기본값. 사용자 경험이 전반적으로 안정적이고 예측 가능하게 모이는지 참고합니다. 비슷한 장점, 한 방향 평가, 환경/피부 상태가 달라도 결과 차이가 작음, 호불호가 극단적이지 않음, 실패가 적다는 반복 표현은 보조 근거입니다. 단 이를 자동 플러스하지 않습니다.\nV 가점: 사용량 조절 용이, 얇은 레이어링/부분 사용, 계절·컨디션별 조절, 건조/습한 환경에서 활용법 조정, 다른 제품과 조합, 피니시/보습감 조절, 다양한 피부 타입/루틴에서 활용, 여러 상황에서 실패 적음, 변화에 예민한 사용자의 긍정 리뷰.\nV 감점: 환경에 따라 결과가 크게 흔들림, 특정 상태에서만 좋음, 허용 사용량 범위가 좁음, 조금만 많아도 밀림/뭉침, 궁합을 심하게 탐, 사용자가 조절할 여지가 거의 없음, 변화에 예민한 사용자의 반복 부정 리뷰.\n매우 중요: V 가점/감점을 E 감점/가점으로 자동 전환하지 않습니다. V와 E는 각각 근거로 평가합니다.\n\n[최종 가중치]\nO/D 30%, G/M 25%, P/C 25%, V/E 20%, 총합 100%.\n\n[점수 출력]\nO,D,G,M,P,C,V,E 각각을 0~100 정수로 평가하세요. 서로 단순한 100점 보수값으로 만들지 마세요. 제품이 양쪽에 모두 적합하거나 모두 약할 수 있습니다. 실제 근거에 따라 상대 차이가 드러나야 합니다.\n${fallback?"현재는 웹검색 없는 대체 분석입니다. 상품명/명백한 카테고리에서 직접 확인되는 역할 신호는 관련 축에만 반영하고, 나머지 불확실한 항목은 45~55 범위에 두세요. confidence는 0.35 이하로 낮추고 실제로 확인하지 못한 리뷰는 evidence_count에 포함하지 마세요.":"웹 검색으로 상품을 정확히 식별하고, 공식 상세페이지와 실제 사용자 리뷰를 최대 100개까지 가능한 범위에서 확인하세요."}\n\n반드시 JSON만 반환하세요. 키 구조는 canonical_name, brand, category, confidence, evidence_count, scores이며 scores에는 O,D,G,M,P,C,V,E의 0~100 정수가 모두 있어야 합니다. 이 문장의 숫자 범위는 출력 예시 점수가 아닙니다.`;
}

async function oneOpenAICall(openai:string,prompt:string,useWeb:boolean,timeoutMs:number){
  const body:Record<string,unknown>={model:MODEL,input:prompt,max_output_tokens:1000};
  if(useWeb) body.tools=[{type:"web_search"}];
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${openai}`,"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(timeoutMs)});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error((payload as {error?:{message?:string}}).error?.message??`OpenAI 호출 실패: ${response.status}`);
  const parsed=parse(outputText(payload));
  return {payload,parsed};
}
async function analyzeWithFallback(openai:string,inputValue:string){
  let primaryError:unknown;
  for(let attempt=0;attempt<2;attempt+=1){
    try{return {...await oneOpenAICall(openai,buildPrompt(inputValue,false),true,attempt===0?16000:12000),mode:"web" as const};}
    catch(error){primaryError=error;if(attempt===0) await new Promise(r=>setTimeout(r,250));}
  }
  console.warn("Primary web analysis failed; using low-confidence fallback",primaryError);
  try{return {...await oneOpenAICall(openai,buildPrompt(inputValue,true),false,7000),mode:"fallback" as const};}
  catch(fallbackError){console.error("Fallback product analysis failed",fallbackError);throw primaryError instanceof Error?primaryError:fallbackError;}
}
function applyClearCategorySignal(inputValue:string,category:string|undefined,s:TraitScores):TraitScores{
  const signal=`${inputValue} ${category??""}`.normalize("NFKC").toLowerCase();
  const next={...s};
  if(/프라이머|primer|컬러\s*코렉터|color\s*corrector|컨실러|concealer|픽서|fixer|세팅\s*파우더|setting\s*powder/.test(signal)){
    if(next.P===next.C || (next.P===50&&next.C===50)){
      next.P=66;
      next.C=44;
    }
  }
  if(/올인원|all[- ]?in[- ]?one|one\s*step|톤업\s*선|tone[- ]?up\s*sunscreen|멀티밤|multi\s*balm/.test(signal)){
    if(next.P===next.C || (next.P===50&&next.C===50)){
      next.P=44;
      next.C=66;
    }
  }
  return next;
}
function scoreForCode(code:string,s:TraitScores){
  const od=code[0]==="O"?s.O:s.D;
  const gm=code[1]==="G"?s.G:s.M;
  const pc=code[2]==="P"?s.P:s.C;
  const ve=code[3]==="V"?s.V:s.E;
  return Math.round(od*0.30+gm*0.25+pc*0.25+ve*0.20);
}

export async function POST(request:NextRequest){
  const startedAll=Date.now();
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY;
  const openai=process.env.OPENAI_API_KEY;
  if(!key||!openai) return NextResponse.json({ok:false,code:!key?"SUPABASE_NOT_CONFIGURED":"OPENAI_NOT_CONFIGURED"},{status:503});
  try{
    const body=await request.json() as {beautyCode?:string;inputValue?:string};
    const beautyCode=body.beautyCode?.trim()??""; let inputValue=body.inputValue?.trim()??"";
    if(!BEAUTY_CODE.test(beautyCode)) return NextResponse.json({ok:false,message:"Beauty Code를 확인해 주세요."},{status:400});
    if(!inputValue||inputValue.length>2000) return NextResponse.json({ok:false,message:"상품명 또는 상품 링크를 확인해 주세요."},{status:400});
    const inputType=/^https?:\/\//i.test(inputValue)?"url":"name"; if(inputType==="url") inputValue=await resolveUrl(inputValue);
    const beginStarted=Date.now();
    const beginResponse=await db("rpc/begin_product_fit_analysis_v2",{method:"POST",body:JSON.stringify({p_input_type:inputType,p_input_value:inputValue,p_normalized_name:normalize(inputValue),p_beauty_code:beautyCode,p_country_code:request.headers.get("x-vercel-ip-country")||null,p_region_code:request.headers.get("x-vercel-ip-country-region")||null,p_device_type:device(request.headers.get("user-agent")??"")})},key);
    const beginMs=Date.now()-beginStarted;
    if(!beginResponse.ok) throw new Error(`상품 준비 실패: ${beginResponse.status} ${(await beginResponse.text()).slice(0,300)}`);
    const row=(await beginResponse.json() as BeginRow[])[0];
    if(!row?.request_id||!row.product_id) throw new Error("상품 준비 결과가 올바르지 않습니다.");
    if(row.request_status==="completed"&&row.cached_fit_score!=null) return NextResponse.json({ok:true,status:"completed",cached:true,requestId:row.request_id,sessionId:row.session_id,productName:row.product_name||inputValue,beautyCode,fitScore:Math.round(Number(row.cached_fit_score)),confidence:Number(row.cached_confidence??0),reviewCount:Number(row.cached_review_count??0),timings:{beginMs,openAiMs:0,finalizeMs:0,totalMs:Date.now()-startedAll}});
    if(row.ai_mode==="off") return NextResponse.json({ok:false,code:"AI_MODE_OFF",message:"실시간 분석이 현재 중지되어 있습니다."},{status:503});
    const aiStarted=Date.now();
    const {payload:aiPayload,parsed,mode}=await analyzeWithFallback(openai,inputValue);
    const openAiMs=Date.now()-aiStarted;
    const confidence=Math.max(0,Math.min(mode==="fallback"?0.35:1,Number(parsed.confidence??0)));
    const evidence=Math.max(0,Math.min(100,Math.round(Number(parsed.evidence_count??0))));
    const rawScores:TraitScores={O:clamp(parsed.scores?.O),D:clamp(parsed.scores?.D),G:clamp(parsed.scores?.G),M:clamp(parsed.scores?.M),P:clamp(parsed.scores?.P),C:clamp(parsed.scores?.C),V:clamp(parsed.scores?.V),E:clamp(parsed.scores?.E)};
    const s=applyClearCategorySignal(inputValue,parsed.category??undefined,rawScores);
    const fits=BEAUTY_CODES.map(code=>{const score=scoreForCode(code,s);return {beauty_code:code,raw_fit_score:score,fit_score:score};});
    const axes=[
      {axis:"OD",first_code:"O",first_score:s.O,second_code:"D",second_score:s.D},
      {axis:"GM",first_code:"G",first_score:s.G,second_code:"M",second_score:s.M},
      {axis:"PC",first_code:"P",first_score:s.P,second_code:"C",second_score:s.C},
      {axis:"VE",first_code:"V",first_score:s.V,second_code:"E",second_score:s.E},
    ];
    const myFit=fits.find(f=>f.beauty_code===beautyCode)!;
    const usage=aiPayload as {usage?:{input_tokens?:number;output_tokens?:number}}; const canonical=parsed.canonical_name?.trim()||inputValue;
    const finalizeStarted=Date.now();
    const finalize=await db("rpc/finalize_product_fit_analysis_v3",{method:"POST",body:JSON.stringify({p_request_id:row.request_id,p_product_id:row.product_id,p_input_type:inputType,p_canonical_name:canonical,p_brand:parsed.brand?.trim()||"",p_category:parsed.category?.trim()||"",p_confidence:confidence,p_evidence_count:evidence,p_analysis_version:`${ANALYSIS_VERSION}${mode==="fallback"?"-low-confidence":""}`,p_model_name:MODEL,p_input_tokens:Number(usage.usage?.input_tokens??0),p_output_tokens:Number(usage.usage?.output_tokens??0),p_started_at:new Date(aiStarted).toISOString(),p_fits:fits,p_axes:axes})},key);
    const finalizeMs=Date.now()-finalizeStarted;
    if(!finalize.ok) throw new Error(`분석 결과 저장 실패: ${finalize.status} ${(await finalize.text()).slice(0,300)}`);
    return NextResponse.json({ok:true,status:"completed",cached:false,analysisMode:mode,requestId:row.request_id,sessionId:row.session_id,productName:canonical,beautyCode,fitScore:myFit.fit_score,confidence,reviewCount:evidence,timings:{beginMs,openAiMs,finalizeMs,totalMs:Date.now()-startedAll}});
  }catch(error){
    const isTimeout=error instanceof Error&&(error.name==="TimeoutError"||/timeout|timed out|시간.*초과/i.test(error.message));
    const isMalformed=error instanceof SyntaxError||(error instanceof Error&&/JSON|완전하지|8개/i.test(error.message));
    const message=isTimeout?"상품 분석 서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.":isMalformed?"상품 분석 결과를 완성하지 못했습니다. 다시 한 번 시도해 주세요.":error instanceof Error?error.message:"적합도 분석에 실패했습니다.";
    console.error("Single-call product fit failed",error);
    return NextResponse.json({ok:false,code:isTimeout?"PRODUCT_FIT_TIMEOUT":isMalformed?"PRODUCT_FIT_INCOMPLETE":"PRODUCT_FIT_FAILED",message,timings:{totalMs:Date.now()-startedAll}},{status:isTimeout?504:500});
  }
}
