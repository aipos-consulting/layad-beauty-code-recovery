"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Row = { brand:string; product_name:string; category:string; product_url:string };
type Result = { index:number; name:string; id?:string; status:string; message:string; fit_count?:number; product_url?:string|null };
type ApiResponse = { ok:boolean; total?:number; queued?:number; completed?:number; failed?:number; results?:Result[]; message?:string };

const emptyRow=():Row=>({brand:"",product_name:"",category:"",product_url:""});

export default function ProductBatchImportPage(){
  const [rows,setRows]=useState<Row[]>([emptyRow()]);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");
  const [response,setResponse]=useState<ApiResponse|null>(null);
  const entered=useMemo(()=>rows.filter(r=>r.product_name.trim()).length,[rows]);

  function update(index:number,key:keyof Row,value:string){setRows(prev=>prev.map((r,i)=>i===index?{...r,[key]:value}:r));setResponse(null);}
  function addRow(){if(rows.length>=100)return;setRows(prev=>[...prev,emptyRow()]);}
  function removeRow(index:number){setRows(prev=>prev.length===1?[emptyRow()]:prev.filter((_,i)=>i!==index));setResponse(null);}
  function clearAll(){setRows([emptyRow()]);setResponse(null);setStatus("");}

  async function run(){
    const items=rows.filter(r=>r.product_name.trim());
    if(!items.length){setStatus("상품명을 1개 이상 입력해 주세요.");return;}
    setBusy(true);setStatus("등록 상품 확인 중...");setResponse(null);
    try{
      const res=await fetch("/api/admin/product-batch-register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items})});
      const payload=await res.json() as ApiResponse;setResponse(payload);
      setStatus(`분석 대기 ${payload.queued??0}개 · 이미 생성 ${payload.completed??0}개 · 오류 ${payload.failed??0}개`);
    }catch(e){setStatus(e instanceof Error?e.message:"처리 중 오류가 발생했습니다.");}
    finally{setBusy(false);}
  }

  return <main className="min-h-screen bg-[#fbf7f7] p-4 md:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[.16em] text-[#a94f65]">OWNER PRODUCT FACTORY</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#382d2d]">상품 일괄 분석</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[#74676a]">상품명은 반드시 상품명 칸에 입력하고, 스마트스토어·공식몰 주소는 상품 링크 칸에 별도로 입력하세요. 1개부터 최대 100개까지 등록할 수 있으며 신규 상품은 ChatGPT 분석 대기 상태로 등록됩니다.</p>
        </div>
        <Link href="/admin/analysis-data" className="rounded-xl border border-[#d9c9cd] bg-white px-4 py-3 text-sm font-semibold text-[#7e4b58] hover:bg-[#fff7f8]">완료 데이터 조회</Link>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[{k:"현재 입력",v:`${entered} / 100`},{k:"실행 조건",v:"상품명 1개 이상"},{k:"상품 링크",v:"스마트스토어·공식몰"},{k:"분석 방식",v:"ChatGPT 사전분석"}].map(x=><div key={x.k} className="rounded-2xl border border-[#eadfe1] bg-white p-5"><p className="text-xs font-semibold text-[#9b8d90]">{x.k}</p><p className="mt-2 text-lg font-semibold text-[#46383b]">{x.v}</p></div>)}
      </section>

      <section className="rounded-2xl border border-[#eadfe1] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-lg font-semibold">상품 등록 목록</h2><p className="mt-1 text-sm text-[#817477]">상품명은 필수입니다. 링크는 naver.me 단축주소를 포함한 http/https 주소를 입력할 수 있습니다.</p></div>
          <div className="flex gap-3"><button onClick={addRow} disabled={rows.length>=100} className="rounded-xl border border-[#d9c9cd] px-4 py-2.5 text-sm font-semibold disabled:opacity-40">+ 상품 추가</button><button onClick={clearAll} className="px-2 text-sm font-semibold text-[#9a6672]">전체 지우기</button></div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead><tr className="border-b border-[#eadfe1] text-xs text-[#988b8e]"><th className="w-14 px-3 py-3">No.</th><th className="px-3 py-3">브랜드</th><th className="px-3 py-3">상품명 *</th><th className="px-3 py-3">카테고리</th><th className="min-w-[300px] px-3 py-3">상품 링크</th><th className="w-20 px-3 py-3"></th></tr></thead>
            <tbody>{rows.map((row,i)=><tr key={i} className="border-b border-[#f1e8ea]"><td className="px-3 py-3 text-[#988b8e]">{i+1}</td><td className="px-3 py-2"><input value={row.brand} onChange={e=>update(i,"brand",e.target.value)} placeholder="예: 레이아드" className="w-full rounded-xl border border-[#e2d7d9] px-3 py-2.5 outline-none focus:border-[#b86b7d]"/></td><td className="px-3 py-2"><input value={row.product_name} onChange={e=>update(i,"product_name",e.target.value)} placeholder="예: 글로우 레이어링 크림" className="w-full rounded-xl border border-[#e2d7d9] px-3 py-2.5 outline-none focus:border-[#b86b7d]"/></td><td className="px-3 py-2"><input value={row.category} onChange={e=>update(i,"category",e.target.value)} placeholder="예: 프라이머" className="w-full rounded-xl border border-[#e2d7d9] px-3 py-2.5 outline-none focus:border-[#b86b7d]"/></td><td className="px-3 py-2"><input value={row.product_url} onChange={e=>update(i,"product_url",e.target.value)} placeholder="https://naver.me/..." inputMode="url" className="w-full rounded-xl border border-[#e2d7d9] px-3 py-2.5 outline-none focus:border-[#b86b7d]"/></td><td className="px-3 py-2"><button onClick={()=>removeRow(i)} className="text-xs font-semibold text-[#9a6672]">삭제</button></td></tr>)}</tbody>
          </table>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button disabled={busy||entered===0} onClick={run} className="rounded-xl bg-[#a94f65] px-6 py-3 text-sm font-semibold text-white disabled:opacity-40">등록 상품 실행</button>
          {status&&<span className="text-sm font-medium text-[#65585b]">{status}</span>}
        </div>
      </section>

      {response?.results&&<section className="rounded-2xl border border-[#eadfe1] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><h2 className="text-lg font-semibold">실행 결과</h2><p className="text-sm text-[#817477]">분석 대기 {response.queued??0} · 이미 생성 {response.completed??0} · 오류 {response.failed??0}</p></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead><tr className="border-b border-[#eadfe1] text-xs text-[#988b8e]"><th className="px-3 py-3">No.</th><th className="px-3 py-3">상품</th><th className="px-3 py-3">상태</th><th className="px-3 py-3">상품 링크</th><th className="px-3 py-3">비고</th></tr></thead><tbody>{response.results.map(r=>{const label=r.status==="completed"?"이미 생성된 상품":r.status==="queued"?"ChatGPT 분석 대기":r.status==="duplicate_input"?"입력 중복":"오류";const cls=r.status==="completed"?"bg-[#f3f0ff] text-[#6756a3]":r.status==="queued"?"bg-[#fff5df] text-[#8a671f]":"bg-[#fff0f0] text-[#a54b4b]";return <tr key={`${r.index}-${r.name}`} className="border-b border-[#f1e8ea]"><td className="px-3 py-3">{r.index+1}</td><td className="px-3 py-3 font-medium">{r.name||"-"}</td><td className="px-3 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{label}</span></td><td className="px-3 py-3">{r.product_url?<a href={r.product_url} target="_blank" rel="noreferrer" className="font-semibold text-[#a94f65]">링크 열기</a>:"-"}</td><td className="px-3 py-3 text-[#817477]">{r.status==="completed"?"16개 Beauty Code 분석 완료":r.message}</td></tr>})}</tbody></table></div>
      </section>}

      <section className="rounded-2xl border border-[#eadfe1] bg-[#fff8f9] p-5 text-sm leading-6 text-[#65585b]"><p className="font-semibold text-[#8f4c5c]">운영 흐름</p><p className="mt-2">상품명 + 상품 링크 등록 → 중복 자동 확인 → ChatGPT 분석 대기 → 링크·공개 리뷰 근거 확인 → 리뷰 Evidence·키워드·4축·16유형 적재 → 분석 데이터 조회에서 완료 확인</p></section>
    </div>
  </main>;
}
