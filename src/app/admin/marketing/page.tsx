"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Stat = { key: string; label: string; visits: number; starts: number; completes: number };
type Row = { firstSeenAt: string; source: string; medium: string; campaign: string; content: string; placement: string; started: boolean; completed: boolean; beautyCode: string | null };
type DailyTrend = { date: string; label: string; visits: number; starts: number; completes: number };
type Data = {
  ok: boolean;
  message?: string;
  kpis?: {
    totalVisits: number;
    metaVisits: number;
    starts: number;
    completes: number;
    cafeClicks: number;
    kakaoShares: number;
    kakaoShareVisits: number;
    kakaoShareRate: number;
    startRate: number;
    completionRate: number;
    cafeClickRate: number;
  };
  dailyTrend?: DailyTrend[];
  sourceStats?: Stat[];
  campaignStats?: Stat[];
  adStats?: Stat[];
  placementStats?: Stat[];
  recent?: Row[];
};

function rate(done: number, base: number) {
  return base ? `${((done / base) * 100).toFixed(1)}%` : "0.0%";
}

function ownerFriendlyChannel(label: string) {
  const normalized = label.trim().toLowerCase();
  const aliases: Record<string, string> = {
    "ig / paid": "인스타그램 광고",
    "ig / paid_social": "인스타그램 광고",
    "instagram / paid": "인스타그램 광고",
    "instagram / paid_social": "인스타그램 광고",
    "instagram / referral": "인스타그램 일반 유입",
    "fb / paid": "페이스북 광고",
    "fb / paid_social": "페이스북 광고",
    "facebook / paid": "페이스북 광고",
    "facebook / paid_social": "페이스북 광고",
    "facebook / referral": "페이스북 일반 유입",
    "naver_cafe / community": "네이버카페",
    "naver cafe / community": "네이버카페",
    "cafe.naver.com / community": "네이버카페",
    "naver / organic": "네이버 검색 유입",
    "google / organic": "구글 검색 유입",
    "direct / none": "직접 유입",
    "google / cpc": "구글 검색광고",
    "naver / cpc": "네이버 검색광고",
    "kakao / share": "카카오톡 공유 유입",
    "kakao / social": "카카오 유입",
    "link_copy / share": "링크 복사 공유 유입",
    "line / referral": "LINE 유입",
    "line / social": "LINE 유입",
  };
  if (aliases[normalized]) return aliases[normalized];

  const [sourceRaw, mediumRaw] = label.split("/").map((value) => value.trim());
  const sourceNames: Record<string, string> = {
    ig: "인스타그램", instagram: "인스타그램", fb: "페이스북", facebook: "페이스북", meta: "Meta",
    google: "구글", naver: "네이버", naver_cafe: "네이버카페", "naver cafe": "네이버카페", "cafe.naver.com": "네이버카페",
    kakao: "카카오", link_copy: "링크 복사", line: "LINE", direct: "직접",
  };
  const mediumNames: Record<string, string> = {
    paid: "광고", paid_social: "광고", cpc: "검색광고", share: "공유 유입", referral: "일반 유입", social: "소셜 유입", community: "커뮤니티 유입", organic: "검색 유입", none: "유입",
  };
  const source = sourceNames[sourceRaw?.toLowerCase()] ?? sourceRaw;
  const medium = mediumNames[mediumRaw?.toLowerCase()] ?? mediumRaw;
  if (source === "네이버카페") return "네이버카페";
  return [source, medium].filter(Boolean).join(" · ");
}

