"use client";

import { useEffect, useState } from "react";

type Dashboard = { ok?: boolean; kpis?: { totalUsers?: number; productRequests?: number; requestedProducts?: number; completedProducts?: number } };
type Usage = {
  ok?: boolean;
  costAvailable?: boolean;
  costStatus?: string;
  costMessage?: string;
  spentUsd?: number | null;
  budgetUsd?: number;
  remainingUsd?: number | null;
  utilizationPercent?: number | null;
  hardStopEnabled?: boolean;
  blocked?: boolean | null;
  todayTokens?: { date?: string; inputTokens?: number; outputTokens?: number; totalTokens?: number; runs?: number };
  lastCallAt?: string | null;
  refreshedAt?: string;
  timezone?: string;
  localRuns?: { total?: number; completed?: number; failed?: number; inputTokens?: number; outputTokens?: number };
};

function money(value: number | undefined | null) { return `$${Number(value ?? 0).toFixed(4)}`; }
function number(value: number | undefined) { return Number(value ?? 0).toLocaleString("ko-KR"); }
function kstTime(value?: string | null) {
  if (!value) return "아직 호출 없음";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

export default function CeoPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [d, u] = await Promise.all([
          fetch(`/api/admin/dashboard?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
          fetch(`/api/admin/ai-usage?days=31&t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
        ]);
        if (!cancelled) { setDashboard(d); setUsage(u); }
      } catch {
        if (!cancelled) setUsage({ ok: false, costStatus: "read_failed", costMessage: "운영 데이터를 불러오지 못했습니다." });
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  async function logout() { await fetch("/api/staff-auth/logout", { method: "POST" }); window.location.href = "/ceo/login"; }

  const costReady = Boolean(usage?.ok && usage.costAvailable);
  const costNotConfigured = usage?.costStatus === "not_configured";
  const costWaiting = Boolean(usage?.ok && !usage.costAvailable && !costNotConfigured);
  const costLabel = costReady ? money(usage?.spentUsd) : costNotConfigured ? "비용 API 미설정" : "공식 비용 집계 대기";
  const utilizationLabel = costReady ? `${Number(usage?.utilizationPercent ?? 0).toFixed(2)}%` : costNotConfigured ? "비용 API 미설정" : "공식 비용 집계 대기";
  const remainingLabel = costReady ? money(usage?.remainingUsd) : costNotConfigured ? "비용 API 미설정" : "공식 비용 집계 대기";
  const blockedLabel = usage?.blocked === true ? "차단 중" : usage?.blocked === false ? "정상" : costNotConfigured ? "비용 API 미설정" : "비용 집계 확인 중";

  const cards = [
    ["전체 사용자", dashboard?.kpis?.totalUsers ?? "—"],
    ["상품 신청", dashboard?.kpis?.productRequests ?? "—"],
    ["분석 완료 상품", dashboard?.kpis?.completedProducts ?? "—"],
    ["현재 AI 사용료", costLabel],
    ["월 AI 예산", usage?.ok ? money(usage.budgetUsd) : "—"],
    ["AI 예산 사용률", utilizationLabel],
  ];

  return <main className="min-h-screen bg-[#f7f4f4] p-5 text-[#382d2d] sm:p-8">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-semibold tracking-[.2em] text-[#b97b88]">LAYAD CEO</p><h1 className="mt-2 text-3xl font-semibold">CEO Dashboard</h1><p className="mt-2 text-sm text-[#7b6d70]">서비스 운영·사용자·AI 비용 핵심지표를 확인합니다.</p></div>
        <button onClick={logout} className="rounded-full border border-[#dfd2d5] bg-white px-5 py-3 text-sm font-semibold">로그아웃</button>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => <article key={String(label)} className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><p className="text-sm text-[#7b6d70]">{label}</p><p className={`mt-3 font-semibold ${String(value).length > 12 ? "text-lg" : "text-3xl"}`}>{value}</p></article>)}
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">AI Cost Control</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">남은 한도</dt><dd className="text-right font-semibold">{remainingLabel}</dd></div>
            <div className="flex justify-between"><dt className="text-[#7b6d70]">Hard Stop</dt><dd className="font-semibold">{usage?.ok ? (usage.hardStopEnabled ? "ON" : "OFF") : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">서비스 차단 상태</dt><dd className={`text-right font-semibold ${usage?.blocked === true ? "text-red-700" : usage?.blocked === false ? "text-emerald-700" : "text-amber-700"}`}>{blockedLabel}</dd></div>
          </dl>
          <p className="mt-5 text-xs leading-5 text-[#7b6d70]">실시간 토큰은 LAYAD DB 기준이며, 청구 비용·잔여 한도·사용률은 OpenAI 공식 Costs API 집계 후 표시됩니다.</p>
        </article>

        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4"><h2 className="text-lg font-semibold">분석 운영 현황</h2><span className="text-xs text-emerald-700">15초 자동 갱신 · KST</span></div>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between"><dt className="text-[#7b6d70]">총 실행</dt><dd className="font-semibold">{usage?.ok ? number(usage.localRuns?.total) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#7b6d70]">완료</dt><dd className="font-semibold">{usage?.ok ? number(usage.localRuns?.completed) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#7b6d70]">실패</dt><dd className="font-semibold">{usage?.ok ? number(usage.localRuns?.failed) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#7b6d70]">오늘 입력 토큰</dt><dd className="font-semibold">{usage?.ok ? number(usage.todayTokens?.inputTokens) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#7b6d70]">오늘 출력 토큰</dt><dd className="font-semibold">{usage?.ok ? number(usage.todayTokens?.outputTokens) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#7b6d70]">오늘 총 토큰</dt><dd className="font-semibold">{usage?.ok ? number(usage.todayTokens?.totalTokens) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#7b6d70]">마지막 AI 호출</dt><dd className="font-semibold">{kstTime(usage?.lastCallAt)}</dd></div>
          </dl>
        </article>
      </section>

      {costWaiting ? <p className="mt-4 rounded-2xl border border-[#eadfc2] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5a1e]">OpenAI 비용 API는 연결되어 있으나 공식 비용 집계가 아직 반영되지 않았거나 일시적으로 조회 지연 중입니다. 실시간 사용 여부는 우측 토큰 현황을 기준으로 확인하세요.</p> : null}
      {costNotConfigured ? <p className="mt-4 rounded-2xl border border-[#eadfc2] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5a1e]">OpenAI 비용 API 설정값을 확인해야 합니다. 토큰 운영 로그는 계속 집계됩니다.</p> : null}
    </div>
  </main>;
}
