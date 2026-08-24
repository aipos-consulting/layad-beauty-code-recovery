"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type FitRow = { beautyCode: string; fitScore: number; reviewCount: number; confidence: number };
type SavedResultPayload = {
  ok?: boolean;
  code?: string;
  message?: string;
  saved?: { productName?: string | null; beautyCode?: string | null; fitScore?: number | null; createdAt?: string | null };
  product?: { canonical_name?: string | null; brand?: string | null; category?: string | null; verification_status?: string | null } | null;
  fits?: FitRow[];
};

function confidenceLabel(value: number) {
  if (value >= 0.85) return "높음";
  if (value >= 0.7) return "보통";
  return "참고용";
}

export default function SavedProductResultPage() {
  const params = useParams<{ productRef: string }>();
  const productRef = String(params?.productRef ?? "");
  const [data, setData] = useState<SavedResultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!productRef) return;
    (async () => {
      try {
        const response = await fetch(`/api/mypage/saved-result?productRef=${encodeURIComponent(productRef)}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({})) as SavedResultPayload;
        if (response.status === 401 || payload.code === "AUTH_REQUIRED") {
          window.location.href = "/account";
          return;
        }
        if (!response.ok || !payload.ok) throw new Error(payload.message || "저장된 분석 결과를 불러오지 못했습니다.");
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장된 분석 결과를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [productRef]);

  const fits = useMemo(() => [...(data?.fits ?? [])].sort((a, b) => b.fitScore - a.fitScore), [data]);
  const mine = fits.find((fit) => fit.beautyCode === data?.saved?.beautyCode) ?? null;
  const confidence = Number(mine?.confidence ?? 0);
  const evidence = Number(mine?.reviewCount ?? 0);
  const score = typeof data?.saved?.fitScore === "number" ? data.saved.fitScore : mine?.fitScore;

  if (loading) return <main className="min-h-screen bg-[#fff8f8] px-5 py-16 text-center text-[#806f72]">저장된 분석 결과를 불러오는 중입니다.</main>;

  return (
    <main className="min-h-screen bg-[#fff8f8] px-5 py-10 pb-28 text-[#382d2d] sm:px-8">
      <section className="mx-auto max-w-2xl rounded-[2rem] bg-white p-7 shadow-[0_24px_70px_rgba(120,70,80,0.12)] sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/mypage" className="text-sm font-semibold text-[#a85f6e]">← My Page</Link>
          <Link href="/fit" className="rounded-full border border-[#e5bcc4] px-4 py-2 text-sm font-semibold text-[#a85f6e]">새 상품 분석</Link>
        </div>

        {error ? (
          <div className="mt-8 rounded-3xl bg-[#fff3df] p-6 text-sm leading-7 text-[#8d5a23]">{error}</div>
        ) : data ? (
          <>
            <div className="mt-8 text-center">
              <p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">SAVED PRODUCT FIT</p>
              <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{data.saved?.productName || data.product?.canonical_name || "저장 상품"}</h1>
              {data.product?.brand ? <p className="mt-2 text-sm text-[#806f72]">{data.product.brand}</p> : null}
            </div>

            <section className="mt-7 rounded-3xl bg-[#fff0f2] p-7 text-center">
              <p className="text-sm font-semibold text-[#9f6572]">저장된 적합도</p>
              <p className="mt-2 text-5xl font-black text-[#c86f82]">{typeof score === "number" ? score : "-"}</p>
              <p className="mt-1 text-sm font-semibold text-[#806f72]">{data.saved?.beautyCode || "Beauty Code"} 기준 · 100점 만점</p>
              {data.saved?.createdAt ? <p className="mt-3 text-xs text-[#9a878b]">{new Date(data.saved.createdAt).toLocaleDateString("ko-KR")} 저장</p> : null}
            </section>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#fff7f8] p-4 text-center">
                <p className="text-xs font-semibold text-[#9b8589]">분석 신뢰도</p>
                <p className="mt-1 text-2xl font-black text-[#a85f6e]">{Math.round(confidence * 100)}%</p>
                <p className="mt-1 text-xs text-[#8a777a]">{confidenceLabel(confidence)}</p>
              </div>
              <div className="rounded-2xl bg-[#fff7f8] p-4 text-center">
                <p className="text-xs font-semibold text-[#9b8589]">공개 근거</p>
                <p className="mt-1 text-2xl font-black text-[#a85f6e]">{evidence}</p>
                <p className="mt-1 text-xs text-[#8a777a]">웹 공개 정보 기준</p>
              </div>
            </div>

            {data.product?.category ? <p className="mt-5 text-sm text-[#766767]">카테고리 · {data.product.category}</p> : null}

            <section className="mt-7 rounded-3xl border border-[#f0dde1] p-5 sm:p-6">
              <h2 className="text-lg font-bold">16개 Beauty Code 적합도</h2>
              <p className="mt-1 text-xs leading-5 text-[#8b787c]">저장 당시 분석 결과를 높은 점수 순으로 표시합니다.</p>
              <div className="mt-4 space-y-2">
                {fits.map((fit, index) => {
                  const isMine = fit.beautyCode === data.saved?.beautyCode;
                  return (
                    <div key={fit.beautyCode} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${isMine ? "bg-[#fff0f2] ring-1 ring-[#e7b8c1]" : "bg-[#faf7f7]"}`}>
                      <span className="w-6 text-xs font-bold text-[#b19da1]">{index + 1}</span>
                      <span className={`w-16 text-sm font-black ${isMine ? "text-[#b75f73]" : "text-[#5f5557]"}`}>{fit.beautyCode}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eadfe1]">
                        <div className="h-full rounded-full bg-[#d88c9c]" style={{ width: `${Math.max(2, Math.min(100, fit.fitScore))}%` }} />
                      </div>
                      <span className={`w-9 text-right text-sm font-black ${isMine ? "text-[#b75f73]" : "text-[#65585b]"}`}>{fit.fitScore}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
