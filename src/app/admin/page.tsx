"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  ok: boolean;
  generatedAt?: string;
  code?: string;
  message?: string;
  missing?: string[];
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
  statusCounts?: Record<string, number>;
  topProducts?: Array<{ name: string; count: number; uniqueSessions: number; topCode: string; status: string }>;
  recentRequests?: Array<{ id: string; value: string; inputType: "name" | "url"; status: string; createdAt: string; beautyCode: string }>;
};

type ViewMode = "users" | "products";

const nav = [
  ["대시보드", "/admin"],
  ["사용자 통계 상세", "/admin/statistics"],
  ["상품 신청 정보", "/admin/requests"],
  ["분석 작업", "/admin/analysis"],
  ["상품 관리", "/admin/products"],
  ["적합도 결과", "/admin/results"],
  ["운영 설정", "/admin/settings"],
] as const;

const statusLabel: Record<string, string> = {
  submitted: "신청 접수",
  collecting_reviews: "상품 확인",
  insufficient_reviews: "분석 불가",
  analyzing: "분석 중",
  completed: "분석 완료",
  failed: "처리 실패",
};

const statusClass: Record<string, string> = {
  submitted: "border-slate-200 bg-slate-50 text-slate-700",
  collecting_reviews: "border-sky-200 bg-sky-50 text-sky-700",
  insufficient_reviews: "border-rose-200 bg-rose-50 text-rose-700",
  analyzing: "border-violet-200 bg-violet-50 text-violet-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("users");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
        const payload = (await response.json()) as DashboardData;
        if (active) setData(payload);
      } catch {
        if (active) setData({ ok: false, code: "NETWORK_ERROR", message: "관리자 통계 API에 연결할 수 없습니다." });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const typeStats = data?.typeStats ?? [];
  const rankedTypes = [...typeStats].sort((a, b) => b.count - a.count);
  const rankMap = new Map(rankedTypes.map((item, index) => [item.code, index + 1]));
  const maxType = Math.max(1, ...typeStats.map((item) => item.count));
  const totalUsers = data?.kpis?.totalUsers ?? 0;
  const axes = data?.axes;
  const topProducts = data?.topProducts ?? [];
  const recentRequests = data?.recentRequests ?? [];

  const userKpis = useMemo(() => [
    ["전체 유형조회", data?.kpis?.totalUsers ?? 0],
    ["20문항 테스트 완료", data?.kpis?.testCompleted ?? 0],
    ["Beauty Code 직접 선택", data?.kpis?.manualSelected ?? 0],
  ], [data]);

  const productKpis = useMemo(() => [
    ["상품 신청", data?.kpis?.productRequests ?? 0],
    ["신청 상품", data?.kpis?.requestedProducts ?? 0],
    ["분석 완료", data?.kpis?.completedProducts ?? 0],
  ], [data]);

  const errorText = data?.code === "SUPABASE_NOT_CONFIGURED"
    ? `Vercel 환경변수를 확인해 주세요.${data.missing?.length ? ` 누락: ${data.missing.join(", ")}` : ""}`
    : data?.message ?? "관리자 통계 조회 중 오류가 발생했습니다.";

  return (
    <main className="min-h-screen bg-[#f7f4f4] text-[#382d2d]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-[#eadfe1] bg-[#2f2829] px-5 py-7 text-white lg:block">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#e6b8c2]">LAYAD</p>
          <h1 className="mt-2 text-xl font-semibold">ADMIN</h1>
          <nav className="mt-8 space-y-2">
            {nav.map(([label, href], index) => (
              <Link key={label} href={href} className={`block rounded-xl px-4 py-3 text-sm ${index === 0 ? "bg-[#d88c9c] font-semibold" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-white/70">
            MVP 운영 모드<br />ChatGPT Plus 수동 분석<br />OpenAI API 미사용
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#eadfe1] bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[#b97b88]">LAYAD ADMIN</p>
              <h2 className="mt-1 text-xl font-semibold">대시보드</h2>
            </div>
            <span className="rounded-full bg-[#382d2d] px-4 py-2 text-sm font-semibold text-white">프로토타입</span>
          </header>

          <div className="space-y-7 p-5 sm:p-8">
            <section>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#b97b88]">LIVE OVERVIEW</p>
              <h3 className="mt-2 text-2xl font-semibold">신청 현황</h3>
              <p className="mt-2 text-sm text-[#7b6d70]">
                {loading ? "Supabase 데이터를 불러오는 중입니다." : data?.ok ? "실제 저장 데이터를 기준으로 표시합니다." : "Supabase 데이터를 불러오지 못했습니다."}
              </p>

              <div className="mt-5 inline-flex w-full rounded-2xl border border-[#e4d6d9] bg-white p-1.5 shadow-sm sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewMode("users")}
                  className={`flex-1 rounded-xl px-5 py-3 text-sm font-semibold transition sm:flex-none ${viewMode === "users" ? "bg-[#382d2d] text-white shadow-sm" : "text-[#76676a] hover:bg-[#fff4f6]"}`}
                >
                  사용자 유형조회 신청현황
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("products")}
                  className={`flex-1 rounded-xl px-5 py-3 text-sm font-semibold transition sm:flex-none ${viewMode === "products" ? "bg-[#382d2d] text-white shadow-sm" : "text-[#76676a] hover:bg-[#fff4f6]"}`}
                >
                  상품 신청 현황
                </button>
              </div>

              {!loading && !data?.ok ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  <p className="font-semibold">관리자 통계를 불러오지 못했습니다.</p>
                  <p className="mt-1 break-words text-xs leading-5">{errorText}</p>
                </div>
              ) : null}
            </section>

            {viewMode === "users" ? (
              <>
                <section className="grid gap-3 sm:grid-cols-3">
                  {userKpis.map(([label, value]) => (
                    <article key={label} className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm">
                      <p className="text-xs font-medium text-[#7c6e71]">{label}</p>
                      <p className="mt-3 text-2xl font-semibold">{loading ? "—" : Number(value).toLocaleString("ko-KR")}</p>
                    </article>
                  ))}
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                  <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center justify-between">
                      <div><p className="text-xs font-semibold tracking-[0.16em] text-[#b97b88]">BEAUTY CODE</p><h3 className="mt-2 text-lg font-semibold">16유형 신청 현황</h3></div>
                      <Link href="/admin/statistics" className="text-sm font-semibold text-[#b76778]">상세 통계 →</Link>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {typeStats.map((item) => (
                        <article key={item.code} className="rounded-2xl border border-[#eadfe1] bg-[#fffafa] p-4">
                          <div className="flex justify-between"><b className="text-sm">{item.code}</b><span className="text-[11px] text-[#8b7b7e]">{rankMap.get(item.code) ?? "-"}위</span></div>
                          <p className="mt-2 text-xl font-semibold text-[#c86f81]">{item.count}</p>
                          <p className="mt-1 text-[11px] text-[#8b7b7e]">{totalUsers ? ((item.count / totalUsers) * 100).toFixed(1) : "0.0"}%</p>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f0e4e6]"><div className="h-full rounded-full bg-[#d88c9c]" style={{ width: `${(item.count / maxType) * 100}%` }} /></div>
                        </article>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
                    <p className="text-xs font-semibold tracking-[0.16em] text-[#b97b88]">AXIS SUMMARY</p>
                    <h3 className="mt-2 text-lg font-semibold">4축 분포</h3>
                    <div className="mt-5 space-y-5">
                      {axisPairs.map(([leftCode, leftLabel, rightCode, rightLabel]) => {
                        const left = axes?.[leftCode] ?? 0;
                        const right = axes?.[rightCode] ?? 0;
                        const leftPercent = percent(left, right);
                        return (
                          <div key={leftCode}>
                            <div className="flex justify-between text-xs text-[#6f6063]"><span>{leftCode} {leftLabel} {leftPercent}%</span><span>{rightCode} {rightLabel} {100 - leftPercent}%</span></div>
                            <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-[#f0e4e6]"><div className="bg-[#d88c9c]" style={{ width: `${leftPercent}%` }} /><div className="flex-1 bg-[#9f8b8f]" /></div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3 text-center text-xs">
                      <div className="rounded-xl bg-[#fff5f6] p-3"><b className="block text-lg">{data?.sourceRatio?.test ?? 0}%</b>20문항 테스트</div>
                      <div className="rounded-xl bg-[#f5f2f2] p-3"><b className="block text-lg">{data?.sourceRatio?.manual ?? 0}%</b>Beauty Code 직접 선택</div>
                    </div>
                  </article>
                </section>
              </>
            ) : (
              <>
                <section className="grid gap-3 sm:grid-cols-3">
                  {productKpis.map(([label, value]) => (
                    <article key={label} className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm">
                      <p className="text-xs font-medium text-[#7c6e71]">{label}</p>
                      <p className="mt-3 text-2xl font-semibold">{loading ? "—" : Number(value).toLocaleString("ko-KR")}</p>
                    </article>
                  ))}
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
                  <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">신청 많은 상품</h3><Link href="/admin/requests" className="text-sm font-semibold text-[#b76778]">전체 보기 →</Link></div>
                    <div className="mt-5 space-y-3">
                      {topProducts.length ? topProducts.map((product) => (
                        <div key={product.name} className="flex items-center gap-3 rounded-2xl border border-[#eee5e7] p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0f2] text-xs font-semibold text-[#b76778]">{product.topCode}</div>
                          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{product.name}</p><p className="mt-1 text-xs text-[#8a7a7d]">신청 {product.count}건 · 고유 세션 {product.uniqueSessions}</p></div>
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${statusClass[product.status] ?? statusClass.submitted}`}>{statusLabel[product.status] ?? product.status}</span>
                        </div>
                      )) : <p className="rounded-2xl bg-[#fffafa] p-5 text-sm text-[#806f72]">아직 저장된 상품 신청이 없습니다.</p>}
                    </div>
                  </article>

                  <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="text-lg font-semibold">상품 처리 현황</h3>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {[
                        ["신청 접수", data?.statusCounts?.submitted ?? 0],
                        ["상품 확인", data?.statusCounts?.collecting_reviews ?? 0],
                        ["분석 중", data?.statusCounts?.analyzing ?? 0],
                        ["분석 완료", data?.statusCounts?.completed ?? 0],
                        ["분석 불가", data?.statusCounts?.insufficient_reviews ?? 0],
                        ["처리 실패", data?.statusCounts?.failed ?? 0],
                      ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-[#eee5e7] bg-[#fffafa] p-4"><p className="text-xs text-[#7d6f72]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
                    </div>
                  </article>
                </section>

                <section className="overflow-hidden rounded-3xl border border-[#eadfe1] bg-white shadow-sm">
                  <div className="flex items-center justify-between px-5 py-5 sm:px-6"><h3 className="text-lg font-semibold">최근 상품 신청</h3><Link href="/admin/requests" className="text-sm font-semibold text-[#b76778]">상품 신청 정보 →</Link></div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-[#faf7f7] text-xs text-[#75676a]"><tr><th className="px-6 py-3">상품</th><th className="px-6 py-3">입력 유형</th><th className="px-6 py-3">Beauty Code</th><th className="px-6 py-3">상태</th><th className="px-6 py-3">신청 시각</th></tr></thead>
                      <tbody className="divide-y divide-[#eee5e7]">
                        {recentRequests.length ? recentRequests.map((request) => (
                          <tr key={request.id}><td className="max-w-[300px] truncate px-6 py-4 font-medium">{request.value}</td><td className="px-6 py-4">{request.inputType === "url" ? "상품 링크" : "상품명"}</td><td className="px-6 py-4 font-semibold text-[#b76778]">{request.beautyCode}</td><td className="px-6 py-4"><span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusClass[request.status] ?? statusClass.submitted}`}>{statusLabel[request.status] ?? request.status}</span></td><td className="px-6 py-4 text-[#7d6f72]">{formatDate(request.createdAt)}</td></tr>
                        )) : <tr><td colSpan={5} className="px-6 py-8 text-center text-[#806f72]">아직 저장된 상품 신청이 없습니다.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
