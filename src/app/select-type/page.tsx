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
    const params = new URLSearchParams(window.location.search);
    const requestedCode = params.get("code");
    const requestedStep = params.get("step");
    const code = BEAUTY_TYPES.find((item) => item === requestedCode) ?? null;

    if (code) {
      setSelectedCode(code);
    }

    if (code && requestedStep === "age") {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SAVED_CODE_KEY);
      sessionStorage.removeItem(SAVED_SOURCE_KEY);
      setConfirmed(true);
      setShowAgePrompt(true);
      setSessionReady(false);
      return;
    }

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
        missing?: string[];
      };

      if (!response.ok || !result.ok || !result.sessionId) {
        if (result.code === "SUPABASE_NOT_CONFIGURED") {
          const missingText = result.missing?.length
            ? ` 누락 항목: ${result.missing.join(", ")}`
            : "";
          setAgeError(`Vercel의 Supabase 환경변수가 적용되지 않았습니다.${missingText}`);
        } else if (result.code === "DATABASE_WRITE_FAILED") {
          setAgeError("Supabase 연결은 되었지만 test_sessions 저장에 실패했습니다. 테이블과 키 권한을 확인해 주세요.");
        } else {
          setAgeError("연령대 저장에 실패했습니다. 다시 시도해 주세요.");
        }
        return;
      }

      sessionStorage.setItem(SESSION_KEY, result.sessionId);
      sessionStorage.setItem(SAVED_CODE_KEY, selectedCode);
      sessionStorage.setItem(SAVED_SOURCE_KEY, "manual");
      setSessionReady(true);
      setShowAgePrompt(false);
      setProductError("");
      window.history.replaceState({}, "", "/select-type");
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
    <main className="min-h-screen bg-[#F6F4F0] px-5 py-8 text-[#222222] sm:px-8">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-[#D7D0C7] bg-[#FBFAF7] px-6 py-10 shadow-[0_24px_70px_rgba(34,34,34,0.08)] sm:px-12">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#625D57]">SELECT YOUR BEAUTY CODE</p>
          <h1 className="mt-4 text-3xl font-semibold">내 Beauty Code 선택</h1>
          <p className="mt-3 text-sm leading-7 text-[#625D57]">알고 있는 Beauty Code를 선택해 주세요.</p>
        </div>

        <div className="mx-auto mt-7 min-h-32 max-w-xl rounded-3xl border border-[#D7D0C7] bg-[#F0ECE6] p-6 text-center">
          {selectedCode ? (
            <>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#625D57]">선택한 BEAUTY CODE</p>
              <p className="mt-3 text-4xl font-semibold tracking-[0.18em] text-[#222222]">{selectedCode}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-[#625D57]">
                {selectedCode.split("").map((letter) => (
                  <span key={letter}><b>{letter}</b> · {codeLabels[letter]}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="flex min-h-20 items-center justify-center text-sm text-[#746D65]">Beauty Code를 선택해 주세요.</p>
          )}
        </div>

        {!confirmed ? (
          <form action="/select-type" method="get" className="mt-7">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
              {BEAUTY_TYPES.map((code) => {
                const active = code === selectedCode;
                return (
                  <label key={code} className="cursor-pointer">
                    <input
                      type="radio"
                      name="code"
                      value={code}
                      required
                      defaultChecked={active}
                      onChange={() => setSelectedCode(code)}
                      className="peer sr-only"
                    />
                    <span className="flex rounded-xl border border-[#CFC7BD] bg-[#FBFAF7] px-2 py-3 text-center text-[11px] font-semibold text-[#625D57] transition hover:border-[#9F968B] hover:bg-[#F0ECE6] peer-checked:border-[#222222] peer-checked:bg-[#222222] peer-checked:text-[#F6F4F0] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#222222] sm:text-xs">
                      <span className="w-full">{code}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <input
                type="submit"
                name="step"
                value="age"
                aria-label="선택한 유형으로 계속하기"
                className="inline-flex h-12 min-w-56 cursor-pointer items-center justify-center rounded-full bg-[#222222] px-7 text-sm font-semibold text-[#F6F4F0] transition hover:bg-[#3A3836]"
              />
              <Link href="/test" className="inline-flex h-12 min-w-56 items-center justify-center rounded-full border border-[#A99F93] bg-[#E7E1D9] px-7 text-sm font-semibold text-[#222222] transition hover:bg-[#DDD5CB]">
                Beauty Code 테스트하기
              </Link>
            </div>
          </form>
        ) : null}

        {confirmed && selectedCode ? (
          <section className="mt-10 border-t border-[#D7D0C7] pt-9">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#625D57]">PRODUCT FIT ANALYSIS</p>
              <h2 className="mt-3 text-2xl font-semibold">상품 적합도 분석</h2>
              <p className="mt-3 text-sm leading-7 text-[#625D57]">상품명 또는 상품 링크를 등록하면 AI 분석을 시작합니다.</p>
            </div>

            <form onSubmit={submitProduct} className="mx-auto mt-7 max-w-2xl rounded-3xl border border-[#D7D0C7] bg-[#F0ECE6] p-5 sm:p-6">
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
                  className="min-w-0 flex-1 rounded-2xl border border-[#CFC7BD] bg-[#FBFAF7] px-4 py-3 text-sm outline-none focus:border-[#222222] focus:ring-2 focus:ring-[#D7D0C7]"
                />
                <button type="submit" disabled={!productInput.trim() || !sessionReady} className="rounded-2xl bg-[#222222] px-6 py-3 text-sm font-semibold text-[#F6F4F0] enabled:hover:bg-[#3A3836] disabled:cursor-not-allowed disabled:bg-[#B9B1A8]">
                  적합도 분석하기
                </button>
              </div>
              {!sessionReady ? <p className="mt-3 text-sm text-[#625D57]">연령대 선택과 익명 저장 완료 후 분석할 수 있습니다.</p> : null}
              {productError ? <p className="mt-3 text-sm font-medium text-[#9A4E56]">{productError}</p> : null}
            </form>

            <div className="mt-6 space-y-4">
              {requests.map((request) => (
                <article key={request.id} className="rounded-3xl border-2 border-[#222222] bg-[#F0ECE6] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#222222]">{request.userBeautyCode}</span>
                    <span className="rounded-full border border-[#A99F93] bg-[#FBFAF7] px-3 py-1 text-xs font-semibold text-[#625D57]">분석 준비 중</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">상품 분석 요청이 접수되었습니다.</h3>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-[#625D57]">등록 유형</dt><dd className="font-semibold">{request.inputType === "url" ? "상품 링크" : "상품명"}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[#625D57]">등록값</dt><dd className="min-w-0 text-right font-semibold">{request.productUrl ? <a href={request.productUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">등록한 상품 링크</a> : request.productName}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[#625D57]">요청 시각</dt><dd className="font-semibold">{formatRequestTime(request.createdAt)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-9 text-center">
          <Link href="/" className="text-sm text-[#625D57] hover:underline">처음 화면으로</Link>
        </div>
      </section>

      {showAgePrompt && selectedCode ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/35 px-4">
          <section className="w-full max-w-md rounded-3xl border border-[#D7D0C7] bg-[#FBFAF7] p-6 text-[#222222] shadow-2xl sm:p-8">
            <p className="text-center text-xs font-semibold tracking-[0.18em] text-[#625D57]">OPTIONAL</p>
            <h2 className="mt-3 text-center text-xl font-semibold">연령대를 선택해 주세요</h2>
            <p className="mt-3 text-center text-sm leading-6 text-[#625D57]">
              서비스 개선을 위한 선택 항목입니다. 정확한 나이와 생년월일은 저장하지 않습니다.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {ageOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={savingAge}
                  onClick={() => saveAgeSession(option.value)}
                  className="rounded-2xl border border-[#CFC7BD] bg-[#F0ECE6] px-3 py-3 text-sm font-semibold transition hover:border-[#222222] hover:bg-[#E7E1D9] disabled:opacity-60"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={savingAge}
              onClick={() => saveAgeSession(null)}
              className="mt-4 w-full rounded-full px-4 py-3 text-sm text-[#625D57] hover:bg-[#F0ECE6] disabled:opacity-60"
            >
              선택하지 않고 저장
            </button>
            {ageError ? <p className="mt-4 text-center text-sm font-medium text-[#9A4E56]">{ageError}</p> : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
