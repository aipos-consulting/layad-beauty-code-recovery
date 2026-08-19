"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Data = { ok: boolean; statusCounts?: Record<string, number>; topProducts?: Array<{name:string;count:number;topCode:string;status:string}>; code?:string; message?:string };
const labels: Record<string,string> = {submitted:"신청 접수",collecting_reviews:"상품 확인",analyzing:"분석 중",completed:"분석 완료",insufficient_reviews:"분석 불가",failed:"처리 실패"};
export default function Page(){
 const [data,setData]=useState<Data|null>(null);
 useEffect(()=>{fetch('/api/admin/dashboard',{cache:'no-store'}).then(r=>r.json()).then(setData).catch(()=>setData({ok:false,code:'NETWORK_ERROR'}));},[]);
 const groups=['submitted','collecting_reviews','analyzing','completed'];
 return <main className="min-h-screen bg-[#f7f4f4] p-5 text-[#382d2d] sm:p-8"><div className="mx-auto max-w-7xl">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold tracking-[.18em] text-[#b97b88]">LAYAD ADMIN</p><h1 className="mt-2 text-3xl font-semibold">분석 작업</h1></div><div className="flex flex-wrap gap-2"><Link href="/admin/batch-import" className="rounded-full bg-[#a94f65] px-5 py-3 text-sm font-semibold text-white">상품 분석 등록</Link><Link href="/admin/analysis-data" className="rounded-full border border-[#d9c9cd] bg-white px-5 py-3 text-sm font-semibold">완료 데이터 조회</Link></div></div>
 <p className="mt-3 text-sm text-[#7b6d70]">상품 등록·분석 대기·완료 상태를 확인합니다. 실제 분석 등록은 ‘상품 분석 등록’, 완료 결과 확인은 ‘완료 데이터 조회’에서 진행합니다.</p>
 {!data?.ok&&data?<div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{data.message??'데이터를 불러오지 못했습니다.'}</div>:null}
 <section className="mt-7 grid gap-5 lg:grid-cols-4">{groups.map(k=><article key={k} className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold">{labels[k]}</h2><span className="rounded-full bg-[#fff0f2] px-3 py-1 text-sm font-semibold text-[#b76778]">{data?.statusCounts?.[k]??0}</span></div><div className="mt-5 space-y-3">{(data?.topProducts??[]).filter(p=>p.status===k).map(p=><div key={p.name} className="rounded-2xl border border-[#eee5e7] p-4"><p className="font-semibold break-words">{p.name}</p><p className="mt-1 text-xs text-[#7b6d70]">신청 {p.count}건 · 대표 유형 {p.topCode}</p>{k==='completed'?<Link href="/admin/analysis-data" className="mt-3 block w-full rounded-xl bg-[#edf7f0] px-3 py-2 text-center text-sm font-semibold text-[#39714a]">완료 데이터 조회</Link>:<Link href="/admin/batch-import" className="mt-3 block w-full rounded-xl border border-[#d88c9c] px-3 py-2 text-center text-sm font-semibold text-[#b76778]">상품 분석 등록</Link>}</div>)}{!(data?.topProducts??[]).some(p=>p.status===k)?<p className="rounded-2xl bg-[#fffafa] p-4 text-sm text-[#8a7a7d]">해당 작업이 없습니다.</p>:null}</div></article>)}</section>
 <section className="mt-7 rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">현재 운영 절차</h2><div className="mt-5 grid gap-3 sm:grid-cols-4">{['상품명 등록','ChatGPT 분석 대기','리뷰·키워드·4축·16유형 생성','완료 데이터 조회'].map((v,i)=><div key={v} className="rounded-2xl bg-[#fffafa] p-4"><b className="text-[#c86f81]">{i+1}</b><p className="mt-2 text-sm font-semibold">{v}</p></div>)}</div></section>
 </div></main>
}