function StatTable({ title, rows }: { title: string; rows: Stat[] }) {
  return (
    <section className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs text-[#7b6d70]"><tr><th className="py-2 pr-4">유입 경로</th><th className="py-2 pr-4">유입</th><th className="py-2 pr-4">테스트 시작</th><th className="py-2 pr-4">테스트 완료</th><th className="py-2">완료율</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.key} className="border-t border-[#f0e7e8]">
                <td className="max-w-[420px] break-words py-3 pr-4 font-medium">{ownerFriendlyChannel(row.label)}</td>
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

function TrendChart({ rows }: { rows: DailyTrend[] }) {
  if (!rows.length) return <div className="py-12 text-center text-sm text-[#8a7b7e]">일별 데이터가 아직 없습니다.</div>;

  const width = 1000;
  const height = 300;
  const left = 56;
  const right = 20;
  const top = 20;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(1, ...rows.flatMap((row) => [row.visits, row.starts, row.completes]));
  const scaleY = (value: number) => top + plotHeight - (value / maxValue) * plotHeight;
  const scaleX = (index: number) => rows.length === 1 ? left + plotWidth / 2 : left + (index / (rows.length - 1)) * plotWidth;
  const points = (key: "visits" | "starts" | "completes") => rows.map((row, index) => `${scaleX(index)},${scaleY(row[key])}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({ ratio, value: Math.round(maxValue * ratio) }));
  const showEvery = Math.max(1, Math.ceil(rows.length / 8));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="일별 유입, 테스트 시작, 테스트 완료 추이">
          {ticks.map(({ ratio, value }) => {
            const y = top + plotHeight - ratio * plotHeight;
            return <g key={ratio}><line x1={left} y1={y} x2={width - right} y2={y} stroke="#eee5e7" strokeWidth="1" /><text x={left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#8a7b7e">{value}</text></g>;
          })}
          <polyline points={points("visits")} fill="none" stroke="#382d2d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={points("starts")} fill="none" stroke="#d88c9c" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={points("completes")} fill="none" stroke="#a94f65" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {rows.map((row, index) => {
            const x = scaleX(index);
            const showLabel = index % showEvery === 0 || index === rows.length - 1;
            return <g key={row.date}>
              <circle cx={x} cy={scaleY(row.visits)} r="4" fill="#382d2d"><title>{`${row.label} 유입 ${row.visits}`}</title></circle>
              <circle cx={x} cy={scaleY(row.starts)} r="4" fill="#d88c9c"><title>{`${row.label} 시작 ${row.starts}`}</title></circle>
              <circle cx={x} cy={scaleY(row.completes)} r="4" fill="#a94f65"><title>{`${row.label} 완료 ${row.completes}`}</title></circle>
              {showLabel ? <text x={x} y={height - 14} textAnchor="middle" fontSize="11" fill="#7b6d70">{row.label}</text> : null}
            </g>;
          })}
        </svg>
      </div>
    </div>
  );
}

export default function AdminMarketingPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"campaign" | "ad" | "placement" | "recent">("campaign");
  const [trendDays, setTrendDays] = useState<7 | 30>(7);

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
  const trendRows = useMemo(() => (data?.dailyTrend ?? []).slice(-trendDays), [data, trendDays]);

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
          <h2 className="mt-2 text-2xl font-semibold">채널별 유입 성과</h2>
          <p className="mt-2 text-sm text-[#7b6d70]">광고·공유 링크·검색·커뮤니티 등 식별 가능한 경로를 우선 분리하고, 출처를 확인할 수 없는 경우만 직접 유입으로 표시합니다.</p>
        </section>

        {!loading && !data?.ok ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{data?.message ?? "데이터를 불러오지 못했습니다."}</div> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
          {[
            ["전체 유입", k?.totalVisits ?? 0],
            ["Meta 유입", k?.metaVisits ?? 0],
            ["테스트 시작", k?.starts ?? 0],
            ["테스트 완료", k?.completes ?? 0],
            ["시작률", `${k?.startRate ?? 0}%`],
            ["완료율", `${k?.completionRate ?? 0}%`],
            ["카페 이동", k?.cafeClicks ?? 0],
            ["카페 이동률", `${k?.cafeClickRate ?? 0}%`],
          ].map(([label, value]) => <article key={String(label)} className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm"><p className="text-xs text-[#7c6e71]">{label}</p><p className="mt-3 text-2xl font-semibold">{loading ? "—" : value}</p></article>)}
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            ["카카오 공유 실행", k?.kakaoShares ?? 0],
            ["카카오 공유 유입", k?.kakaoShareVisits ?? 0],
            ["공유→유입률", `${k?.kakaoShareRate ?? 0}%`],
          ].map(([label, value]) => <article key={String(label)} className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm"><p className="text-xs text-[#7c6e71]">{label}</p><p className="mt-3 text-2xl font-semibold">{loading ? "—" : value}</p></article>)}
        </section>

        <section className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">일별 유입·테스트 추이</h3>
              <p className="mt-1 text-xs text-[#7b6d70]">서울시간 기준 · 유입 / 테스트 시작 / 테스트 완료</p>
            </div>
            <div className="flex rounded-full bg-[#f6edef] p-1 text-xs font-semibold">
              {[7, 30].map((days) => <button key={days} type="button" onClick={() => setTrendDays(days as 7 | 30)} className={`rounded-full px-4 py-2 ${trendDays === days ? "bg-[#d88c9c] text-white" : "text-[#6f6063]"}`}>최근 {days}일</button>)}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-5 text-xs font-semibold text-[#6f6063]">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#382d2d]" />유입</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#d88c9c]" />테스트 시작</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#a94f65]" />테스트 완료</span>
          </div>
          <div className="mt-3">{loading ? <div className="py-12 text-center text-sm text-[#8a7b7e]">불러오는 중...</div> : <TrendChart rows={trendRows} />}</div>
        </section>

        <StatTable title="유입 경로별 성과" rows={data?.sourceStats ?? []} />

        <section className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap gap-2">
            {[["campaign","캠페인"],["ad","광고 소재"],["placement","노출 위치"],["recent","최근 유입"]].map(([id,label]) => <button key={id} onClick={() => setTab(id as typeof tab)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab===id?"bg-[#d88c9c] text-white":"bg-[#f6edef] text-[#6f6063]"}`}>{label}</button>)}
          </div>

          {tab !== "recent" ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs text-[#7b6d70]"><tr><th className="py-2 pr-4">{tab === "campaign" ? "캠페인" : tab === "ad" ? "광고" : "노출 위치"}</th><th className="py-2 pr-4">유입</th><th className="py-2 pr-4">시작</th><th className="py-2 pr-4">완료</th><th className="py-2">완료율</th></tr></thead>
                <tbody>{activeRows.length ? activeRows.map(row => <tr key={row.key} className="border-t border-[#f0e7e8]"><td className="max-w-[520px] break-words py-3 pr-4 font-medium">{row.label}</td><td className="py-3 pr-4">{row.visits}</td><td className="py-3 pr-4">{row.starts}</td><td className="py-3 pr-4">{row.completes}</td><td className="py-3">{rate(row.completes,row.starts)}</td></tr>) : <tr><td colSpan={5} className="py-8 text-center text-[#8a7b7e]">UTM/Meta 광고 파라미터가 들어온 뒤 표시됩니다.</td></tr>}</tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm"><thead className="text-left text-xs text-[#7b6d70]"><tr><th className="py-2 pr-3">시각</th><th className="py-2 pr-3">유입 경로</th><th className="py-2 pr-3">캠페인</th><th className="py-2 pr-3">광고 소재</th><th className="py-2 pr-3">노출 위치</th><th className="py-2">결과</th></tr></thead><tbody>{(data?.recent ?? []).map((row,index)=><tr key={`${row.firstSeenAt}-${index}`} className="border-t border-[#f0e7e8]"><td className="whitespace-nowrap py-3 pr-3">{new Date(row.firstSeenAt).toLocaleString("ko-KR")}</td><td className="py-3 pr-3">{ownerFriendlyChannel(`${row.source} / ${row.medium}`)}</td><td className="max-w-[260px] break-words py-3 pr-3">{row.campaign}</td><td className="max-w-[260px] break-words py-3 pr-3">{row.content}</td><td className="py-3 pr-3">{row.placement}</td><td className="py-3">{row.completed ? `완료 ${row.beautyCode ?? ""}` : row.started ? "진행중" : "유입"}</td></tr>)}</tbody></table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
