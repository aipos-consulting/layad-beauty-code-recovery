"use client";

import { useEffect, useState } from "react";

type Subtype = { code: string; count: number; share: number };
type DgData = {
  ok?: boolean;
  message?: string;
  kpis?: {
    totalVisits: number;
    completedVisits: number;
    dgVisits: number;
    dgVisitShare: number;
    completedSessions: number;
    dgSessions: number;
    dgSessionShare: number;
    dgMembers: number;
    dgAnalysisMembers: number;
    dgAnalysisRate: number;
    dgAnalysisResults: number;
  };
  visitSubtypes?: Subtype[];
  sessionSubtypes?: Subtype[];
  memberSubtypes?: Subtype[];
  channels?: Array<{ key: string; label: string; visits: number; share: number }>;
  products?: Array<{ name: string; brand: string; category: string; results: number; members: number }>;
};

const fmt = (n: number | undefined) => Number(n ?? 0).toLocaleString("ko-KR");
const pct = (n: number | undefined) => `${Number(n ?? 0).toFixed(1)}%`;

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm">
    <p className="text-xs text-[#7b6d70]">{label}</p>
    <p className="mt-2 text-2xl font-semibold">{value}</p>
    <p className="mt-2 text-[11px] leading-5 text-[#9a8d90]">{note}</p>
  </article>;
}

