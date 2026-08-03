"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardData = {
  ok: boolean;
  code?: string;
  message?: string;
  kpis?: {
    productRequests: number;
    requestedProducts: number;
    completedProducts: number;
  };
  statusCounts?: Record<string, number>;
  topProducts?: Array<{ name: string; count: number; uniqueSessions: number; topCode: string; status: string }>;
  recentRequests?: Array<{ id: string; value: string; inputType: "name" | "url"; status: string; createdAt: string; beautyCode: string }>;
};

const statusLabel: Record<string, string> = {
  submitted: "신청 접수",
  collecting_reviews: "상품 확인",
  analyzing: "분석 중",
  completed: "분석 완료",
  insufficient_reviews: "분석 불가",
  failed: "처리 실패",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminRequestsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setData(payload as DashboardData))
      .catch(() => setData({ ok: false, code: "NETWORK_ERROR" }))
      .finally(() => setLoading(false));
  }, []);

  const topProducts = data?.topProducts ?? [];
  const recentRequests = data?.recentRequests ?? [];

  return (
    <main className="min-h-screen bg-[#f7f4f4] text-[#382d2d]">
      <header className="flex items-center justify-between border-b border-[#eadfe1] bg-white px-5 py-4 sm:px-8">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#b97b88]">LAYAD ADMIN</p>
          <h1 className="mt-1 text-xl font-semibold">상품 신청 정보</h1>
        </div>
        <Link href="/admin" className="rounded-full border border-[#ead7db] px-4 py-2 text-sm font-semibold">대시보드로</Link>
      </header>

      <div className="mx-auto max-w-[1400px] space-y-7 p-5 sm:p-8">
        <section>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#b97b88]">PRODUCT REQUESTS</p>
          <h2 className="mt-2 text-2xl font-semibold">상품 신청 현황</h2>
          <p className="mt-2 text-sm text-[#7b6d70]">사용자가 등록한 상품명 또는 상품 링크를 집계합니다.</p>
        </section>

        {!loading && !data?.ok ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            <p className="font-semibold">상품 신청 정보를 불러오지 못했습니다.</p>
            <p className="mt-2 break-all">{data?.message ?? data?.code ?? "알 수 없는 오류"}</p>
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            ["전체 상품 신청", data?.kpis?.productRequests ?? 0],
            ["신청 상품 수", data?.kpis?.requestedProducts ?? 0],
            ["분석 완료 상품", data?.kpis?.completedProducts ?? 0],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm">
              <p className="text-xs text-[#7c6e71]">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{loading ? "—" : Number(value).toLocaleString("ko-KR")}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-lg font-semibold">신청 많은 상품</h3>
            <div className="mt-5 space-y-3">
              {topProducts.length ? topProducts.map((product) => (
                <div key={product.name} className="flex items-center gap-3 rounded-2xl border border-[#eee5e7] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0f2] text-xs font-semibold text-[#b76778]">{product.topCode}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="mt-1 text-xs text-[#8a7a7d]">신청 {product.count}건 · 고유 세션 {product.uniqueSessions}</p>
                  </div>
                  <span className="rounded-full border border-[#eadfe1] bg-[#fffafa] px-3 py-1 text-[11px] font-semibold">{statusLabel[product.status] ?? product.status}</span>
                </div>
              )) : <p className="rounded-2xl bg-[#fffafa] p-5 text-sm text-[#806f72]">아직 저장된 상품 신청이 없습니다.</p>}
            </div>
          </article>

          <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-lg font-semibold">처리 상태</h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["신청 접수", data?.statusCounts?.submitted ?? 0],
                ["상품 확인", data?.statusCounts?.collecting_reviews ?? 0],
                ["분석 중", data?.statusCounts?.analyzing ?? 0],
                ["분석 완료", data?.statusCounts?.completed ?? 0],
                ["분석 불가", data?.statusCounts?.insufficient_reviews ?? 0],
                ["처리 실패", data?.statusCounts?.failed ?? 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-[#eee5e7] bg-[#fffafa] p-4">
                  <p className="text-xs text-[#7d6f72]">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="overflow-hidden rounded-3xl border border-[#eadfe1] bg-white shadow-sm">
          <div className="px-5 py-5 sm:px-6"><h3 className="text-lg font-semibold">최근 상품 신청</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#faf7f7] text-xs text-[#75676a]"><tr><th className="px-6 py-3">상품</th><th className="px-6 py-3">입력 유형</th><th className="px-6 py-3">Beauty Code</th><th className="px-6 py-3">상태</th><th className="px-6 py-3">신청 시각</th></tr></thead>
              <tbody className="divide-y divide-[#eee5e7]">
                {recentRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="max-w-[320px] truncate px-6 py-4 font-medium">{request.value}</td>
                    <td className="px-6 py-4">{request.inputType === "url" ? "상품 링크" : "상품명"}</td>
                    <td className="px-6 py-4 font-semibold text-[#b76778]">{request.beautyCode}</td>
                    <td className="px-6 py-4">{statusLabel[request.status] ?? request.status}</td>
                    <td className="px-6 py-4 text-[#7d6f72]">{formatDate(request.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
