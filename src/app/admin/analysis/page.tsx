"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const CODES=["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;
type Code=typeof CODES[number];
type Pending={key:string;requestId:string;productId:string|null;name:string;brand:string|null;category:string|null;productUrl:string|null;inputType:"name"|"url";inputValue:string;requestCount:number;uniqueSessions:number;fitCount:number;firstRequestedAt:string;lastRequestedAt:string;statusCounts:Record<string,number>};
type QueueResponse={ok:boolean;total?:number;pending?:Pending[];message?:string};
type ParsedResult={summary?:string;scores?:Record<string,number>};

function fmt(value:string){try{return new Intl.DateTimeFormat("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}catch{return value;}}
function emptyScores(){return Object.fromEntries(CODES.map(code=>[code,50])) as Record<Code,number>;}
function buildPrompt(item:Pending,canonicalName:string){
  const target=canonicalName.trim()||item.name||item.inputValue;
  const link=item.productUrl?`\n상품 링크: ${item.productUrl}`:"";
  return `당신은 LAYAD BEAUTY CODE의 화장품 상품 적합도 분석 담당자입니다.\n\n분석 대상 상품: ${target}${link}\n\nBeauty Code 공식 축 정의\n- O/D\n- G/M\n- P = Perfection focused: 완성도 중심\n- C = Convenient focused: 편의성 중심\n- V = Variable: 제품·환경에 따라 결과가 달라짐\n- E = Even: 비교적 일정하고 안정적인 결과\n\n공개적으로 확인 가능한 상품 정보만 사용하고, 확인할 수 없는 사실은 추정하지 마세요. 상품 특성에 근거해 16개 유형 각각의 적합도를 0~100 정수로 평가하세요. 유형별 상대 차이가 드러나도록 일관된 기준을 적용하세요. 모든 점수를 0으로 두거나 동일한 점수로 채우지 마세요.\n\n응답은 설명이나 코드펜스 없이 아래 JSON 형식만 출력하세요. 모든 코드를 포함하세요.\n{\n  \"summary\": \"상품 특성과 적합도 판단 근거를 3~5문장으로 요약\",\n  \"scores\": {\n    \"OGPV\": 0, \"OGPE\": 0, \"OGCV\": 0, \"OGCE\": 0,\n    \"OMPV\": 0, \"OMPE\": 0, \"OMCV\": 0, \"OMCE\": 0,\n    \"DGPV\": 0, \"DGPE\": 0, \"DGCV\": 0, \"DGCE\": 0,\n    \"DMPV\": 0, \"DMPE\": 0, \"DMCV\": 0, \"DMCE\": 0\n  }\n}`;
}
function parseJson(raw:string):ParsedResult{
  const cleaned=raw.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"");
  const parsed=JSON.parse(cleaned) as ParsedResult;
  const source=parsed.scores??(parsed as unknown as Record<string,number>);
  for(const code of CODES){const value=Number(source[code]);if(!Number.isInteger(value)||value<0||value>100)throw new Error(`${code} 점수가 0~100 정수가 아닙니다.`);}
  return {summary:parsed.summary??"",scores:Object.fromEntries(CODES.map(code=>[code,Number(source[code])]))};
}

export default function Page(){
  const [data,setData]=useState<QueueResponse|null>(null);
  const [selectedKey,setSelectedKey]=useState("");
  const [canonicalName,setCanonicalName]=useState("");
  const [jsonText,setJsonText]=useState("");
  const [summary,setSummary]=useState("");
  const [scores,setScores]=useState<Record<Code,number>>(emptyScores());
  const [notice,setNotice]=useState("");
  const [saving,setSaving]=useState(false);

  async function load(){
    const response=await fetch("/api/admin/manual-analysis-workbench",{cache:"no-store"});
    const payload=await response.json() as QueueResponse;
    setData(payload);
    if(payload.ok&&payload.pending?.length){setSelectedKey(current=>current&&payload.pending?.some(item=>item.key===current)?current:payload.pending![0].key);}
  }
  useEffect(()=>{load().catch(()=>setData({ok:false,message:"분석 대기 목록을 불러오지 못했습니다."}));},[]);
  const selected=useMemo(()=>data?.pending?.find(item=>item.key===selectedKey)??null,[data,selectedKey]);
  useEffect(()=>{if(!selected)return;setCanonicalName(selected.name==="상품명 확인 필요"?"":selected.name);setJsonText("");setSummary("");setScores(emptyScores());setNotice("");},[selectedKey]);
  const prompt=selected?buildPrompt(selected,canonicalName):"";

  async function copyPrompt(){
    try{await navigator.clipboard.writeText(prompt);setNotice("분석 프롬프트를 복사했습니다. ChatGPT에 붙여넣어 분석해 주세요.");}
    catch{setNotice("복사하지 못했습니다. 아래 프롬프트를 직접 선택해 복사해 주세요.");}
  }
  function applyJson(){
    try{const parsed=parseJson(jsonText);setSummary(parsed.summary??"");setScores(parsed.scores as Record<Code,number>);setNotice("JSON을 읽어 16유형 점수를 채웠습니다. 검토 후 승인해 주세요.");}
    catch(error){setNotice(error instanceof Error?error.message:"JSON 형식을 확인해 주세요.");}
  }
  async function approve(){
    if(!selected)return;
    if(CODES.some(code=>!Number.isInteger(scores[code])||scores[code]<0||scores[code]>100)){setNotice("16유형 점수를 모두 0~100 정수로 입력해 주세요.");return;}
    if(!confirm(`${canonicalName||selected.name} 분석 결과를 승인하고 공개하시겠습니까?`))return;
    setSaving(true);setNotice("승인 결과를 저장 중입니다...");
    try{
      const response=await fetch("/api/admin/fit-result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:selected.requestId,scores,summary,canonicalName:canonicalName.trim()||undefined,brand:selected.brand??undefined,category:selected.category??undefined})});
      const payload=await response.json() as {ok:boolean;message?:string;code?:string};
      if(!response.ok||!payload.ok)throw new Error(payload.message??payload.code??"저장에 실패했습니다.");
      setNotice("승인 및 공개가 완료되었습니다.");
      await load();
    }catch(error){setNotice(error instanceof Error?error.message:"저장 중 오류가 발생했습니다.");}
    finally{setSaving(false);}
  }

  return <main className="min-h-screen bg-[#f7f4f4] p-4 text-[#382d2d] sm:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold tracking-[.18em] text-[#b97b88]">LAYAD ADMIN</p><h1 className="mt-2 text-3xl font-semibold">수동 분석 워크벤치</h1><p className="mt-3 text-sm text-[#7b6d70]">대기 상품은 자동으로 불러옵니다. OpenAI API를 호출하지 않고 ChatGPT에서 분석한 JSON을 붙여넣어 검토·승인합니다.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin" className="rounded-xl border border-[#d9c9cd] bg-white px-4 py-3 text-sm font-semibold">대시보드</Link><Link href="/admin/analysis-data" className="rounded-xl bg-[#382d2d] px-4 py-3 text-sm font-semibold text-white">완료 데이터 조회</Link></div></header>

    {!data?.ok&&data?<div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{data.message??"대기 목록을 불러오지 못했습니다."}</div>:null}
    <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[#eadfe1] bg-white p-5"><p className="text-xs text-[#918488]">분석 대기 상품</p><p className="mt-2 text-3xl font-semibold">{data?.total??0}</p></div><div className="rounded-2xl border border-[#eadfe1] bg-white p-5"><p className="text-xs text-[#918488]">분석 방식</p><p className="mt-2 font-semibold">ChatGPT 수동 분석</p></div><div className="rounded-2xl border border-[#eadfe1] bg-white p-5"><p className="text-xs text-[#918488]">OpenAI API</p><p className="mt-2 font-semibold">사용 안 함</p></div></section>

    {(data?.pending?.length??0)>0?<section className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <aside className="rounded-3xl border border-[#eadfe1] bg-white p-4 shadow-sm"><div className="flex items-center justify-between px-2"><h2 className="font-semibold">대기 상품</h2><span className="rounded-full bg-[#fff0f2] px-3 py-1 text-xs font-semibold text-[#b76778]">오래된 신청순</span></div><div className="mt-4 max-h-[720px] space-y-2 overflow-y-auto">{data?.pending?.map(item=><button key={item.key} onClick={()=>setSelectedKey(item.key)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedKey===item.key?"border-[#c86f81] bg-[#fff7f8]":"border-[#eee5e7] bg-white hover:bg-[#fffafa]"}`}><div className="flex items-start justify-between gap-3"><p className="font-semibold break-words">{item.name}</p><span className="shrink-0 rounded-full bg-[#fff3de] px-2 py-1 text-xs font-semibold text-[#8a671f]">{item.fitCount}/16</span></div><p className="mt-2 text-xs text-[#817477]">신청 {item.requestCount}건 · 세션 {item.uniqueSessions}개</p><p className="mt-1 text-xs text-[#a09194]">최초 {fmt(item.firstRequestedAt)}</p></button>)}</div></aside>

      {selected?<div className="space-y-6">
        <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#b97b88]">STEP 1 · 상품 확인</p><label className="mt-3 block text-sm font-semibold">분석 상품명</label><input value={canonicalName} onChange={e=>setCanonicalName(e.target.value)} placeholder="정확한 상품명을 입력하세요" className="mt-2 w-full rounded-xl border border-[#dfd1d4] px-4 py-3 outline-none focus:border-[#b76778]"/><p className="mt-2 text-xs text-[#817477]">브랜드 {selected.brand??"-"} · 카테고리 {selected.category??"-"} · 신청 {selected.requestCount}건</p>{selected.productUrl?<a href={selected.productUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#a94f65] underline">상품 링크 확인</a>:null}</div><div className="rounded-2xl bg-[#fffafa] p-4 text-sm"><p className="text-xs text-[#918488]">현재 적합도</p><p className="mt-1 text-xl font-semibold">{selected.fitCount}/16</p></div></div></section>

        <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><p className="text-xs font-semibold text-[#b97b88]">STEP 2 · ChatGPT 분석</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={copyPrompt} className="rounded-xl bg-[#a94f65] px-5 py-3 text-sm font-semibold text-white">분석 프롬프트 복사</button><a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="rounded-xl border border-[#d9c9cd] bg-white px-5 py-3 text-sm font-semibold">ChatGPT 열기</a></div><textarea readOnly value={prompt} className="mt-4 h-56 w-full rounded-2xl border border-[#e2d7d9] bg-[#fffafa] p-4 text-xs leading-5 text-[#65585b]"/></section>

        <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><p className="text-xs font-semibold text-[#b97b88]">STEP 3 · 결과 붙여넣기</p><textarea value={jsonText} onChange={e=>setJsonText(e.target.value)} placeholder='ChatGPT가 출력한 {"summary":"...","scores":{...}} JSON을 그대로 붙여넣으세요.' className="mt-4 h-44 w-full rounded-2xl border border-[#e2d7d9] p-4 font-mono text-xs leading-5 outline-none focus:border-[#b76778]"/><button onClick={applyJson} disabled={!jsonText.trim()} className="mt-3 rounded-xl border border-[#d88c9c] px-5 py-3 text-sm font-semibold text-[#b76778] disabled:opacity-40">JSON 적용</button></section>

        <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-[#b97b88]">STEP 4 · 검토 및 승인</p><span className="rounded-full bg-[#edf7f0] px-3 py-1 text-xs font-semibold text-[#39714a]">운영자 최종 검토</span></div><label className="mt-4 block text-sm font-semibold">분석 요약</label><textarea value={summary} onChange={e=>setSummary(e.target.value)} className="mt-2 h-28 w-full rounded-xl border border-[#e2d7d9] p-3 text-sm leading-6 outline-none focus:border-[#b76778]"/><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{CODES.map(code=><label key={code} className="rounded-2xl border border-[#eadfe1] bg-[#fffafa] p-3"><span className="text-sm font-semibold">{code}</span><input type="number" min={0} max={100} step={1} value={scores[code]} onChange={e=>setScores(prev=>({...prev,[code]:Math.max(0,Math.min(100,Math.round(Number(e.target.value)||0)))}))} className="mt-2 w-full rounded-lg border border-[#dfd1d4] bg-white px-3 py-2 text-lg font-semibold"/></label>)}</div>{notice?<p className="mt-5 rounded-xl bg-[#fffafa] p-4 text-sm text-[#65585b]">{notice}</p>:null}<div className="mt-5 flex justify-end"><button onClick={approve} disabled={saving} className="rounded-xl bg-[#382d2d] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?"저장 중...":"승인 및 공개"}</button></div></section>
      </div>:null}
    </section>:data?.ok?<section className="rounded-3xl border border-[#dce9df] bg-[#f6fbf7] p-10 text-center"><p className="text-lg font-semibold text-[#39714a]">현재 분석 대기 상품이 없습니다.</p><p className="mt-2 text-sm text-[#6e8173]">새 상품이 신청되면 이 화면에 자동으로 표시됩니다.</p></section>:null}
  </div></main>;
}
