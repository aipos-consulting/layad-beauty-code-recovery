"use client";

import { useEffect, useState } from "react";

type DgData = {
  ok?: boolean;
  message?: string;
  kpis?: {
    totalVisits: number;
    completedUsers: number;
    dgUsers: number;
    dgShare: number;
    dgMembers: number;
    dgAnalysisUsers: number;
    dgAnalysisRate: number;
    dgAnalysisRequests: number;
  };
  subtypes?: Array<{ code: string; count: number; share: number }>;
  channels?: Array<{ key: string; label: string; users: number; share: number }>;
  products?: Array<{ name: string; brand: string; category: string; requests: number; users: number }>;
  generatedAt?: string;
};

const fmt = (n: number | undefined) => Number(n ?? 0).toLocaleString("ko-KR");
const pct = (n: number | undefined) => `${Number(n ?? 0).toFixed(1)}%`;

export default function DgFocusPage() {
  const [data, setData] = useState<DgData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/dg-focus?t=${Date.now()}`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ ok: false, message: "DG Focus 데이터를 불러오지 못했습니다." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <main className="p-6 sm:p-8"><div className="rounded-3xl border border-[#eadfe1] bg-white p-8">DG Focus 데이터를 불러오는 중입니다.</div></main>;
  if (!data?.ok) return <main className="p-6 sm:p-8"><div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">DG Focus 데이터를 불러오지 못했습니다. {data?.message}</div></main>;

  const k = data.kpis;
  const cards = [
    ["DG 유입 사용자", fmt(k?.dgUsers), "테스트 완료 후 DG 계열로 판정된 유입 건"],
    ["DG 비중", pct(k?.dgShare), "전체 테스트 완료 유입 중 DG 비중"],
    ["DG 회원", fmt(k?.dgMembers), "현재 Beauty Code가 DG인 회원"],
    ["DG 상품분석 회원", fmt(k?.dgAnalysisUsers), "상품분석 결과가 저장된 DG 회원"],
    ["DG 상품분석률", pct(k?.dgAnalysisRate), "DG 회원 대비 상품분석 회원 비율"],
    ["DG 상품분석 결과", fmt(k?.dgAnalysisRequests), "DG 회원 계정에 저장된 상품분석 결과"],
  ];

  return <main className="min-h-screen bg-[#fbf7f7] p-5 text-[#382d2d] sm:p-8">
    <div className="mx-auto max-w-7xl">
      <header>
        <p className="text-xs font-semibold tracking-[.18em] text-[#a94f65]">ADMIN · DG FOCUS</p>
        <h1 className="mt-2 text-3xl font-semibold">DG Focus</h1>
        <p className="mt-2 text-sm text-[#7b6d70]">DGPV · DGPE · DGCV · DGCE 사용자의 유입과 상품 관심 행동을 판매 타겟 관점에서 분석합니다.</p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(([label, value, note]) => <article key={label} className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm">
          <p className="text-xs text-[#7b6d70]">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          <p className="mt-2 text-[11px] leading-5 text-[#9a8d90]">{note}</p>
        </article>)}
      </section>

      <section className="mt-5 rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
        <div><h2 className="text-lg font-semibold">DG 하위유형 분포</h2><p className="mt-1 text-xs text-[#7b6d70]">완료 유입 기준으로 DG 판매 타겟을 4개 하위 Beauty Code로 분리합니다.</p></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(data.subtypes ?? []).map((row) => <article key={row.code} className="rounded-2xl bg-[#fbf7f7] p-5">
            <div className="flex items-center justify-between"><span className="text-lg font-semibold">{row.code}</span><span className="rounded-full bg-[#fff0f3] px-3 py-1 text-xs font-semibold text-[#a94f65]">{pct(row.share)}</span></div>
            <p className="mt-3 text-2xl font-semibold">{fmt(row.count)}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#efe4e6]"><div className="h-full rounded-full bg-[#c47889]" style={{ width: `${Math.min(100, row.share)}%` }} /></div>
          </article>)}
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">DG 유입채널</h2>
          <p className="mt-1 text-xs text-[#7b6d70]">유입채널은 marketing visit 기준으로 별도 집계합니다.</p>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[460px] text-sm">
            <thead className="text-left text-xs text-[#8a7d80]"><tr><th className="pb-3">채널</th><th>DG 유입</th><th>DG 유입 비중</th></tr></thead>
            <tbody>{(data.channels ?? []).map((row) => <tr key={row.key} className="border-t border-[#f0e7e9]"><td className="py-3 font-medium">{row.label}</td><td>{fmt(row.users)}</td><td>{pct(row.share)}</td></tr>)}</tbody>
          </table></div>
        </article>

        <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">DG 판매 타겟 기준</h2>
          <p className="mt-1 text-xs text-[#7b6d70]">유입과 회원 상품행동을 서로 다른 식별키로 안전하게 관리합니다.</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-[#fbf7f7] p-4"><b>1. DG 유입</b><p className="mt-1 text-[#7b6d70]">marketing_visits에서 완료된 DG Beauty Code를 집계합니다.</p></div>
            <div className="rounded-2xl bg-[#fbf7f7] p-4"><b>2. DG 상품행동</b><p className="mt-1 text-[#7b6d70]">회원 user_id와 현재 Beauty Code, 저장된 상품분석 결과를 연결합니다.</p></div>
            <div className="rounded-2xl bg-[#fbf7f7] p-4"><b>3. 안정성</b><p className="mt-1 text-[#7b6d70]">기존 DB 구조와 사용자 분석 흐름은 변경하지 않고 조회 집계만 수정했습니다.</p></div>
          </div>
        </article>
      </section>

      <section className="mt-5 rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">DG 관심 상품 Top 20</h2>
        <p className="mt-1 text-xs text-[#7b6d70]">DG 회원 계정에 저장된 상품분석 결과를 기준으로 집계합니다.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-[#8a7d80]"><tr><th className="pb-3">순위</th><th>상품</th><th>브랜드</th><th>카테고리</th><th>분석 결과</th><th>분석 회원</th></tr></thead>
          <tbody>{(data.products ?? []).map((row, index) => <tr key={`${row.name}-${index}`} className="border-t border-[#f0e7e9]"><td className="py-3 font-semibold text-[#a94f65]">{index + 1}</td><td className="max-w-[360px] font-medium">{row.name}</td><td>{row.brand}</td><td>{row.category}</td><td>{fmt(row.requests)}</td><td>{fmt(row.users)}</td></tr>)}</tbody>
        </table></div>
        {!(data.products ?? []).length ? <p className="py-8 text-center text-sm text-[#8a7d80]">아직 DG 회원의 저장된 상품분석 결과가 없습니다.</p> : null}
      </section>
    </div>
  </main>;
}
