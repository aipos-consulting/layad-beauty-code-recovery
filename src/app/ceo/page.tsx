"use client";

import { useEffect, useState } from "react";

type Dashboard = { ok?: boolean; kpis?: { totalUsers?: number; productRequests?: number; requestedProducts?: number; completedProducts?: number } };
type Usage = { ok?: boolean; spentUsd?: number; budgetUsd?: number; remainingUsd?: number; utilizationPercent?: number; hardStopEnabled?: boolean; blocked?: boolean; localRuns?: { total?: number; completed?: number; failed?: number } };

function money(value: number | undefined) { return `$${Number(value ?? 0).toFixed(4)}`; }

export default function CeoPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/dashboard", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/admin/ai-usage?days=31", { cache: "no-store" }).then(r => r.json()),
    ]).then(([d, u]) => { setDashboard(d); setUsage(u); });
  }, []);

  async function logout() { await fetch("/api/staff-auth/logout", { method: "POST" }); window.location.href = "/ceo/login"; }

  const cards = [
    ["전체 사용자", dashboard?.kpis?.totalUsers ?? "—"],
    ["상품 신청", dashboard?.kpis?.productRequests ?? "—"],
    ["분석 완료 상품", dashboard?.kpis?.completedProducts ?? "—"],
    ["현재 AI 사용료", usage?.ok ? money(usage.spentUsd) : "—"],
    ["월 AI 예산", usage?.ok ? money(usage.budgetUsd) : "—"],
    ["AI 예산 사용률", usage?.ok ? `${Number(usage.utilizationPercent ?? 0).toFixed(2)}%` : "—"],
  ];

  return <main className="min-h-screen bg-[#f7f4f4] p-5 text-[#382d2d] sm:p-8">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-semibold tracking-[.2em] text-[#b97b88]">LAYAD CEO</p><h1 className="mt-2 text-3xl font-semibold">CEO Dashboard</h1><p className="mt-2 text-sm text-[#7b6d70]">서비스 운영·사용자·AI 비용 핵심지표를 확인합니다.</p></div>
        <button onClick={logout} className="rounded-full border border-[#dfd2d5] bg-white px-5 py-3 text-sm font-semibold">로그아웃</button>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => <article key={String(label)} className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><p className="text-sm text-[#7b6d70]">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></article>)}
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">AI Cost Control</h2><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-[#7b6d70]">남은 한도</dt><dd className="font-semibold">{usage?.ok ? money(usage.remainingUsd) : "—"}</dd></div><div className="flex justify-between"><dt className="text-[#7b6d70]">Hard Stop</dt><dd className="font-semibold">{usage?.hardStopEnabled ? "ON" : "확인 필요"}</dd></div><div className="flex justify-between"><dt className="text-[#7b6d70]">서비스 차단 상태</dt><dd className={`font-semibold ${usage?.blocked ? "text-red-700" : "text-emerald-700"}`}>{usage?.blocked ? "차단 중" : "정상"}</dd></div></dl></article>
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">분석 운영 현황</h2><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-[#7b6d70]">총 실행</dt><dd className="font-semibold">{usage?.localRuns?.total ?? "—"}</dd></div><div className="flex justify-between"><dt className="text-[#7b6d70]">완료</dt><dd className="font-semibold">{usage?.localRuns?.completed ?? "—"}</dd></div><div className="flex justify-between"><dt className="text-[#7b6d70]">실패</dt><dd className="font-semibold">{usage?.localRuns?.failed ?? "—"}</dd></div></dl></article>
      </section>
    </div>
  </main>;
}
