"use client";

import { useEffect, useMemo, useState } from "react";

type InsightData={ok?:boolean;phase1?:{funnel:any;acquisition:any[];beautyCodes:any[];products:any[]};phase2?:{daily:any[];comparison:Record<string,{current:number;previous:number;changePct:number|null}>;ageCode:any[]};generatedAt?:string;message?:string};
const fmt=(n:number|undefined)=>Number(n??0).toLocaleString("ko-KR");
const pct=(n:number|undefined)=>`${Number(n??0).toFixed(1)}%`;
function delta(v:number|null|undefined){if(v==null)return "—";return `${v>0?"+":""}${v.toFixed(1)}%`;}

export default function InsightAnalyticsPage(){
 const [data,setData]=useState<InsightData|null>(null); const [loading,setLoading]=useState(true);
 useEffect(()=>{let c=false;const load=async()=>{try{const r=await fetch(`/api/admin/insight-analytics?t=${Date.now()}`,{cache:"no-store"});const j=await r.json();if(!c)setData(j);}finally{if(!c)setLoading(false);}};void load();return()=>{c=true};},[]);
 const p1=data?.phase1,p2=data?.phase2;
 const maxDaily=useMemo(()=>Math.max(1,...(p2?.daily??[]).map((d:any)=>d.visits)),[p2]);
 if(loading)return <main className="p-6 sm:p-8"><div className="rounded-3xl border border-[#eadfe1] bg-white p-8">Insight Analytics를 불러오는 중입니다.</div></main>;
 if(!data?.ok)return <main className="p-6 sm:p-8"><div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">분석 데이터를 불러오지 못했습니다. {data?.message}</div></main>;
 const cards=[
  ["방문",p1?.funnel.visits,""],["테스트 시작",p1?.funnel.started,pct(p1?.funnel.startRate)],["테스트 완료",p1?.funnel.completed,pct(p1?.funnel.completeRate)],["제품 분석",p1?.funnel.productAnalyses,pct(p1?.funnel.analysisRate)],["제품 저장",p1?.funnel.saved,pct(p1?.funnel.saveRate)]
 ];
 return <main className="min-h-screen bg-[#fbf7f7] p-5 text-[#382d2d] sm:p-8">
  <div className="mx-auto max-w-7xl">
   <header><p className="text-xs font-semibold tracking-[.18em] text-[#a94f65]">ADMIN · INSIGHT ANALYTICS</p><h1 className="mt-2 text-3xl font-semibold">Insight Analytics</h1><p className="mt-2 text-sm text-[#7b6d70]">현재 축적된 실제 운영 데이터를 기반으로 Phase 1·2 인사이트를 제공합니다.</p></header>

   <section className="mt-8 rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold text-[#a94f65]">PHASE 1</p><h2 className="mt-1 text-xl font-semibold">Growth Funnel</h2></div><span className="rounded-full bg-[#fff0f3] px-3 py-1 text-xs font-semibold text-[#a94f65]">현재 누적</span></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{cards.map(([label,value,rate])=><article key={String(label)} className="rounded-2xl bg-[#fbf7f7] p-4"><p className="text-xs text-[#7b6d70]">{label}</p><p className="mt-2 text-2xl font-semibold">{fmt(Number(value))}</p>{rate?<p className="mt-1 text-xs font-semibold text-[#a94f65]">전환 {rate}</p>:null}</article>)}</div>
   </section>

   <section className="mt-5 grid gap-5 xl:grid-cols-2">
    <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">유입채널 품질</h2><p className="mt-1 text-xs text-[#7b6d70]">방문량뿐 아니라 테스트 시작·완료 전환율을 함께 봅니다.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="text-left text-xs text-[#8a7d80]"><tr><th className="pb-3">채널</th><th>방문</th><th>시작률</th><th>완료율</th></tr></thead><tbody>{p1?.acquisition.map((r:any)=><tr key={r.source} className="border-t border-[#f0e7e9]"><td className="py-3 font-medium">{r.source}</td><td>{fmt(r.visits)}</td><td>{pct(r.startRate)}</td><td>{pct(r.completeRate)}</td></tr>)}</tbody></table></div></article>
    <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">Beauty Code 분포</h2><p className="mt-1 text-xs text-[#7b6d70]">완료 사용자 기준 상위 유형입니다.</p><div className="mt-4 space-y-3">{p1?.beautyCodes.slice(0,8).map((r:any)=><div key={r.code}><div className="flex justify-between text-sm"><span className="font-semibold">{r.code}</span><span>{fmt(r.count)} · {pct(r.share)}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-[#f3e9eb]"><div className="h-full rounded-full bg-[#c47889]" style={{width:`${Math.min(100,r.share)}%`}}/></div></div>)}</div></article>
   </section>

   <section className="mt-5 rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6"><div><p className="text-xs font-semibold text-[#a94f65]">PHASE 1</p><h2 className="mt-1 text-lg font-semibold">Product Intelligence</h2><p className="mt-1 text-xs text-[#7b6d70]">제품 분석요청과 저장 행동을 함께 봅니다.</p></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="text-left text-xs text-[#8a7d80]"><tr><th className="pb-3">제품</th><th>분석 요청</th><th>저장</th><th>저장률</th><th>평균 적합도</th></tr></thead><tbody>{p1?.products.map((r:any)=><tr key={r.name} className="border-t border-[#f0e7e9]"><td className="max-w-[360px] py-3 font-medium">{r.name}</td><td>{fmt(r.requests)}</td><td>{fmt(r.saves)}</td><td>{pct(r.saveRate)}</td><td>{r.avgFit==null?"—":`${r.avgFit}점`}</td></tr>)}</tbody></table></div></section>

   <section className="mt-8"><div><p className="text-xs font-semibold text-[#a94f65]">PHASE 2</p><h2 className="mt-1 text-xl font-semibold">Trend & Change</h2><p className="mt-1 text-xs text-[#7b6d70]">최근 7일과 직전 7일의 변화 및 최근 30일 추세입니다.</p></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["방문","visits"],["테스트 완료","completes"],["제품 분석","analyses"],["제품 저장","saves"]].map(([label,key])=>{const x=p2?.comparison[key];return <article key={key} className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm"><p className="text-xs text-[#7b6d70]">{label} · 최근 7일</p><p className="mt-2 text-2xl font-semibold">{fmt(x?.current)}</p><p className={`mt-1 text-sm font-semibold ${(x?.changePct??0)>=0?"text-emerald-700":"text-red-700"}`}>{delta(x?.changePct)} <span className="font-normal text-[#8a7d80]">vs 직전 7일</span></p></article>})}</div>
   </section>

   <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
    <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">최근 30일 방문 추세</h2><div className="mt-6 flex h-52 items-end gap-1">{p2?.daily.map((d:any)=><div key={d.date} className="group relative flex-1"><div className="w-full rounded-t bg-[#c47889]" style={{height:`${Math.max(2,d.visits/maxDaily*180)}px`}}/><div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#382d2d] px-2 py-1 text-[10px] text-white group-hover:block">{d.date} · {fmt(d.visits)}</div></div>)}</div><div className="mt-2 flex justify-between text-[10px] text-[#9a8d90]"><span>{p2?.daily[0]?.date}</span><span>{p2?.daily[p2.daily.length-1]?.date}</span></div></article>
    <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">연령 × Beauty Code 상위 조합</h2><div className="mt-4 space-y-2">{p2?.ageCode.slice(0,10).map((r:any,i:number)=><div key={`${r.age}-${r.code}`} className="flex items-center justify-between rounded-xl bg-[#fbf7f7] px-4 py-3 text-sm"><span><b className="mr-2 text-[#a94f65]">{i+1}</b>{r.age} · {r.code}</span><b>{fmt(r.count)}</b></div>)}</div></article>
   </section>
  </div>
 </main>;
}
