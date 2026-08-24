"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProductRow={id:string;canonical_name:string;brand:string|null;category:string|null;review_count:number;fit_count:number;last_analysis_at:string|null;analysis_version:string|null;complete:boolean};
type ListResponse={ok:boolean;products:ProductRow[];message?:string};
type Detail={ok:boolean;product:ProductRow|null;fits:Array<{beauty_code:string;fit_score:number;review_count:number;confidence:number;analysis_version:string|null}>;runs:Array<{analysis_version?:string|null;input_review_count?:number|null;completed_at?:string|null}>;message?:string};

function fmt(v?:string|null){if(!v)return "-";try{return new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(v));}catch{return v;}}

export default function Page(){
 const [list,setList]=useState<ListResponse|null>(null);
 const [selected,setSelected]=useState<string>("");
 const [detail,setDetail]=useState<Detail|null>(null);
 const [busy,setBusy]=useState(true);
 const [detailBusy,setDetailBusy]=useState(false);

 async function load(){setBusy(true);const r=await fetch("/api/admin/analysis-data",{cache:"no-store"});const d=await r.json();setList(d);const first=d?.products?.[0]?.id??"";setSelected(s=>s||first);setBusy(false);}
 async function loadDetail(id:string){if(!id){setDetail(null);return;}setDetailBusy(true);const r=await fetch(`/api/admin/analysis-data?productId=${encodeURIComponent(id)}`,{cache:"no-store"});setDetail(await r.json());setDetailBusy(false);}
 useEffect(()=>{load();},[]);
 useEffect(()=>{if(selected)loadDetail(selected);},[selected]);

 const latestRun=detail?.runs?.[0];
 const reviewCount=latestRun?.input_review_count??detail?.fits?.[0]?.review_count??detail?.product?.review_count??0;
 const avgConfidence=detail?.fits?.length?Math.round((detail.fits.reduce((a,b)=>a+Number(b.confidence??0),0)/detail.fits.length)*100):0;

 return <main className="min-h-screen bg-[#f7f4f4] p-5 text-[#382d2d] sm:p-8"><div className="mx-auto max-w-6xl space-y-6">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold tracking-[.18em] text-[#b97b88]">LAYAD ADMIN</p><h1 className="mt-2 text-3xl font-semibold">적합도 결과</h1><p className="mt-3 text-sm text-[#7b6d70]">자동 분석된 상품의 16유형 적합도와 분석 정보를 조회합니다.</p></div><div className="flex gap-2"><button onClick={load} className="rounded-xl border border-[#d9c9cd] bg-white px-4 py-3 text-sm font-semibold">새로고침</button><Link href="/admin" className="rounded-full bg-[#382d2d] px-5 py-3 text-sm font-semibold text-white">대시보드</Link></div></div>

  <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><label className="text-sm font-semibold">분석 상품 선택</label><select value={selected} onChange={e=>setSelected(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfd1d4] bg-white px-4 py-3 md:max-w-2xl">{(list?.products??[]).map(p=><option key={p.id} value={p.id}>{p.canonical_name}</option>)}</select>{busy&&<p className="mt-3 text-sm text-[#8a7a7d]">분석 결과를 불러오는 중입니다.</p>}{!busy&&(list?.products?.length??0)===0&&<p className="mt-3 text-sm text-[#8a7a7d]">저장된 분석 상품이 없습니다.</p>}</section>

  {selected&&<section className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
   <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">상품 및 분석 정보</h2>{detailBusy?<p className="mt-5 text-sm">조회 중...</p>:<div className="mt-5 space-y-4"><div><p className="text-xs text-[#918488]">상품명</p><p className="mt-1 font-semibold">{detail?.product?.canonical_name??"-"}</p></div><div><p className="text-xs text-[#918488]">브랜드 · 카테고리</p><p className="mt-1">{detail?.product?.brand??"-"} · {detail?.product?.category??"-"}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#fffafa] p-4"><p className="text-xs text-[#918488]">근거 리뷰 수</p><p className="mt-1 text-xl font-semibold">{reviewCount}</p></div><div className="rounded-xl bg-[#fffafa] p-4"><p className="text-xs text-[#918488]">평균 신뢰도</p><p className="mt-1 text-xl font-semibold">{avgConfidence}%</p></div></div><div><p className="text-xs text-[#918488]">분석 버전</p><p className="mt-1 break-all text-sm">{latestRun?.analysis_version??detail?.fits?.[0]?.analysis_version??"-"}</p></div><div><p className="text-xs text-[#918488]">최종 분석일</p><p className="mt-1 text-sm">{fmt(latestRun?.completed_at??detail?.product?.last_analysis_at)}</p></div></div>}</article>
   <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">16유형 적합도</h2><span className="rounded-full bg-[#edf7f0] px-3 py-1 text-xs font-semibold text-[#39714a]">자동 분석 결과</span></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{(detail?.fits??[]).map(f=><div key={f.beauty_code} className="rounded-2xl border border-[#eadfe1] bg-[#fffafa] p-4"><p className="text-sm font-semibold">{f.beauty_code}</p><p className="mt-2 text-2xl font-semibold">{Math.round(Number(f.fit_score))}</p><p className="mt-1 text-xs text-[#918488]">0–100</p></div>)}</div>{!detailBusy&&(detail?.fits?.length??0)===0&&<p className="mt-5 text-sm text-[#8a7a7d]">저장된 16유형 적합도 결과가 없습니다.</p>}<div className="mt-6 flex justify-end"><Link href="/admin/analysis-data" className="rounded-xl border border-[#d88c9c] px-4 py-3 text-sm font-semibold text-[#b76778]">분석 근거 상세보기</Link></div></article>
  </section>}
 </div></main>;
}
