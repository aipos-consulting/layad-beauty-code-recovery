"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { BEAUTY_TYPES, type BeautyTypeCode } from "@/lib/review-product-fit";
import {
  createProductAnalysisRequest,
  validateProductInput,
  type ProductAnalysisRequest,
} from "@/lib/product-analysis-request";

const SESSION_KEY = "layad-supabase-session-id";
const SAVED_CODE_KEY = "layad-saved-beauty-code";
const SAVED_SOURCE_KEY = "layad-saved-beauty-code-source";

type AgeBand =
  | "14-19"
  | "20-29"
  | "30-39"
  | "40-49"
  | "50-59"
  | "60+"
  | "prefer_not_to_say";

const ageOptions: Array<{ value: AgeBand; label: string }> = [
  { value: "14-19", label: "14–19세" },
  { value: "20-29", label: "20–29세" },
  { value: "30-39", label: "30–39세" },
  { value: "40-49", label: "40–49세" },
  { value: "50-59", label: "50–59세" },
  { value: "60+", label: "60세 이상" },
  { value: "prefer_not_to_say", label: "응답하지 않음" },
];

const codeLabels: Record<string, string> = {
  O: "지성형",
  D: "건성형",
  G: "글로우 선호",
  M: "매트함 추구",
  P: "정교함 추구",
  C: "간편함 추구",
  V: "변동형",
  E: "일관형",
};

