"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import ProductFitEvidencePanel from "./product-fit-evidence-panel";

const LAST_FIT_STATE_KEY = "layad-last-product-fit-state-v1";

type CodeRow = { beauty_code: string; is_current: boolean };
type MyPagePayload = { ok?: boolean; code?: string; codes?: CodeRow[] };
type FastPayload = {
  ok?: boolean;
  status?: string;
  cached?: boolean;
  requestId?: string;
  sessionId?: string;
  productName?: string;
  beautyCode?: string;
  fitScore?: number;
  confidence?: number;
  reviewCount?: number;
  message?: string;
  timings?: { beginMs?: number; openAiMs?: number; finalizeMs?: number; totalMs?: number };
};

type FitRow = { beautyCode: string; fitScore: number; reviewCount: number; confidence: number };
type DetailPayload = {
  ok?: boolean;
  status?: string;
  message?: string;
  product?: { canonical_name?: string | null; brand?: string | null; category?: string | null; verification_status?: string | null } | null;
  userBeautyCode?: string | null;
  fits?: FitRow[];
};

type ResultState = {
  productName: string;
  score: number;
  requestId: string;
  sessionId: string;
  confidence: number;
  reviewCount: number;
};

type StoredFitState = {
  beautyCode: string;
  result: ResultState;
  detail: DetailPayload | null;
};

function confidenceLabel(value: number) {
  if (value >= 0.85) return "높음";
  if (value >= 0.7) return "보통";
  return "참고용";
}

function persistFitState(beautyCode: string, result: ResultState, detail: DetailPayload | null) {
  try {
    localStorage.setItem(LAST_FIT_STATE_KEY, JSON.stringify({ beautyCode, result, detail } satisfies StoredFitState));
  } catch {
    // Browser storage can be unavailable in private/restricted modes.
  }
}