function SubtypeGrid({ rows }: { rows: Subtype[] }) {
  return <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {rows.map((row) => <article key={row.code} className="rounded-2xl bg-[#fbf7f7] p-4">
      <div className="flex items-center justify-between"><span className="font-semibold">{row.code}</span><span className="text-xs font-semibold text-[#a94f65]">{pct(row.share)}</span></div>
      <p className="mt-2 text-xl font-semibold">{fmt(row.count)}</p>
    </article>)}
  </div>;
}

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

  return <main className="min-h-screen bg-[#fbf7f7] p-5 text-[#382d2d] sm:p-8">
    <div className="mx-auto max-w-7xl">
      <header>
        <p className="text-xs font-semibold tracking-[.18em] text-[#a94f65]">ADMIN · DG FOCUS</p>
        <h1 className="mt-2 text-3xl font-semibold">DG Focus</h1>
        <p className="mt-2 text-sm text-[#7b6d70]">DG 데이터를 Visit · Session · Member 세 단위로 분리해 서로 다른 숫자가 섞이지 않도록 관리합니다.</p>
      </header>

      <section className="mt-8 rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
        <div><p className="text-xs font-semibold tracking-[.14em] text-[#a94f65]">VISIT</p><h2 className="mt-1 text-xl font-semibold">유입 기준</h2><p className="mt-1 text-xs text-[#7b6d70]">marketing_visits 기준입니다. 같은 사람이 재방문하면 여러 건으로 집계될 수 있습니다.</p></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MetricCard label="DG 완료 Visit" value={fmt(k?.dgVisits)} note="DG 코드로 테스트 완료된 마케팅 방문 건" />
          <MetricCard label="전체 완료 Visit" value={fmt(k?.completedVisits)} note="Beauty Code가 기록된 전체 완료 방문 건" />
          <MetricCard label="DG Visit 비중" value={pct(k?.dgVisitShare)} note="전체 완료 Visit 중 DG 비중" />
        </div>
        <SubtypeGrid rows={data.visitSubtypes ?? []} />
      </section>

      <section className="mt-5 rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
        <div><p className="text-xs font-semibold tracking-[.14em] text-[#a94f65]">SESSION</p><h2 className="mt-1 text-xl font-semibold">테스트 세션 기준</h2><p className="mt-1 text-xs text-[#7b6d70]">test_sessions 기준이며 통계 제외 세션은 제외합니다. 전체 통계와 비교할 때 이 숫자를 사용합니다.</p></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MetricCard label="DG 완료 Session" value={fmt(k?.dgSessions)} note="DG 코드로 완료된 실제 테스트 세션" />
          <MetricCard label="전체 완료 Session" value={fmt(k?.completedSessions)} note="통계 대상 전체 완료 테스트 세션" />
          <MetricCard label="DG Session 비중" value={pct(k?.dgSessionShare)} note="전체 완료 Session 중 DG 비중" />
        </div>
        <SubtypeGrid rows={data.sessionSubtypes ?? []} />
      </section>

      <section className="mt-5 rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
        <div><p className="text-xs font-semibold tracking-[.14em] text-[#a94f65]">MEMBER</p><h2 className="mt-1 text-xl font-semibold">회원 기준</h2><p className="mt-1 text-xs text-[#7b6d70]">현재 Beauty Code와 user_id 기준입니다. 회원조회와 비교할 때 이 숫자를 사용합니다.</p></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="DG 회원" value={fmt(k?.dgMembers)} note="현재 Beauty Code가 DG인 회원" />
          <MetricCard label="상품분석 DG 회원" value={fmt(k?.dgAnalysisMembers)} note="상품분석 결과가 저장된 DG 회원" />
          <MetricCard label="DG 회원 상품분석률" value={pct(k?.dgAnalysisRate)} note="DG 회원 대비 상품분석 회원 비율" />
          <MetricCard label="DG 상품분석 결과" value={fmt(k?.dgAnalysisResults)} note="DG 회원 계정에 저장된 상품분석 결과 건" />
        </div>
        <SubtypeGrid rows={data.memberSubtypes ?? []} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">DG 유입채널 · Visit 기준</h2>
          <p className="mt-1 text-xs text-[#7b6d70]">채널 성과는 마케팅 유입 단위이므로 Visit으로만 집계합니다.</p>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[460px] text-sm">
            <thead className="text-left text-xs text-[#8a7d80]"><tr><th className="pb-3">채널</th><th>DG Visit</th><th>비중</th></tr></thead>
            <tbody>{(data.channels ?? []).map((row) => <tr key={row.key} className="border-t border-[#f0e7e9]"><td className="py-3 font-medium">{row.label}</td><td>{fmt(row.visits)}</td><td>{pct(row.share)}</td></tr>)}</tbody>
          </table></div>
        </article>

        <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">숫자 비교 기준</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-[#fbf7f7] p-4"><b>Visit</b><p className="mt-1 text-[#7b6d70]">광고·직접·검색·공유 등 유입 채널 성과를 볼 때 사용합니다.</p></div>
            <div className="rounded-2xl bg-[#fbf7f7] p-4"><b>Session</b><p className="mt-1 text-[#7b6d70]">테스트 완료량과 전체 통계를 비교할 때 사용합니다.</p></div>
            <div className="rounded-2xl bg-[#fbf7f7] p-4"><b>Member</b><p className="mt-1 text-[#7b6d70]">회원조회 및 실제 판매 타겟 규모를 비교할 때 사용합니다.</p></div>
          </div>
        </article>
      </section>

      <section className="mt-5 rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">DG 관심 상품 Top 20 · Member 기준</h2>
        <p className="mt-1 text-xs text-[#7b6d70]">현재 DG 회원 계정에 저장된 상품분석 결과를 집계합니다.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-[#8a7d80]"><tr><th className="pb-3">순위</th><th>상품</th><th>브랜드</th><th>카테고리</th><th>분석 결과</th><th>분석 회원</th></tr></thead>
          <tbody>{(data.products ?? []).map((row, index) => <tr key={`${row.name}-${index}`} className="border-t border-[#f0e7e9]"><td className="py-3 font-semibold text-[#a94f65]">{index + 1}</td><td className="max-w-[360px] font-medium">{row.name}</td><td>{row.brand}</td><td>{row.category}</td><td>{fmt(row.results)}</td><td>{fmt(row.members)}</td></tr>)}</tbody>
        </table></div>
        {!(data.products ?? []).length ? <p className="py-8 text-center text-sm text-[#8a7d80]">아직 DG 회원의 저장된 상품분석 결과가 없습니다.</p> : null}
      </section>
    </div>
  </main>;
}
