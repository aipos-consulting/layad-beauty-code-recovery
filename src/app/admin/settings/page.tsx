"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Usage = {
  ok: boolean;
  code?: string;
  message?: string;
  source?: string;
  model?: string;
  mode?: string;
  budgetUsd?: number;
  spentUsd?: number;
  remainingUsd?: number;
  utilizationPercent?: number;
  warning?: "normal" | "low" | "high";
  warningLowPercent?: number;
  warningHighPercent?: number;
  hardStopEnabled?: boolean;
  blocked?: boolean;
  month?: string;
  daily?: Array<{ date: string; costUsd: number }>;
  localRuns?: { total: number; completed: number; failed: number; inputTokens: number; outputTokens: number };
};

function money(value: number | undefined) {
  return `$${Number(value ?? 0).toFixed(4)}`;
}

export default function Page() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/ai-usage?days=31", { cache: "no-store" });
        const payload = await response.json() as Usage;
        if (!cancelled) setUsage(payload);
      } catch {
        if (!cancelled) setUsage({ ok: false, message: "AI 비용 데이터를 불러오지 못했습니다." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const maxDaily = useMemo(() => Math.max(0.000001, ...(usage?.daily ?? []).map(row => row.costUsd)), [usage?.daily]);
  const safe = Boolean(usage?.ok && usage.hardStopEnabled && !usage.blocked);

  return <main className="min-h-screen bg-[#f7f4f4] p-5 text-[#382d2d] sm:p-8">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-semibold tracking-[.18em] text-[#b97b88]">LAYAD ADMIN</p><h1 className="mt-2 text-3xl font-semibold">운영 설정 · Cost Control</h1></div>
        <Link href="/admin" className="rounded-full bg-[#382d2d] px-5 py-3 text-sm font-semibold text-white">대시보드</Link>
      </div>
      <p className="mt-3 text-sm text-[#7b6d70]">AI 자동분석 운영상태와 실제 비용, 월 한도 및 자동 차단 상태를 확인합니다.</p>

      <section className="mt-7 grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">분석 운영 방식</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">분석 방식</dt><dd className="text-right font-semibold">OpenAI API 자동 분석</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">모델</dt><dd className="font-semibold">{usage?.model ?? "환경 설정값"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">중복 상품</dt><dd className="font-semibold">기존 분석 결과 재사용</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">공개 근거</dt><dd className="font-semibold">Web Search 기반 리뷰 Evidence</dd></div>
          </dl>
        </article>

        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4"><h2 className="text-lg font-semibold">자동 비용 차단</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${safe ? "bg-emerald-50 text-emerald-700" : usage?.blocked ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{loading ? "확인 중" : safe ? "Hard Stop ON" : usage?.blocked ? "자동 차단 중" : "설정 확인 필요"}</span></div>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">월 예산 한도</dt><dd className="font-semibold">{money(usage?.budgetUsd)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">현재 사용액</dt><dd className="font-semibold">{money(usage?.spentUsd)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">남은 한도</dt><dd className="font-semibold">{money(usage?.remainingUsd)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">사용률</dt><dd className="font-semibold">{Number(usage?.utilizationPercent ?? 0).toFixed(2)}%</dd></div>
          </dl>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#f3e7e9]"><div className="h-full rounded-full bg-[#d88c9c] transition-all" style={{ width: `${Math.min(100, Number(usage?.utilizationPercent ?? 0))}%` }} /></div>
          <p className="mt-4 text-xs leading-5 text-[#7b6d70]">비용은 추정 대시보드 값이 아니라 {usage?.source ?? "OpenAI 공식 Costs API"} 기준으로 확인합니다. 한도 도달 시 신규 AI 분석 요청은 서버에서 차단됩니다.</p>
        </article>
      </section>

      <section className="mt-5 rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-base font-semibold">이번 달 일별 AI 비용 추세</h2><p className="mt-1 text-[11px] text-[#7b6d70]">{usage?.month ?? "현재 월"} · 일별 실제 OpenAI 비용</p></div><div className="text-right text-[11px] text-[#7b6d70]">완료 {usage?.localRuns?.completed ?? 0} · 실패 {usage?.localRuns?.failed ?? 0} · 총 실행 {usage?.localRuns?.total ?? 0}</div></div>
        {loading ? <p className="mt-4 text-sm text-[#7b6d70]">OpenAI 비용을 확인하고 있습니다.</p> : !usage?.ok ? <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800"><b>Cost Control 검증 필요</b><br />{usage?.message ?? usage?.code ?? "비용 데이터를 확인할 수 없습니다."}<br /><span className="text-xs">이 상태에서는 상품 자동분석 API도 안전 차단하도록 설계되어 있습니다.</span></div> : (usage.daily?.length ?? 0) === 0 ? <p className="mt-4 text-sm text-[#7b6d70]">이번 달 OpenAI 비용 기록이 아직 없습니다.</p> : <div className="mt-4 grid gap-x-6 gap-y-1.5 lg:grid-cols-2">{usage.daily?.map(row => <div key={row.date} className="grid grid-cols-[48px_1fr_72px] items-center gap-2 text-[11px]"><span className="text-[#7b6d70]">{row.date.slice(5)}</span><div className="h-2 overflow-hidden rounded-full bg-[#f3e7e9]"><div className="h-full min-w-[2px] rounded-full bg-[#d88c9c]" style={{ width: `${Math.max(1, row.costUsd / maxDaily * 100)}%` }} /></div><span className="text-right font-semibold">{money(row.costUsd)}</span></div>)}</div>}
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">데이터 연결 상태</h2><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-[#7b6d70]">Supabase</dt><dd className="font-semibold text-emerald-700">연결됨</dd></div><div className="flex justify-between"><dt className="text-[#7b6d70]">익명 세션</dt><dd className="font-semibold">사용</dd></div><div className="flex justify-between"><dt className="text-[#7b6d70]">개인정보</dt><dd className="font-semibold">미수집</dd></div></dl></article>
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">관리자 권한</h2><p className="mt-4 text-sm leading-6 text-[#7b6d70]">현재 MVP의 관리자 인증 상태는 별도 Release Gate로 관리합니다. 외부 공개 전 관리자 접근 통제를 확인해야 합니다.</p></article>
      </section>
    </div>
  </main>;
}