export default function FitPage() {
  const [beautyCode, setBeautyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [productInput, setProductInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/mypage", { cache: "no-store" });
        const payload = await response.json().catch(() => ({})) as MyPagePayload;
        if (response.status === 401 || payload.code === "AUTH_REQUIRED") {
          setAuthRequired(true);
          return;
        }
        if (!response.ok || !payload.ok) throw new Error();
        const current = payload.codes?.find((code) => code.is_current) ?? payload.codes?.[0] ?? null;
        const currentCode = current?.beauty_code ?? null;
        setBeautyCode(currentCode);

        if (currentCode) {
          try {
            const raw = localStorage.getItem(LAST_FIT_STATE_KEY);
            if (raw) {
              const saved = JSON.parse(raw) as StoredFitState;
              if (saved?.beautyCode === currentCode && saved.result?.requestId && saved.result?.sessionId) {
                setResult(saved.result);
                setDetail(saved.detail ?? null);
                window.setTimeout(() => {
                  document.getElementById("fit-analysis-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 120);
              }
            }
          } catch {
            // Ignore stale or malformed browser state.
          }
        }
      } catch {
        setMessage("저장된 Beauty Code를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sortedFits = useMemo(() => {
    return [...(detail?.fits ?? [])].sort((a, b) => b.fitScore - a.fitScore);
  }, [detail]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!beautyCode || !productInput.trim() || busy) return;

    const inputValue = productInput.trim();
    setBusy(true);
    setMessage("상품 정보를 확인하고 적합도를 분석하고 있습니다.");
    setResult(null);
    setDetail(null);
    setDetailError("");
    try { localStorage.removeItem(LAST_FIT_STATE_KEY); } catch {}

    try {
      const response = await fetch("/api/product-fit-fast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beautyCode, inputValue }),
      });
      const payload = await response.json().catch(() => ({})) as FastPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "적합도 분석에 실패했습니다.");
      }
      if (payload.status !== "completed" || typeof payload.fitScore !== "number") {
        setMessage(payload.message || "상품을 특정할 수 없어 분석을 완료하지 못했습니다.");
        return;
      }
      if (!payload.requestId || !payload.sessionId) {
        throw new Error("상세 분석 결과 연결 정보를 생성하지 못했습니다.");
      }

      const nextResult: ResultState = {
        productName: payload.productName || inputValue,
        score: payload.fitScore,
        requestId: payload.requestId,
        sessionId: payload.sessionId,
        confidence: Number(payload.confidence ?? 0),
        reviewCount: Number(payload.reviewCount ?? 0),
      };
      setResult(nextResult);
      persistFitState(beautyCode, nextResult, null);
      setMessage("");
      setProductInput("");
      window.setTimeout(() => {
        document.getElementById("fit-analysis-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "적합도 분석에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function loadDetail() {
    if (!result || detailBusy || !beautyCode) return;
    if (detail) {
      setDetail(null);
      persistFitState(beautyCode, result, null);
      return;
    }

    setDetailBusy(true);
    setDetailError("");
    try {
      const response = await fetch(
        `/api/product-analysis-result?sessionId=${encodeURIComponent(result.sessionId)}&requestId=${encodeURIComponent(result.requestId)}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({})) as DetailPayload;
      if (!response.ok || !payload.ok || payload.status !== "completed" || !payload.fits?.length) {
        throw new Error(payload.message || "상세 분석 결과를 불러오지 못했습니다.");
      }
      setDetail(payload);
      persistFitState(beautyCode, result, payload);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "상세 분석 결과를 불러오지 못했습니다.");
    } finally {
      setDetailBusy(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#fff8f8] px-5 py-16 text-center text-[#806f72]">Beauty Code를 확인하는 중입니다.</main>;

  if (authRequired) {
    return (
      <main className="min-h-screen bg-[#fff8f8] px-5 py-14 text-[#382d2d]">
        <section className="mx-auto max-w-md rounded-[2rem] bg-white p-8 text-center shadow-[0_24px_70px_rgba(120,70,80,0.12)]">
          <p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">PRODUCT FIT</p>
          <h1 className="mt-4 text-3xl font-semibold">상품 적합도 분석</h1>
          <p className="mt-4 text-sm leading-7 text-[#766767]">저장된 Beauty Code로 바로 분석하려면 로그인해 주세요.</p>
          <Link href="/account" className="mt-7 block rounded-2xl bg-[#d88c9c] px-5 py-3.5 font-semibold text-white">로그인 · 회원가입</Link>
          <Link href="/test" className="mt-3 block rounded-2xl border border-[#ead7db] px-5 py-3.5 font-semibold text-[#806f72]">처음 Beauty Code 테스트하기</Link>
        </section>
      </main>
    );
  }

  if (!beautyCode) {
    return (
      <main className="min-h-screen bg-[#fff8f8] px-5 py-14 text-[#382d2d]">
        <section className="mx-auto max-w-md rounded-[2rem] bg-white p-8 text-center shadow-[0_24px_70px_rgba(120,70,80,0.12)]">
          <p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">PRODUCT FIT</p>
          <h1 className="mt-4 text-3xl font-semibold">먼저 Beauty Code가 필요합니다</h1>
          <p className="mt-4 text-sm leading-7 text-[#766767]">테스트는 최초 한 번만 하면 되고, 저장된 이후에는 이 화면에서 계속 상품 적합도를 분석할 수 있습니다.</p>
          <Link href="/test" className="mt-7 block rounded-2xl bg-[#d88c9c] px-5 py-3.5 font-semibold text-white">Beauty Code 테스트하기</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8f8] px-5 py-10 pb-28 text-[#382d2d] sm:px-8">
      <section className="mx-auto max-w-2xl rounded-[2rem] bg-white p-7 shadow-[0_24px_70px_rgba(120,70,80,0.12)] sm:p-10">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">PRODUCT FIT ANALYSIS</p>
          <h1 className="mt-4 text-3xl font-semibold">상품 적합도 분석</h1>
          <p className="mt-3 text-sm leading-7 text-[#766767]">현재 Beauty Code <strong className="text-[#a85f6e]">{beautyCode}</strong> 기준으로 분석합니다.</p>
        </div>

        <form onSubmit={submit} data-direct-product-fit="true" className="mt-8 rounded-3xl border border-[#f1dfe2] bg-[#fffafa] p-5 sm:p-6">
          <label htmlFor="fit-product-input" className="text-sm font-semibold">상품명 또는 상품 링크</label>
          <input
            id="fit-product-input"
            value={productInput}
            onChange={(event) => setProductInput(event.target.value)}
            placeholder="예: 에스티로더 더블웨어 파운데이션"
            maxLength={2000}
            className="mt-3 w-full rounded-2xl border border-[#e8cfd4] bg-white px-4 py-3 text-sm outline-none focus:border-[#d88c9c] focus:ring-2 focus:ring-[#f4dce1]"
          />
          <button type="submit" disabled={!productInput.trim() || busy} className="mt-3 w-full rounded-2xl bg-[#d88c9c] px-6 py-3 text-sm font-semibold text-white enabled:hover:bg-[#c8798a] disabled:cursor-not-allowed disabled:bg-[#d8cccc]">
            {busy ? "분석 중..." : "분석 시작하기"}
          </button>
        </form>

        {message ? <p className="mt-5 rounded-2xl bg-[#fff3df] p-4 text-sm leading-6 text-[#8d5a23]">{message}</p> : null}

        {result ? (
          <div id="fit-analysis-result" className="scroll-mt-6">
            <section className="mt-6 rounded-3xl bg-[#fff0f2] p-7 text-center">
              <p className="text-sm font-semibold text-[#9f6572]">{result.productName}</p>
              <p className="mt-2 text-5xl font-black text-[#c86f82]">{result.score}</p>
              <p className="mt-1 text-sm font-semibold text-[#806f72]">{beautyCode} 기준 · 100점 만점</p>
              <button
                type="button"
                onClick={loadDetail}
                disabled={detailBusy}
                className="mt-5 w-full rounded-2xl border border-[#dba6b1] bg-white px-5 py-3 text-sm font-bold text-[#a85f6e] disabled:opacity-60"
              >
                {detailBusy ? "상세 결과 불러오는 중..." : detail ? "상세 결과 접기" : "분석 결과 자세히 보기"}
              </button>
            </section>

            {detailError ? <p className="mt-4 rounded-2xl bg-[#fff3df] p-4 text-sm leading-6 text-[#8d5a23]">{detailError}</p> : null}

            {detail ? (
              <section className="mt-5 rounded-3xl border border-[#f0dde1] bg-white p-5 sm:p-6">
                <div className="border-b border-[#f1e4e6] pb-5">
                  <p className="text-xs font-bold tracking-[.16em] text-[#b97b88]">DETAIL RESULT</p>
                  <h2 className="mt-2 text-xl font-bold">상세 분석 결과</h2>
                  {detail.product?.brand ? <p className="mt-2 text-sm text-[#766767]">브랜드 · {detail.product.brand}</p> : null}
                  {detail.product?.category ? <p className="mt-1 text-sm text-[#766767]">카테고리 · {detail.product.category}</p> : null}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#fff7f8] p-4 text-center">
                    <p className="text-xs font-semibold text-[#9b8589]">분석 신뢰도</p>
                    <p className="mt-1 text-2xl font-black text-[#a85f6e]">{Math.round(result.confidence * 100)}%</p>
                    <p className="mt-1 text-xs text-[#8a777a]">{confidenceLabel(result.confidence)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#fff7f8] p-4 text-center">
                    <p className="text-xs font-semibold text-[#9b8589]">공개 근거</p>
                    <p className="mt-1 text-2xl font-black text-[#a85f6e]">{result.reviewCount}</p>
                    <p className="mt-1 text-xs text-[#8a777a]">웹 공개 정보 기준</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-base font-bold">16개 Beauty Code 적합도</h3>
                  <p className="mt-1 text-xs leading-5 text-[#8b787c]">높은 점수 순으로 표시합니다. 현재 유형은 강조해서 보여드립니다.</p>
                  <div className="mt-3 space-y-2">
                    {sortedFits.map((fit, index) => {
                      const mine = fit.beautyCode === beautyCode;
                      return (
                        <div key={fit.beautyCode} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${mine ? "bg-[#fff0f2] ring-1 ring-[#e7b8c1]" : "bg-[#faf7f7]"}`}>
                          <span className="w-6 text-xs font-bold text-[#b19da1]">{index + 1}</span>
                          <span className={`w-16 text-sm font-black ${mine ? "text-[#b75f73]" : "text-[#5f5557]"}`}>{fit.beautyCode}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eadfe1]">
                            <div className="h-full rounded-full bg-[#d88c9c]" style={{ width: `${Math.max(2, Math.min(100, fit.fitScore))}%` }} />
                          </div>
                          <span className={`w-9 text-right text-sm font-black ${mine ? "text-[#b75f73]" : "text-[#65585b]"}`}>{fit.fitScore}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <ProductFitEvidencePanel productName={result.productName} beautyCode={beautyCode} requestId={result.requestId} />
              </section>
            ) : null}
          </div>
        ) : null}

        <div className="mt-7 text-center"><Link href="/mypage" className="text-sm font-semibold text-[#a85f6e]">My Page에서 Beauty Code 보기</Link></div>
      </section>
    </main>
  );
}
