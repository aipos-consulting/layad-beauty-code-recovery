"use client";

import { useEffect,useState } from "react";

type Status={ok:boolean;configured:boolean;connected:boolean;message?:string;account?:unknown;channels?:unknown;products?:any;reviewBodyApiAvailable?:boolean;reviewNote?:string};

function productList(payload:any){
  if(Array.isArray(payload)) return payload;
  if(Array.isArray(payload?.contents)) return payload.contents;
  if(Array.isArray(payload?.data?.contents)) return payload.data.contents;
  return [];
}

export default function SmartStorePage(){
 const [data,setData]=useState<Status|null>(null);const [busy,setBusy]=useState(true);
 async function load(){setBusy(true);try{const r=await fetch('/api/admin/naver-commerce',{cache:'no-store'});setData(await r.json());}catch{setData({ok:false,configured:false,connected:false,message:'연결 상태 조회 실패'});}finally{setBusy(false);}}
 useEffect(()=>{void load();},[]);
 const products=productList(data?.products);
 return <main className="min-h-screen bg-[#fbf7f7] p-4 text-[#382d2d] md:p-8"><div className="mx-auto max-w-6xl space-y-6">
  <header><p className="text-xs font-semibold tracking-[.16em] text-[#a94f65]">NAVER COMMERCE</p><h1 className="mt-2 text-3xl font-semibold">스마트스토어 연결</h1><p className="mt-2 text-sm text-[#74676a]">LAYAD Admin과 네이버 스마트스토어 상품 데이터를 연결합니다.</p></header>
  <section className="rounded-2xl border border-[#eadfe1] bg-white p-5 md:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">연결 상태</p><p className="mt-2 text-2xl font-semibold">{busy?'확인 중':data?.connected?'연결 완료':data?.configured?'연결 오류':'연결 정보 미등록'}</p></div><button onClick={load} disabled={busy} className="rounded-xl bg-[#382d2d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy?'확인 중':'연결 확인'}</button></div>{data?.message?<p className="mt-4 rounded-xl bg-[#fff7f8] p-4 text-sm text-[#8f4c5c]">{data.message}</p>:null}</section>
  {!data?.configured&&!busy?<section className="rounded-2xl border border-[#eadfe1] bg-white p-5 md:p-6"><h2 className="text-lg font-semibold">1. 네이버 커머스API 앱 등록</h2><p className="mt-2 text-sm leading-6 text-[#74676a]">네이버 커머스API센터에서 LAYAD용 애플리케이션을 등록한 뒤 발급받은 값은 Vercel Production Environment Variables에 저장합니다. 비밀키는 Admin 화면이나 DB에 저장하지 않습니다.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{['NAVER_COMMERCE_CLIENT_ID','NAVER_COMMERCE_CLIENT_SECRET','NAVER_COMMERCE_AUTH_TYPE=SELF','NAVER_COMMERCE_ACCOUNT_ID (SELLER 방식일 때만)'].map(v=><div key={v} className="rounded-xl bg-[#fbf7f7] p-4 font-mono text-xs">{v}</div>)}</div><p className="mt-4 text-xs text-[#8d7f82]">등록 후 Production 재배포 → 이 화면에서 연결 확인을 누르면 계정·채널·상품 목록을 확인합니다.</p></section>:null}
  {data?.connected?<><section className="rounded-2xl border border-[#eadfe1] bg-white p-5 md:p-6"><h2 className="text-lg font-semibold">스토어 연결 정보</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><div className="rounded-xl bg-[#fbf7f7] p-4"><p className="text-xs font-semibold text-[#94868a]">계정</p><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(data.account,null,2)}</pre></div><div className="rounded-xl bg-[#fbf7f7] p-4"><p className="text-xs font-semibold text-[#94868a]">채널</p><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(data.channels,null,2)}</pre></div></div></section><section className="rounded-2xl border border-[#eadfe1] bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">스마트스토어 상품</h2><p className="mt-1 text-sm text-[#74676a]">리뷰 수가 많은 상품 순으로 최대 50개를 조회합니다.</p></div><span className="rounded-full bg-[#fff0f3] px-3 py-1 text-sm font-semibold text-[#a94f65]">{products.length}개</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b text-xs text-[#95878a]"><th className="px-3 py-3">상품번호</th><th className="px-3 py-3">상품명</th><th className="px-3 py-3">상태</th><th className="px-3 py-3">리뷰/평점</th></tr></thead><tbody>{products.map((p:any,i:number)=><tr key={p.channelProductNo??p.originProductNo??i} className="border-b border-[#f1e8ea]"><td className="px-3 py-3">{p.channelProductNo??p.originProductNo??'-'}</td><td className="px-3 py-3 font-semibold">{p.name??p.channelProductName??p.productName??'-'}</td><td className="px-3 py-3">{p.statusType??p.productStatusType??'-'}</td><td className="px-3 py-3">{p.totalReviewCount??p.reviewCount??'-'} / {p.averageReviewScore??p.reviewScore??'-'}</td></tr>)}</tbody></table>{products.length===0?<p className="py-8 text-center text-sm text-[#8d7f82]">조회된 상품이 없습니다.</p>:null}</div></section></>:null}
  <section className="rounded-2xl border border-[#eadfe1] bg-white p-5 md:p-6"><h2 className="text-lg font-semibold">리뷰 연결 방식</h2><p className="mt-2 text-sm leading-7 text-[#74676a]">네이버 커머스API의 공개 문서에는 구매 리뷰 본문 목록 조회 API가 없습니다. 따라서 스마트스토어 상품 연결은 공식 API로 처리하고, 리뷰 본문은 스마트스토어센터에서 내려받은 파일을 LAYAD로 가져오는 방식으로 연결합니다. 리뷰 파일 가져오기 기능은 다음 단계에서 이 화면에 붙입니다.</p></section>
 </div></main>;
}
