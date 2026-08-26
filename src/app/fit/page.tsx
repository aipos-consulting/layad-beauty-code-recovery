"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLanguage } from "../i18n";
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

const copy = {
  ko: {
    loadingCode: "Beauty Code를 확인하는 중입니다.",
    loadCodeFailed: "저장된 Beauty Code를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    title: "상품 적합도 분석",
    loginDesc: "저장된 Beauty Code로 바로 분석하려면 로그인해 주세요.",
    login: "로그인 · 회원가입",
    firstTest: "처음 Beauty Code 테스트하기",
    needCode: "먼저 Beauty Code가 필요합니다",
    needCodeDesc: "테스트는 최초 한 번만 하면 되고, 저장된 이후에는 이 화면에서 계속 상품 적합도를 분석할 수 있습니다.",
    takeTest: "Beauty Code 테스트하기",
    currentCodePrefix: "현재 Beauty Code",
    currentCodeSuffix: "기준으로 분석합니다.",
    productLabel: "상품명 또는 상품 링크",
    placeholder: "예: 에스티로더 더블웨어 파운데이션",
    analyzing: "분석 중...",
    start: "분석 시작하기",
    checking: "상품 정보를 확인하고 적합도를 분석하고 있습니다.",
    fitFailed: "적합도 분석에 실패했습니다.",
    productUnknown: "상품을 특정할 수 없어 분석을 완료하지 못했습니다.",
    linkFailed: "상세 분석 결과 연결 정보를 생성하지 못했습니다.",
    basis: "기준 · 100점 만점",
    loadingDetail: "상세 결과 불러오는 중...",
    closeDetail: "상세 결과 접기",
    openDetail: "분석 결과 자세히 보기",
    detailLoadFailed: "상세 분석 결과를 불러오지 못했습니다.",
    detailTitle: "상세 분석 결과",
    brand: "브랜드",
    category: "카테고리",
    confidence: "분석 신뢰도",
    evidence: "공개 근거",
    webBasis: "웹 공개 정보 기준",
    fit16: "16개 Beauty Code 적합도",
    fit16Desc: "높은 점수 순으로 표시합니다. 현재 유형은 강조해서 보여드립니다.",
    myPage: "My Page에서 Beauty Code 보기",
    high: "높음",
    medium: "보통",
    reference: "참고용",
  },
  en: {
    loadingCode: "Checking your Beauty Code.",
    loadCodeFailed: "Could not load your saved Beauty Code. Please try again shortly.",
    title: "Product Fit Analysis",
    loginDesc: "Sign in to analyze products using your saved Beauty Code.",
    login: "Sign in · Sign up",
    firstTest: "Take the Beauty Code test",
    needCode: "A Beauty Code is required first",
    needCodeDesc: "You only need to take the test once. After it is saved, you can continue analyzing products here.",
    takeTest: "Take the Beauty Code test",
    currentCodePrefix: "Analyzing for Beauty Code",
    currentCodeSuffix: ".",
    productLabel: "Product name or product link",
    placeholder: "e.g. Estée Lauder Double Wear Foundation",
    analyzing: "Analyzing...",
    start: "Start analysis",
    checking: "Checking the product and analyzing fit.",
    fitFailed: "Product fit analysis failed.",
    productUnknown: "We could not identify the product well enough to complete the analysis.",
    linkFailed: "Could not create the detailed result connection.",
    basis: "basis · out of 100",
    loadingDetail: "Loading detailed results...",
    closeDetail: "Hide detailed results",
    openDetail: "View detailed results",
    detailLoadFailed: "Could not load the detailed analysis results.",
    detailTitle: "Detailed Analysis Results",
    brand: "Brand",
    category: "Category",
    confidence: "Analysis confidence",
    evidence: "Public evidence",
    webBasis: "Based on public web information",
    fit16: "Fit across 16 Beauty Codes",
    fit16Desc: "Sorted from highest score. Your current type is highlighted.",
    myPage: "View Beauty Code in My Page",
    high: "High",
    medium: "Medium",
    reference: "Reference",
  },
  ja: {
    loadingCode: "Beauty Codeを確認しています。",
    loadCodeFailed: "保存されたBeauty Codeを読み込めませんでした。しばらくしてからもう一度お試しください。",
    title: "商品適合度分析",
    loginDesc: "保存されたBeauty Codeですぐ分析するにはログインしてください。",
    login: "ログイン · 会員登録",
    firstTest: "初めてBeauty Codeテストをする",
    needCode: "まずBeauty Codeが必要です",
    needCodeDesc: "テストは最初の1回だけで、保存後はこの画面で継続して商品適合度を分析できます。",
    takeTest: "Beauty Codeテストをする",
    currentCodePrefix: "現在のBeauty Code",
    currentCodeSuffix: "を基準に分析します。",
    productLabel: "商品名または商品リンク",
    placeholder: "例：エスティ ローダー ダブル ウェア ファンデーション",
    analyzing: "分析中...",
    start: "分析を開始",
    checking: "商品情報を確認し、適合度を分析しています。",
    fitFailed: "適合度分析に失敗しました。",
    productUnknown: "商品を特定できず、分析を完了できませんでした。",
    linkFailed: "詳細分析結果への接続情報を作成できませんでした。",
    basis: "基準 · 100点満点",
    loadingDetail: "詳細結果を読み込み中...",
    closeDetail: "詳細結果を閉じる",
    openDetail: "分析結果を詳しく見る",
    detailLoadFailed: "詳細分析結果を読み込めませんでした。",
    detailTitle: "詳細分析結果",
    brand: "ブランド",
    category: "カテゴリー",
    confidence: "分析信頼度",
    evidence: "公開根拠",
    webBasis: "公開ウェブ情報基準",
    fit16: "16種類のBeauty Code適合度",
    fit16Desc: "スコアの高い順に表示します。現在のタイプは強調表示されます。",
    myPage: "My PageでBeauty Codeを見る",
    high: "高い",
    medium: "普通",
    reference: "参考",
  },
} as const;

