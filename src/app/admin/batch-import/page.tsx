"use client";

import { useMemo, useRef, useState } from "react";

const MASTER_PROMPT = `당신은 LAYAD BEAUTY CODE의 상품 사전분석 담당자입니다.\n\n목표: 공개적으로 확인 가능한 화장품 리뷰 Evidence를 바탕으로 상품별 리뷰 키워드, OD/GM/PC/VE 4축 프로필, 16개 Beauty Code 적합도 점수를 생성합니다.\n\n규칙:\n1. 제조사 마케팅 문구가 아니라 공개 리뷰/커머스/커뮤니티 출처를 우선합니다.\n2. 확인할 수 없는 사실은 추정하지 않습니다.\n3. 상품당 최소 5개 리뷰 Evidence를 사용합니다.\n4. 리뷰별로 keyword, axis(OD/GM/PC/VE), code(O/D/G/M/P/C/V/E), sentiment, intensity(0~1), confidence(0~1), context, evidence_excerpt를 생성합니다.\n5. axis_profiles는 정확히 OD/GM/PC/VE 4개를 생성합니다.\n6. type_fits는 OGPV, OGPE, OGCV, OGCE, OMPV, OMPE, OMCV, OMCE, DGPV, DGPE, DGCV, DGCE, DMPV, DMPE, DMCV, DMCE 16개를 모두 0~100 정수로 생성합니다.\n7. 기존 LAYAD 공식 키워드와 동일하지 않은 표현은 keyword_candidates에 넣습니다.\n8. 출력은 설명 없이 상품 1개당 JSON 1줄(JSONL)만 출력합니다.\n\nJSON 구조:\n{\"product\":{\"canonical_name\":\"\",\"brand\":\"\",\"category\":\"\",\"product_url\":null},\"reviews\":[{\"source_label\":\"\",\"source_url\":\"https://...\",\"language_code\":\"ko\",\"review_text\":\"\",\"features\":[{\"keyword\":\"\",\"axis\":\"OD\",\"code\":\"O\",\"sentiment\":\"positive\",\"intensity\":0.8,\"confidence\":0.9,\"context\":\"\",\"evidence_excerpt\":\"\"}]}],\"axis_profiles\":[{\"axis\":\"OD\",\"first_code\":\"O\",\"first_score\":60,\"second_code\":\"D\",\"second_score\":40,\"review_count\":8,\"confidence\":0.8}],\"type_fits\":{\"OGPV\":80,\"OGPE\":78,\"OGCV\":75,\"OGCE\":77,\"OMPV\":74,\"OMPE\":73,\"OMCV\":70,\"OMCE\":72,\"DGPV\":68,\"DGPE\":70,\"DGCV\":66,\"DGCE\":69,\"DMPV\":64,\"DMPE\":65,\"DMCV\":62,\"DMCE\":63},\"keyword_candidates\":[{\"keyword\":\"\",\"language_code\":\"ko\",\"axis\":\"VE\",\"code\":\"E\",\"weight\":0.8,\"confidence\":0.9,\"occurrence_count\":1,\"sample_context\":\"\"}]}`;

type ValidationRow = { index:number; name:string; errors:string[]; duplicate?:boolean; duplicateReason?:"existing"|"input" };
type ResultRow = {index:number;name:string;ok:boolean;reviewCount?:number;featureCount?:number;candidateCount?:number;error?:string;status?:string;skipped?:boolean};
type ApiResponse = { ok:boolean; valid?:number; invalid?:number; duplicates?:number; validation?:ValidationRow[]; total?:number; completed?:number; failed?:number; results?:ResultRow[]; message?:string };

function parseJsonl(text:string){
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(lines.length>100) throw new Error("최대 100개 상품까지만 한 번에 처리할 수 있습니다.");
  return lines.map((line,i)=>{ try{return JSON.parse(line);}catch{throw new Error(`${i+1}번째 줄 JSON 형식이 올바르지 않습니다.`);} });
}