const formatRequestTime = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export default function SelectTypePage() {
  const [selectedCode, setSelectedCode] = useState<BeautyTypeCode | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showAgePrompt, setShowAgePrompt] = useState(false);
  const [savingAge, setSavingAge] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [ageError, setAgeError] = useState("");
  const [productInput, setProductInput] = useState("");
  const [productError, setProductError] = useState("");
  const [requests, setRequests] = useState<ProductAnalysisRequest[]>([]);

  useEffect(() => {
    setSessionReady(Boolean(sessionStorage.getItem(SESSION_KEY)));
  }, []);

  const saveAgeSession = async (ageBand: AgeBand | null) => {
    if (!selectedCode || savingAge) return;
    setSavingAge(true);
    setAgeError("");

    try {
      const response = await fetch("/api/anonymous-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beautyCode: selectedCode,
          beautyCodeSource: "manual",
          ageBand,
          answers: [],
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        sessionId?: string;
        code?: string;
      };

      if (!response.ok || !result.ok || !result.sessionId) {
        setAgeError(
          result.code === "SUPABASE_NOT_CONFIGURED"
            ? "데이터 저장 설정을 확인 중입니다. 잠시 후 다시 시도해 주세요."
            : "연령대 저장에 실패했습니다. 다시 시도해 주세요.",
        );
        return;
      }

      sessionStorage.setItem(SESSION_KEY, result.sessionId);
      sessionStorage.setItem(SAVED_CODE_KEY, selectedCode);
      sessionStorage.setItem(SAVED_SOURCE_KEY, "manual");
      setSessionReady(true);
      setShowAgePrompt(false);
      setProductError("");
    } catch {
      setAgeError("네트워크 문제로 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSavingAge(false);
    }
  };

  const submitProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCode) return;

    const sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId || !sessionReady) {
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      setShowAgePrompt(true);
      setProductError("상품 분석 전에 연령대 선택과 익명 세션 저장을 완료해 주세요.");
      return;
    }

    const validation = validateProductInput(productInput);
    if (!validation.valid) {
      setProductError(validation.message ?? "입력값을 확인해 주세요.");
      return;
    }

    const normalized = productInput.trim();
    if (requests[0]?.inputValue === normalized) {
      setProductError("같은 상품이 이미 분석 준비 중입니다.");
      return;
    }

    setRequests((previous) => [
      createProductAnalysisRequest(normalized, selectedCode),
      ...previous,
    ]);
    setProductInput("");
    setProductError("");
  };

  return (
    <main className="min-h-screen bg-[#fff8f8] px-5 py-8 text-[#382d2d] sm:px-8">
      <section className="mx-auto max-w-4xl rounded-[2rem] bg-white px-6 py-10 shadow-[0_24px_70px_rgba(120,70,80,0.12)] sm:px-12">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#b97b88]">SELECT YOUR BEAUTY CODE</p>
          <h1 className="mt-4 text-3xl font-semibold">내 Beauty Code 선택</h1>
          <p className="mt-3 text-sm leading-7 text-[#766767]">알고 있는 Beauty Code를 선택해 주세요.</p>
        </div>

        <div className="mx-auto mt-7 min-h-32 max-w-xl rounded-3xl border border-[#f1dfe2] bg-[#fffafa] p-6 text-center">
          {selectedCode ? (
            <>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#b97b88]">선택한 BEAUTY CODE</p>
              <p className="mt-3 text-4xl font-semibold tracking-[0.18em] text-[#d88c9c]">{selectedCode}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-[#6f6063]">
                {selectedCode.split("").map((letter) => (
                  <span key={letter}><b>{letter}</b> · {codeLabels[letter]}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="flex min-h-20 items-center justify-center text-sm text-[#8b7b7e]">Beauty Code를 선택해 주세요.</p>
          )}
        </div>

        <div className="mt-7 grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
          {BEAUTY_TYPES.map((code) => {
            const active = code === selectedCode;
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setSelectedCode(code);
                  setConfirmed(false);
                  setSessionReady(false);
                  setRequests([]);
                  setProductError("");
                  sessionStorage.removeItem(SESSION_KEY);
                  sessionStorage.removeItem(SAVED_CODE_KEY);
                  sessionStorage.removeItem(SAVED_SOURCE_KEY);
                }}
                className={`rounded-xl border px-2 py-3 text-center text-[11px] font-semibold transition sm:text-xs ${
                  active
                    ? "border-[#d88c9c] bg-[#fff0f2] text-[#a85f6e] shadow-sm"
                    : "border-[#ead7db] bg-white text-[#7f7073] hover:border-[#dca7b1] hover:bg-[#fffafa]"
                }`}
              >
                {code}
              </button>
            );
          })}
        </div>

        {!confirmed ? (
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              disabled={!selectedCode}
              onClick={() => {
                setConfirmed(true);
                setShowAgePrompt(true);
              }}
              className="inline-flex h-12 min-w-56 items-center justify-center rounded-full bg-[#d88c9c] px-7 text-sm font-semibold text-white transition enabled:hover:bg-[#c8798a] disabled:cursor-not-allowed disabled:bg-[#d8cccc]"
            >
              선택한 유형으로 계속하기
            </button>
            <Link href="/test" className="inline-flex h-12 min-w-56 items-center justify-center rounded-full border border-[#d88c9c] px-7 text-sm font-semibold text-[#a85f6e] hover:bg-[#fff5f6]">
              Beauty Code 테스트하기
            </Link>
          </div>
        ) : null}

        {confirmed && selectedCode ? (
          <section className="mt-10 border-t border-[#f1dfe2] pt-9">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#b97b88]">PRODUCT FIT ANALYSIS</p>
              <h2 className="mt-3 text-2xl font-semibold">상품 적합도 분석</h2>
              <p className="mt-3 text-sm leading-7 text-[#766767]">상품명 또는 상품 링크를 등록하면 AI 분석을 시작합니다.</p>
            </div>

            <form onSubmit={submitProduct} className="mx-auto mt-7 max-w-2xl rounded-3xl border border-[#f1dfe2] bg-[#fffafa] p-5 sm:p-6">
              <label htmlFor="manual-product-input" className="text-sm font-semibold">상품명 또는 상품 링크</label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="manual-product-input"
                  value={productInput}
                  onChange={(event) => {
                    setProductInput(event.target.value);
                    if (productError) setProductError("");
                  }}
                  placeholder="예: 프라이머 상품명 또는 https://..."
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-2xl border border-[#e8cfd4] bg-white px-4 py-3 text-sm outline-none focus:border-[#d88c9c] focus:ring-2 focus:ring-[#f4dce1]"
                />
                <button type="submit" disabled={!productInput.trim() || !sessionReady} className="rounded-2xl bg-[#d88c9c] px-6 py-3 text-sm font-semibold text-white enabled:hover:bg-[#c8798a] disabled:cursor-not-allowed disabled:bg-[#d8cccc]">
                  적합도 분석하기
                </button>
              </div>
              {!sessionReady ? <p className="mt-3 text-sm text-[#806f72]">연령대 선택과 익명 저장 완료 후 분석할 수 있습니다.</p> : null}
              {productError ? <p className="mt-3 text-sm font-medium text-[#b84f63]">{productError}</p> : null}
            </form>

            <div className="mt-6 space-y-4">
              {requests.map((request) => (
                <article key={request.id} className="rounded-3xl border-2 border-[#d88c9c] bg-[#fff0f2] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#a85f6e]">{request.userBeautyCode}</span>
                    <span className="rounded-full border border-[#e6a8b5] bg-white px-3 py-1 text-xs font-semibold text-[#a85f6e]">분석 준비 중</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">상품 분석 요청이 접수되었습니다.</h3>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-[#806f72]">등록 유형</dt><dd className="font-semibold">{request.inputType === "url" ? "상품 링크" : "상품명"}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[#806f72]">등록값</dt><dd className="min-w-0 text-right font-semibold">{request.productUrl ? <a href={request.productUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">등록한 상품 링크</a> : request.productName}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[#806f72]">요청 시각</dt><dd className="font-semibold">{formatRequestTime(request.createdAt)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-9 text-center">
          <Link href="/" className="text-sm text-[#7e7070] hover:underline">처음 화면으로</Link>
        </div>
      </section>

      {showAgePrompt && selectedCode ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/35 px-4">
          <section className="w-full max-w-md rounded-3xl bg-white p-6 text-[#382d2d] shadow-2xl sm:p-8">
            <p className="text-center text-xs font-semibold tracking-[0.18em] text-[#b97b88]">OPTIONAL</p>
            <h2 className="mt-3 text-center text-xl font-semibold">연령대를 선택해 주세요</h2>
            <p className="mt-3 text-center text-sm leading-6 text-[#766767]">
              서비스 개선을 위한 선택 항목입니다. 정확한 나이와 생년월일은 저장하지 않습니다.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {ageOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={savingAge}
                  onClick={() => saveAgeSession(option.value)}
                  className="rounded-2xl border border-[#ead7db] bg-[#fffafa] px-3 py-3 text-sm font-semibold transition hover:border-[#d88c9c] hover:bg-[#fff0f2] disabled:opacity-60"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={savingAge}
              onClick={() => saveAgeSession(null)}
              className="mt-4 w-full rounded-full px-4 py-3 text-sm text-[#7e7070] hover:bg-[#fff5f6] disabled:opacity-60"
            >
              선택하지 않고 저장
            </button>
            {ageError ? <p className="mt-4 text-center text-sm font-medium text-[#b84f63]">{ageError}</p> : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
