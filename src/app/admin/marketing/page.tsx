"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Stat = { key: string; label: string; visits: number; starts: number; completes: number };
type Row = { firstSeenAt: string; source: string; medium: string; campaign: string; content: string; placement: string; started: boolean; completed: boolean; beautyCode: string | null };
type Data = {
  ok: boolean;
  message?: string;
  kpis?: { totalVisits: number; metaVisits: number; starts: number; completes: number; startRate: number; completionRate: number };
  sourceStats?: Stat[];
  campaignStats?: Stat[];
  adStats?: Stat[];
  placementStats?: Stat[];
  recent?: Row[];
};

function rate(done: number, base: number) {
  return base ? `${((done / base) * 100).toFixed(1)}%` : "0.0%";
}

function StatTable({ title, rows }: { title: string; rows: Stat[] }) {
  return (
    <section className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs text-[#7b6d70]"><tr><th className="py-2 pr-4">항목</th><th className="py-2 pr-4">유입</th><th className="py-2 pr-4">테스트 시작</th><th className="py-2 pr-4">테스트 완료</th><th className="py-2">완료율</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.key} className="border-t border-[#f0e7e8]">
                <td className="max-w-[420px] break-words py-3 pr-4 font-medium">{row.label}</td>
                <td className="py-3 pr-4">{row.visits}</td>
                <td className="py-3 pr-4">{row.starts}</td>
                <td className="py-3 pr-4">{row.completes}</td>
                <td className="py-3">{rate(row.completes, row.starts)}</td>
              </tr>
            )) : <tr><td colSpan={5} className="py-8 text-center text-[#8a7b7e]">아직 수집된 데이터가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminMarketingPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"campaign" | "ad" | "placement" | "recent">("campaign");

  useEffect(() => {
    fetch("/api/admin/marketing-attribution", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload) => setData(payload as Data))
      .catch(() => setData({ ok: false, message: "관리자 마케팅 데이터를 불러오지 못했습니다." }))
      .finally(() => setLoading(false));
  }, []);

  const k = data?.kpis;
  const activeRows = useMemo(() => {
    if (tab === "campaign") return data?.campaignStats ?? [];
    if (tab === "ad") return data?.adStats ?? [];
    if (tab === "placement") return data?.placementStats ?? [];
    return [];
  }, [data, tab]);

  return (
    <main className="min-h-screen bg-[#f7f4f4] text-[#382d2d]">
      <header className="border-b border-[#eadfe1] bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#b97b88]">LAYAD ADMIN</p>
            <h1 className="mt-1 text-xl font-semibold">마케팅 유입 분석</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/statistics" className="rounded-full border border-[#ead7db] px-4 py-2 text-sm font-semibold">사용자 통계</Link>
            <Link href="/admin" className="rounded-full bg-[#382d2d] px-4 py-2 text-sm font-semibold text-white">대시보드</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
        <section>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#b97b88]">MARKETING ATTRIBUTION</p>
          <h2 className="mt-2 text-2xl font-semibold">Meta · UTM 유입 성과</h2>
          <p className="mt-2 text-sm text-[#7b6d70]">광고 유입부터 테스트 시작·완료까지 집계합니다. Meta URL Parameters를 설정하면 캠페인·광고·노출위치별로 자동 분류됩니다.</p>
        </section>

        {!loading && !data?.ok ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{data?.message ?? "데이터를 불러오지 못했습니다."}</div> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["전체 유입", k?.totalVisits ?? 0],
            ["Meta 유입", k?.metaVisits ?? 0],
            ["테스트 시작", k?.starts ?? 0],
            ["테스트 완료", k?.completes ?? 0],
            ["시작률", `${k?.startRate ?? 0}%`],
            ["완료율", `${k?.completionRate ?? 0}%`],
          ].map(([label, value]) => <article key={String(label)} className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm"><p className="text-xs text-[#7c6e71]">{label}</p><p className="mt-3 text-2xl font-semibold">{loading ? "—" : value}</p></article>)}
        </section>

        <StatTable title="유입 소스 / 매체" rows={data?.sourceStats ?? []} />

        <section className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap gap-2">
            {[['campaign','캠페인'],['ad','광고 소재'],['placement','노출 위치'],['recent','최근 유입']].map(([id,label]) => <button key={id} onClick={() => setTab(id as typeof tab)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab===id?'bg-[#d88c9c] text-white':'bg-[#f6edef] text-[#6f6063]'}`}>{label}</button>)}
          </div>

          {tab !== "recent" ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs text-[#7b6d70]"><tr><th className="py-2 pr-4">{tab === 'campaign' ? '캠페인' : tab === 'ad' ? '광고' : '노출 위치'}</th><th className="py-2 pr-4">유입</th><th className="py-2 pr-4">시작</th><th className="py-2 pr-4">완료</th><th className="py-2">완료율</th></tr></thead>
                <tbody>{activeRows.length ? activeRows.map(row => <tr key={row.key} className="border-t border-[#f0e7e8]"><td className="max-w-[520px] break-words py-3 pr-4 font-medium">{row.label}</td><td className="py-3 pr-4">{row.visits}</td><td className="py-3 pr-4">{row.starts}</td><td className="py-3 pr-4">{row.completes}</td><td className="py-3">{rate(row.completes,row.starts)}</td></tr>) : <tr><td colSpan={5} className="py-8 text-center text-[#8a7b7e]">UTM/Meta 광고 파라미터가 들어온 뒤 표시됩니다.</td></tr>}</tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm"><thead className="text-left text-xs text-[#7b6d70]"><tr><th className="py-2 pr-3">시각</th><th className="py-2 pr-3">Source / Medium</th><th className="py-2 pr-3">Campaign</th><th className="py-2 pr-3">Ad</th><th className="py-2 pr-3">Placement</th><th className="py-2">결과</th></tr></thead><tbody>{(data?.recent ?? []).map((row,index)=><tr key={`${row.firstSeenAt}-${index}`} className="border-t border-[#f0e7e8]"><td className="whitespace-nowrap py-3 pr-3">{new Date(row.firstSeenAt).toLocaleString('ko-KR')}</td><td className="py-3 pr-3">{row.source} / {row.medium}</td><td className="max-w-[260px] break-words py-3 pr-3">{row.campaign}</td><td className="max-w-[260px] break-words py-3 pr-3">{row.content}</td><td className="py-3 pr-3">{row.placement}</td><td className="py-3">{row.completed ? `완료 ${row.beautyCode ?? ''}` : row.started ? '진행중' : '유입'}</td></tr>)}</tbody></table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