export default function ProductBatchImportPage(){
  const [jsonl,setJsonl]=useState("");
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState<string>("");
  const [response,setResponse]=useState<ApiResponse|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const count=useMemo(()=>jsonl.split(/\r?\n/).filter(x=>x.trim()).length,[jsonl]);

  async function call(validateOnly:boolean){
    setBusy(true); setStatus(validateOnly?"중복 및 데이터 검증 중...":"등록된 상품 실행 중..."); setResponse(null);
    try{
      const items=parseJsonl(jsonl);
      if(!items.length) throw new Error("JSONL 데이터를 입력해 주세요.");
      const res=await fetch("/api/admin/product-batch-import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items,validateOnly})});
      const payload=await res.json() as ApiResponse; setResponse(payload);
      if(validateOnly){
        setStatus(`실행 가능 ${payload.valid??0}개 · 이미 생성 ${payload.duplicates??0}개 · 오류 ${payload.invalid??0}개`);
      }else{
        setStatus(`실행 완료 ${payload.completed??0}개 · 이미 생성 ${payload.duplicates??0}개 · 실패 ${payload.failed??0}개`);
      }
    }catch(e){ setStatus(e instanceof Error?e.message:"처리 중 오류가 발생했습니다."); }
    finally{setBusy(false);}
  }

  async function onFile(file?:File){ if(!file)return; const text=await file.text(); setJsonl(text); setStatus(`${file.name} 불러오기 완료`); setResponse(null); }
  async function copyPrompt(){ await navigator.clipboard.writeText(MASTER_PROMPT); setStatus("ChatGPT 분석용 표준 Prompt를 복사했습니다."); }

  return <main className="min-h-screen bg-[#fbf7f7] p-4 md:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[.16em] text-[#a94f65]">OWNER DATA FACTORY</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#382d2d]">상품 일괄 분석 등록</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#74676a]">OpenAI API를 호출하지 않습니다. ChatGPT에서 사전 분석한 1~100개 상품을 등록하고, 실행 버튼을 누르면 현재 입력된 신규 상품만 Supabase에 적재합니다. 이미 생성된 상품은 자동으로 제외합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={copyPrompt} className="rounded-xl border border-[#d9c9cd] bg-white px-4 py-3 text-sm font-semibold text-[#7e4b58] hover:bg-[#fff7f8]">ChatGPT 분석 Prompt 복사</button>
          <button onClick={()=>fileRef.current?.click()} className="rounded-xl border border-[#d9c9cd] bg-white px-4 py-3 text-sm font-semibold text-[#65585b] hover:bg-[#fff7f8]">JSONL 파일 불러오기</button>
          <input ref={fileRef} type="file" accept=".jsonl,.txt,.json" className="hidden" onChange={e=>onFile(e.target.files?.[0])}/>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[{k:"현재 등록",v:`${count} / 100`},{k:"실행 조건",v:"1개 이상이면 실행"},{k:"중복 처리",v:"이미 생성 표시 · 자동 제외"},{k:"Keyword",v:"Master 대조 + Candidate"}].map(x=><div key={x.k} className="rounded-2xl border border-[#eadfe1] bg-white p-5"><p className="text-xs font-semibold text-[#9b8d90]">{x.k}</p><p className="mt-2 text-lg font-semibold text-[#46383b]">{x.v}</p></div>)}
      </section>

      <section className="rounded-2xl border border-[#eadfe1] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-lg font-semibold">1. ChatGPT 분석 결과 입력</h2><p className="mt-1 text-sm text-[#817477]">상품 1개 = JSON 1줄입니다. 100개를 채울 필요 없이 현재 입력된 상품만 실행할 수 있습니다.</p></div>
          <button onClick={()=>{setJsonl("");setResponse(null);setStatus("");}} className="text-sm font-semibold text-[#9a6672]">전체 지우기</button>
        </div>
        <textarea value={jsonl} onChange={e=>{setJsonl(e.target.value);setResponse(null);}} placeholder={'{"product":{"canonical_name":"정샘물 에센셜 스킨 누더 쿠션",...},...}\n{"product":{"canonical_name":"두 번째 상품",...},...}'} className="mt-4 min-h-[360px] w-full rounded-2xl border border-[#e2d7d9] bg-[#fffdfd] p-4 font-mono text-xs leading-5 outline-none focus:border-[#b86b7d]"/>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button disabled={busy||count===0} onClick={()=>call(true)} className="rounded-xl border border-[#cfaeb6] bg-white px-5 py-3 text-sm font-semibold text-[#9f5265] disabled:opacity-40">2. 중복·데이터 확인</button>
          <button disabled={busy||count===0} onClick={()=>call(false)} className="rounded-xl bg-[#a94f65] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">3. 등록된 상품 실행</button>
          {status&&<span className="text-sm font-medium text-[#65585b]">{status}</span>}
        </div>
      </section>

      {response?.validation&&<section className="rounded-2xl border border-[#eadfe1] bg-white p-5 md:p-6">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">검증 결과</h2><p className="text-sm text-[#817477]">실행 가능 {response.valid??0} · 이미 생성 {response.duplicates??0} · 오류 {response.invalid??0}</p></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-[#eadfe1] text-xs text-[#988b8e]"><th className="px-3 py-3">No.</th><th className="px-3 py-3">상품</th><th className="px-3 py-3">상태</th><th className="px-3 py-3">비고</th></tr></thead><tbody>{response.validation.map(row=>{
          const label=row.duplicate?"이미 생성된 상품":row.errors.length?"수정 필요":"실행 가능";
          const cls=row.duplicate?"bg-[#f3f0ff] text-[#6756a3]":row.errors.length?"bg-[#fff0f0] text-[#a54b4b]":"bg-[#edf7f0] text-[#39714a]";
          return <tr key={row.index} className="border-b border-[#f1e8ea]"><td className="px-3 py-3">{row.index+1}</td><td className="px-3 py-3 font-medium">{row.name}</td><td className="px-3 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{label}</span></td><td className="px-3 py-3 text-[#8c6068]">{row.duplicate?(row.duplicateReason==="input"?"현재 입력 목록에 중복됨":"DB에 이미 생성되어 있음"):(row.errors.join(" · ")||"-")}</td></tr>})}</tbody></table></div>
      </section>}

      {response?.results&&<section className="rounded-2xl border border-[#eadfe1] bg-white p-5 md:p-6">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">실행 결과</h2><p className="text-sm text-[#817477]">완료 {response.completed??0} · 이미 생성 {response.duplicates??0} · 실패 {response.failed??0}</p></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-[#eadfe1] text-xs text-[#988b8e]"><th className="px-3 py-3">상품</th><th className="px-3 py-3">상태</th><th className="px-3 py-3">리뷰</th><th className="px-3 py-3">리뷰 키워드</th><th className="px-3 py-3">신규 Candidate</th><th className="px-3 py-3">비고</th></tr></thead><tbody>{response.results.map(row=><tr key={row.index} className="border-b border-[#f1e8ea]"><td className="px-3 py-3 font-medium">{row.name}</td><td className="px-3 py-3">{row.status==="already_exists"?"이미 생성":row.status==="completed"?"완료":"실패"}</td><td className="px-3 py-3">{row.reviewCount??"-"}</td><td className="px-3 py-3">{row.featureCount??"-"}</td><td className="px-3 py-3">{row.candidateCount??"-"}</td><td className="px-3 py-3 text-[#8c6068]">{row.error??"16개 적합도 저장 완료"}</td></tr>)}</tbody></table></div>
      </section>}

      <section className="rounded-2xl border border-[#eadfe1] bg-[#fff8f9] p-5 text-sm leading-6 text-[#65585b]">
        <p className="font-semibold text-[#8f4c5c]">운영 원칙</p>
        <p className="mt-2">100개는 최대 등록 건수일 뿐 필수 수량이 아닙니다. 1개 이상 입력하면 언제든 실행할 수 있으며, DB 또는 현재 입력 목록에서 중복된 상품은 “이미 생성된 상품”으로 표시하고 다시 저장하지 않습니다.</p>
      </section>
    </div>
  </main>;
}