function persistFitState(beautyCode: string, result: ResultState, detail: DetailPayload | null) {
  try {
    localStorage.setItem(LAST_FIT_STATE_KEY, JSON.stringify({ beautyCode, result, detail } satisfies StoredFitState));
  } catch {
    // Browser storage can be unavailable in private/restricted modes.
  }
}

export default function FitPage() {
  const { locale } = useLanguage();
  const t = copy[locale];
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

  const confidenceLabel = (value: number) => value >= 0.85 ? t.high : value >= 0.7 ? t.medium : t.reference;

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
        setMessage(t.loadCodeFailed);
      } finally {
        setLoading(false);
      }
    })();
  }, [t.loadCodeFailed]);

  const sortedFits = useMemo(() => [...(detail?.fits ?? [])].sort((a, b) => b.fitScore - a.fitScore), [detail]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!beautyCode || !productInput.trim() || busy) return;

    const inputValue = productInput.trim();
    setBusy(true);
    setMessage(t.checking);
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
      if (!response.ok || !payload.ok) throw new Error(t.fitFailed);
      if (payload.status !== "completed" || typeof payload.fitScore !== "number") {
        setMessage(t.productUnknown);
        return;
      }
      if (!payload.requestId || !payload.sessionId) throw new Error(t.linkFailed);

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
      window.setTimeout(() => document.getElementById("fit-analysis-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.fitFailed);
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
      if (!response.ok || !payload.ok || payload.status !== "completed" || !payload.fits?.length) throw new Error(t.detailLoadFailed);
      setDetail(payload);
      persistFitState(beautyCode, result, payload);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : t.detailLoadFailed);
    } finally {
      setDetailBusy(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#fff8f8] px-5 py-16 text-center text-[#806f72]">{t.loadingCode}</main>;

  if (authRequired) {
    return (
      <main className="min-h-screen bg-[#fff8f8] px-5 py-14 text-[#382d2d]">
        <section className="mx-auto max-w-md rounded-[2rem] bg-white p-8 text-center shadow-[0_24px_70px_rgba(120,70,80,0.12)]">
          <p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">PRODUCT FIT</p>
          <h1 className="mt-4 text-3xl font-semibold">{t.title}</h1>
          <p className="mt-4 text-sm leading-7 text-[#766767]">{t.loginDesc}</p>
          <Link href="/account" className="mt-7 block rounded-2xl bg-[#d88c9c] px-5 py-3.5 font-semibold text-white">{t.login}</Link>
          <Link href="/test" className="mt-3 block rounded-2xl border border-[#ead7db] px-5 py-3.5 font-semibold text-[#806f72]">{t.firstTest}</Link>
        </section>
      </main>
    );
  }

  if (!beautyCode) {
    return (
      <main className="min-h-screen bg-[#fff8f8] px-5 py-14 text-[#382d2d]">
        <section className="mx-auto max-w-md rounded-[2rem] bg-white p-8 text-center shadow-[0_24px_70px_rgba(120,70,80,0.12)]">
          <p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">PRODUCT FIT</p>
          <h1 className="mt-4 text-3xl font-semibold">{t.needCode}</h1>
          <p className="mt-4 text-sm leading-7 text-[#766767]">{t.needCodeDesc}</p>
          <Link href="/test" className="mt-7 block rounded-2xl bg-[#d88c9c] px-5 py-3.5 font-semibold text-white">{t.takeTest}</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8f8] px-5 py-10 pb-28 text-[#382d2d] sm:px-8">
      <section className="mx-auto max-w-2xl rounded-[2rem] bg-white p-7 shadow-[0_24px_70px_rgba(120,70,80,0.12)] sm:p-10">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">PRODUCT FIT ANALYSIS</p>
          <h1 className="mt-4 text-3xl font-semibold">{t.title}</h1>
          <p className="mt-3 text-sm leading-7 text-[#766767]">{t.currentCodePrefix} <strong className="text-[#a85f6e]">{beautyCode}</strong> {t.currentCodeSuffix}</p>
        </div>

        <form onSubmit={submit} data-direct-product-fit="true" className="mt-8 rounded-3xl border border-[#f1dfe2] bg-[#fffafa] p-5 sm:p-6">
          <label htmlFor="fit-product-input" className="text-sm font-semibold">{t.productLabel}</label>
          <input
            id="fit-product-input"
            value={productInput}
            onChange={(event) => setProductInput(event.target.value)}
            placeholder={t.placeholder}
            maxLength={2000}
            className="mt-3 w-full rounded-2xl border border-[#e8cfd4] bg-white px-4 py-3 text-sm outline-none focus:border-[#d88c9c] focus:ring-2 focus:ring-[#f4dce1]"
          />
          <button type="submit" disabled={!productInput.trim() || busy} className="mt-3 w-full rounded-2xl bg-[#d88c9c] px-6 py-3 text-sm font-semibold text-white enabled:hover:bg-[#c8798a] disabled:cursor-not-allowed disabled:bg-[#d8cccc]">
            {busy ? t.analyzing : t.start}
          </button>
        </form>

        {message ? <p className="mt-5 rounded-2xl bg-[#fff3df] p-4 text-sm leading-6 text-[#8d5a23]">{message}</p> : null}

        {result ? (
          <div id="fit-analysis-result" className="scroll-mt-6">
            <section className="mt-6 rounded-3xl bg-[#fff0f2] p-7 text-center">
              <p className="text-sm font-semibold text-[#9f6572]">{result.productName}</p>
              <p className="mt-2 text-5xl font-black text-[#c86f82]">{result.score}</p>
              <p className="mt-1 text-sm font-semibold text-[#806f72]">{beautyCode} {t.basis}</p>
              <button
                type="button"
                onClick={loadDetail}
                disabled={detailBusy}
                className="mt-5 w-full rounded-2xl border border-[#dba6b1] bg-white px-5 py-3 text-sm font-bold text-[#a85f6e] disabled:opacity-60"
              >
                {detailBusy ? t.loadingDetail : detail ? t.closeDetail : t.openDetail}
              </button>
            </section>

            {detailError ? <p className="mt-4 rounded-2xl bg-[#fff3df] p-4 text-sm leading-6 text-[#8d5a23]">{detailError}</p> : null}

            {detail ? (
              <section className="mt-5 rounded-3xl border border-[#f0dde1] bg-white p-5 sm:p-6">
                <div className="border-b border-[#f1e4e6] pb-5">
                  <p className="text-xs font-bold tracking-[.16em] text-[#b97b88]">DETAIL RESULT</p>
                  <h2 className="mt-2 text-xl font-bold">{t.detailTitle}</h2>
                  {detail.product?.brand ? <p className="mt-2 text-sm text-[#766767]">{t.brand} · {detail.product.brand}</p> : null}
                  {detail.product?.category ? <p className="mt-1 text-sm text-[#766767]">{t.category} · {detail.product.category}</p> : null}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#fff7f8] p-4 text-center">
                    <p className="text-xs font-semibold text-[#9b8589]">{t.confidence}</p>
                    <p className="mt-1 text-2xl font-black text-[#a85f6e]">{Math.round(result.confidence * 100)}%</p>
                    <p className="mt-1 text-xs text-[#8a777a]">{confidenceLabel(result.confidence)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#fff7f8] p-4 text-center">
                    <p className="text-xs font-semibold text-[#9b8589]">{t.evidence}</p>
                    <p className="mt-1 text-2xl font-black text-[#a85f6e]">{result.reviewCount}</p>
                    <p className="mt-1 text-xs text-[#8a777a]">{t.webBasis}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-base font-bold">{t.fit16}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#8b787c]">{t.fit16Desc}</p>
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

        <div className="mt-7 text-center"><Link href="/mypage" className="text-sm font-semibold text-[#a85f6e]">{t.myPage}</Link></div>
      </section>
    </main>
  );
}
