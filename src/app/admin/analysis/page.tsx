"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Pending={
  key:string;requestId:string;productId:string|null;name:string;brand:string|null;category:string|null;
  productUrl:string|null;inputType:"name"|"url";inputValue:string;requestCount:number;uniqueSessions:number;
  fitCount:number;firstRequestedAt:string;lastRequestedAt:string;statusCounts:Record<string,number>;
};
type QueueResponse={ok:boolean;total?:number;pending?:Pending[];message?:string};
type ReprocessResponse={ok:boolean;status?:string;cached?:boolean;analysisMode?:string;productName?:string;fitCount?:number;confidence?:number;reviewCount?:number;message?:string;code?:string};

function fmt(value:string){
  try{return new Intl.DateTimeFormat("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}
  catch{return value;}
}

export default function Page(){
  const [data,setData]=useState<QueueResponse|null>(null);
  const [selectedKey,setSelectedKey]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    const response=await fetch("/api/admin/pending-analysis",{cache:"no-store"});
    const payload=await response.json() as QueueResponse;
    setData(payload);
    if(payload.ok&&payload.pending?.length){
      setSelectedKey(current=>current&&payload.pending?.some(item=>item.key===current)?current:payload.pending![0].key);
    }else setSelectedKey("");
  }

  useEffect(()=>{load().catch(()=>setData({ok:false,message:"분석 대기 목록을 불러오지 못했습니다."}));},[]);
  const selected=useMemo(()=>data?.pending?.find(item=>item.key===selectedKey)??null,[data,selectedKey]);

  async function reprocess(){
    if(!selected||busy)return;
    const label=selected.name||selected.inputValue;
    if(!confirm(`${label} 1건을 최신 자동 분석 기준으로 재처리하시겠습니까?\n\n기존 요청 ID를 그대로 사용하며 새 요청이나 새 세션은 만들지 않습니다.`))return;
    setBusy(true);
    setNotice("기존 요청 ID를 유지한 채 최신 자동 분석을 실행 중입니다...");
    try{
      const response=await fetch("/api/admin/reprocess-pending",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({requestId:selected.requestId}),
      });
      const payload=await response.json() as ReprocessResponse;
      if(!response.ok||!payload.ok)throw new Error(payload.message??payload.code??"재처리에 실패했습니다.");
      setNotice(`${payload.productName??label} 재처리 완료 · ${payload.fitCount??16}/16 · ${payload.cached?"기존 결과 확인":"최신 자동 분석 완료"}`);
      await load();
    }catch(error){
      setNotice(error instanceof Error?`재처리 중단: ${error.message}`:"재처리 중 오류가 발생했습니다.");
      await load().catch(()=>undefined);
    }finally{setBusy(false);}
  }

  return <main className="min-h-screen bg-[#f7f4f4] p-4 text-[#382d2d] sm:p-8">
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[.18em] text-[#b97b88]">LAYAD ADMIN</p>
          <h1 className="mt-2 text-3xl font-semibold">자동 분석 재처리</h1>
          <p className="mt-3 text-sm leading-6 text-[#7b6d70]">기존 대기 요청 ID와 세션을 그대로 유지하면서 현재 운영 중인 최신 분석 기준으로 재처리합니다. 16유형 저장이 모두 확인된 경우에만 완료 처리합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="rounded-xl border border-[#d9c9cd] bg-white px-4 py-3 text-sm font-semibold">대시보드</Link>
          <Link href="/admin/analysis-data" className="rounded-xl bg-[#382d2d] px-4 py-3 text-sm font-semibold text-white">완료 데이터 조회</Link>
        </div>
      </header>

      {!data?.ok&&data?<div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{data.message??"대기 목록을 불러오지 못했습니다."}</div>:null}
      {notice?<div className="rounded-2xl border border-[#eadfe1] bg-white p-4 text-sm font-medium text-[#6e5c60]">{notice}</div>:null}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#eadfe1] bg-white p-5"><p className="text-xs text-[#918488]">재처리 대기 상품</p><p className="mt-2 text-3xl font-semibold">{data?.total??0}</p></div>
        <div className="rounded-2xl border border-[#eadfe1] bg-white p-5"><p className="text-xs text-[#918488]">재처리 방식</p><p className="mt-2 font-semibold">기존 요청 ID 재사용</p></div>
        <div className="rounded-2xl border border-[#eadfe1] bg-white p-5"><p className="text-xs text-[#918488]">완료 조건</p><p className="mt-2 font-semibold">16/16 검증 후 완료</p></div>
      </section>

      {(data?.pending?.length??0)>0?<section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="min-w-0 self-start rounded-3xl border border-[#eadfe1] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 px-2"><h2 className="font-semibold">대기 상품</h2><span className="shrink-0 rounded-full bg-[#fff0f2] px-3 py-1 text-xs font-semibold text-[#b76778]">오래된 신청순</span></div>
          <div className="mt-4 max-h-[calc(100vh-260px)] min-h-[520px] space-y-2 overflow-y-auto pr-1">
            {data?.pending?.map(item=><button key={item.key} onClick={()=>{setSelectedKey(item.key);setNotice("");}} className={`w-full rounded-2xl border p-4 text-left transition ${selectedKey===item.key?"border-[#c86f81] bg-[#fff7f8]":"border-[#eee5e7] bg-white hover:bg-[#fffafa]"}`}>
              <div className="flex items-start justify-between gap-3"><p className="break-words font-semibold">{item.name}</p><span className="shrink-0 rounded-full bg-[#fff3de] px-2 py-1 text-xs font-semibold text-[#8a671f]">{item.fitCount}/16</span></div>
              <p className="mt-2 text-xs text-[#817477]">신청 {item.requestCount}건 · 이용자 {item.uniqueSessions}명</p>
              <p className="mt-1 text-xs text-[#a09194]">최초 신청 {fmt(item.firstRequestedAt)}</p>
            </button>)}
          </div>
        </div>

        {selected?<div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold tracking-[.14em] text-[#b97b88]">선택 상품</p>
            <h2 className="mt-2 text-2xl font-semibold break-words">{selected.name}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-[#fffafa] p-4"><p className="text-xs text-[#918488]">현재 결과</p><p className="mt-1 text-lg font-semibold">{selected.fitCount}/16</p></div>
              <div className="rounded-2xl bg-[#fffafa] p-4"><p className="text-xs text-[#918488]">신청 건수</p><p className="mt-1 text-lg font-semibold">{selected.requestCount}</p></div>
              <div className="rounded-2xl bg-[#fffafa] p-4"><p className="text-xs text-[#918488]">브랜드</p><p className="mt-1 text-sm font-semibold">{selected.brand??"-"}</p></div>
              <div className="rounded-2xl bg-[#fffafa] p-4"><p className="text-xs text-[#918488]">카테고리</p><p className="mt-1 text-sm font-semibold">{selected.category??"-"}</p></div>
            </div>
            <p className="mt-5 break-all text-xs text-[#817477]">요청 ID {selected.requestId}</p>
            {selected.productUrl?<a href={selected.productUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#a94f65] underline">상품 링크 확인</a>:null}
          </section>

          <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold tracking-[.14em] text-[#b97b88]">안전 재처리</p>
            <h3 className="mt-2 text-xl font-semibold">기존 요청을 그대로 복구합니다</h3>
            <p className="mt-3 text-sm leading-7 text-[#7b6d70]">새 요청이나 새 세션을 생성하지 않습니다. 부분 결과가 이미 존재하면 자동으로 중단하고, 최신 분석 결과가 16개 모두 저장된 것이 확인된 경우에만 같은 상품의 대기 요청을 완료 상태로 전환합니다.</p>
            <div className="mt-6 rounded-2xl border border-[#eadfe1] bg-[#fffafa] p-4">
              <p className="text-xs font-semibold text-[#8a7379]">실행 가능한 작업</p>
              <button
                type="button"
                onClick={reprocess}
                disabled={busy||!selected.productId}
                aria-disabled={busy||!selected.productId}
                style={{
                  marginTop:16,
                  width:"100%",
                  minHeight:56,
                  borderRadius:16,
                  border:"2px solid #8f3f55",
                  backgroundColor:busy||!selected.productId?"#d8c9cd":"#a94f65",
                  color:"#ffffff",
                  fontWeight:700,
                  fontSize:15,
                  cursor:busy||!selected.productId?"not-allowed":"pointer",
                  boxShadow:busy||!selected.productId?"none":"0 8px 18px rgba(169,79,101,.22)",
                }}
              >{busy?"재처리 중...":"선택 상품 1건 안전 재처리"}</button>
              {!selected.productId?<p className="mt-3 text-sm font-medium text-[#b84f63]">상품 연결 정보가 없어 자동 재처리를 실행할 수 없습니다.</p>:<p className="mt-3 text-xs text-[#817477]">버튼을 누르면 확인창이 뜬 뒤 선택된 1건만 실행됩니다.</p>}
            </div>
          </section>
        </div>:null}
      </section>:<section className="rounded-3xl border border-[#dfe9e1] bg-[#f4faf6] p-8 text-center"><p className="font-semibold text-[#39714a]">재처리할 대기 상품이 없습니다.</p></section>}
    </div>
  </main>;
}
