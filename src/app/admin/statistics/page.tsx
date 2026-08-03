"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  ok: boolean;
  code?: string;
  message?: string;
  kpis?: {
    totalUsers: number;
    testCompleted: number;
    manualSelected: number;
    productRequests: number;
    requestedProducts: number;
    completedProducts: number;
  };
  typeStats?: Array<{ code: string; count: number }>;
  axes?: Record<"O" | "D" | "G" | "M" | "P" | "C" | "V" | "E", number>;
  sourceRatio?: { test: number; manual: number };
};

const nav = [
  ["대시보드", "/admin"],
  ["사용자 통계 상세", "/admin/statistics"],
  ["상품 신청 정보", "/admin/requests"],
  ["분석 작업", "/admin/analysis"],
  ["상품 관리", "/admin/products"],
  ["적합도 결과", "/admin/results"],
  ["운영 설정", "/admin/settings"],
] as const;

const axisPairs = [
  ["O", "지성형", "D", "건성형"],
  ["G", "글로우 선호", "M", "매트함 추구"],
  ["P", "정교함 추구", "C", "간편함 추구"],
  ["V", "변동형", "E", "일관형"],
] as const;

function percent(left: number, right: number) {
  const total = left + right;
  return total ? Math.round((left / total) * 100) : 0;
}

export default function AdminStatisticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setData(payload as DashboardData))
      .catch(() => setData({ ok: false, code: "NETWORK_ERROR" }))
      .finally(() => setLoading(false));
  }, []);

  const typeStats = useMemo(
    () => [...(data?.typeStats ?? [])].sort((a, b) => b.count - a.count),
    [data],
  );
  const totalUsers = data?.kpis?.totalUsers ?? 0;
  const maxType = Math.max(1, ...typeStats.map((item) => item.count));

  return (
    <main className="min-h-screen bg-[#f7f4f4] text-[#382d2d]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-[#eadfe1] bg-[#2f2829] px-5 py-7 text-white lg:block">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#e6b8c2]">LAYAD</p>
          <h1 className="mt-2 text-xl font-semibold">ADMIN</h1>
          <nav className="mt-8 space-y-2">
            {nav.map(([label, href], index) => (
              <Link key={label} href={href} className={`block rounded-xl px-4 py-3 text-sm ${index === 1 ? "bg-[#d88c9c] font-semibold" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-[#eadfe1] bg-white px-5 py-4 sm:px-8">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[#b97b88]">LAYAD ADMIN</p>
              <h2 className="mt-1 text-xl font-semibold">사용자 통계 상세</h2>
            </div>
            <Link href="/admin" className="rounded-full border border-[#ead7db] px-4 py-2 text-sm font-semibold">대시보드로</Link>
          </header>

          <div className="space-y-7 p-5 sm:p-8">
            <section>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#b97b88]">USER STATISTICS</p>
              <h3 className="mt-2 text-2xl font-semibold">Beauty Code 사용자 분포</h3>
              <p className="mt-2 text-sm text-[#7b6d70]">20문항 테스트와 Beauty Code 직접 선택 결과를 함께 집계합니다.</p>
            </section>

            {!loading && !data?.ok ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
                <p className="font-semibold">사용자 통계를 불러오지 못했습니다.</p>
                <p className="mt-2 break-all">{data?.message ?? data?.code ?? "알 수 없는 오류"}</p>
              </div>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-3">
              {[
                ["전체 유형조회", data?.kpis?.totalUsers ?? 0],
                ["20문항 테스트 완료", data?.kpis?.testCompleted ?? 0],
                ["Beauty Code 직접 선택", data?.kpis?.manualSelected ?? 0],
              ].map(([label, value]) => (
                <article key={String(label)} className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm">
                  <p className="text-xs text-[#7c6e71]">{label}</p>
                  <p className="mt-3 text-3xl font-semibold">{loading ? "—" : Number(value).toLocaleString("ko-KR")}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-lg font-semibold">16유형 상세 분포</h3>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {typeStats.map((item, index) => (
                    <div key={item.code} className="rounded-2xl border border-[#eadfe1] bg-[#fffafa] p-4">
                      <div className="flex items-center justify-between">
                        <b>{item.code}</b>
                        <span className="text-[11px] text-[#8b7b7e]">{index + 1}위</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-[#c86f81]">{item.count}</p>
                      <p className="mt-1 text-xs text-[#8b7b7e]">{totalUsers ? ((item.count / totalUsers) * 100).toFixed(1) : "0.0"}%</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f0e4e6]">
                        <div className="h-full rounded-full bg-[#d88c9c]" style={{ width: `${(item.count / maxType) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-lg font-semibold">4축 상세 분포</h3>
                <div className="mt-5 space-y-6">
                  {axisPairs.map(([leftCode, leftLabel, rightCode, rightLabel]) => {
                    const left = data?.axes?.[leftCode] ?? 0;
                    const right = data?.axes?.[rightCode] ?? 0;
                    const leftPercent = percent(left, right);
                    return (
                      <div key={leftCode}>
                        <div className="flex justify-between text-xs text-[#6f6063]">
                          <span>{leftCode} {leftLabel} {leftPercent}%</span>
                          <span>{rightCode} {rightLabel} {100 - leftPercent}%</span>
                        </div>
                        <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-[#f0e4e6]">
                          <div className="bg-[#d88c9c]" style={{ width: `${leftPercent}%` }} />
                          <div className="flex-1 bg-[#9f8b8f]" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-7 grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="rounded-xl bg-[#fff5f6] p-4"><b className="block text-xl">{data?.sourceRatio?.test ?? 0}%</b>20문항 테스트</div>
                  <div className="rounded-xl bg-[#f5f2f2] p-4"><b className="block text-xl">{data?.sourceRatio?.manual ?? 0}%</b>직접 선택</div>
                </div>
              </article>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
