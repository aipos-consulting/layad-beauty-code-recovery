"use client";

import { useEffect, useRef, useState } from "react";

const SESSION_KEY = "layad-supabase-session-id";

type Stage = "saving" | "collecting" | "analyzing" | "completed" | "failed" | "config";
type Fit = { beautyCode: string; fitScore: number; reviewCount: number; confidence: number };
type ResultPayload = {
  ok?: boolean;
  code?: string;
  status?: string;
  errorMessage?: string | null;
  product?: { canonical_name?: string; brand?: string; category?: string } | null;
  userBeautyCode?: string | null;
  fits?: Fit[];
};

export default function AnalysisProcessingFeedback() {
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<Stage>("saving");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ResultPayload | null>(null);
  const timerRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    const stopTimer = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const poll = async () => {
      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        setVisible(false);
        return;
      }

      attemptsRef.current += 1;
      try {
        const response = await fetch(`/api/product-analysis-result?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const payload = (await response.json()) as ResultPayload;

        if (payload.code === "SUPABASE_NOT_CONFIGURED") {
          setStage("config");
          setMessage("Supabase 환경변수가 현재 배포에 적용되지 않았습니다.");
          return;
        }
        if (!response.ok || !payload.ok) throw new Error("상태 확인 실패");

        if (payload.status === "completed") {
          setResult(payload);
          setStage("completed");
          return;
        }
        if (payload.status === "failed" || payload.status === "insufficient_reviews") {
          setStage("failed");
          setMessage(
            payload.status === "insufficient_reviews"
              ? "공개된 상품 정보와 리뷰 근거가 부족하여 적합도를 계산하지 못했습니다. 정확한 상품 링크로 다시 요청해 주세요."
              : payload.errorMessage || "AI 분석 처리에 실패했습니다.",
          );
          return;
        }

        if (payload.status === "analyzing") setStage("analyzing");
        else if (payload.status === "collecting_reviews") setStage("collecting");
        else if (payload.status === "submitted" && attemptsRef.current > 2) {
          setStage("config");
          setMessage("AI 분석이 시작되지 않았습니다. Vercel의 OPENAI_API_KEY 설정을 확인해 주세요.");
          return;
        } else setStage("collecting");

        if (attemptsRef.current >= 45) {
          setStage("failed");
          setMessage("분석 시간이 길어지고 있습니다. 잠시 후 다시 요청해 주세요.");
          return;
        }
        timerRef.current = window.setTimeout(poll, 2000);
      } catch {
        if (attemptsRef.current >= 8) {
          setStage("failed");
          setMessage("분석 상태를 확인하지 못했습니다. 네트워크 연결을 확인해 주세요.");
          return;
        }
        timerRef.current = window.setTimeout(poll, 2000);
      }
    };

    const submitHandler = (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!(form instanceof HTMLFormElement)) return;
      const button = form.querySelector('button[type="submit"]');
      const input = form.querySelector("input") as HTMLInputElement | null;
      if (!button?.textContent?.includes("적합도 분석하기") || !input?.value.trim()) return;

      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) return;

      stopTimer();
      attemptsRef.current = 0;
      setResult(null);
      setMessage("");
      setStage("saving");
      setVisible(true);
      timerRef.current = window.setTimeout(poll, 1200);
    };

    document.addEventListener("submit", submitHandler, true);
    return () => {
      document.removeEventListener("submit", submitHandler, true);
      stopTimer();
    };
  }, []);

  if (!visible) return null;

  const done = stage === "completed";
  const stopped = stage === "failed" || stage === "config";
  const stageNumber = stage === "saving" ? 1 : stage === "collecting" ? 2 : stage === "analyzing" ? 3 : done ? 4 : 0;
  const userCode = result?.userBeautyCode;

  return (
    <div className="fixed inset-0 z-[140] overflow-y-auto bg-black/35 px-4 py-6">
      <section className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-6 text-[#382d2d] shadow-2xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f2]">
            {done ? <span className="text-2xl text-[#d88c9c]">✓</span> : stopped ? <span className="text-2xl text-[#b84f63]">!</span> : <span className="h-7 w-7 animate-spin rounded-full border-4 border-[#f1dfe2] border-t-[#d88c9c]" />}
          </div>
          <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-[#b97b88]">AI ANALYSIS</p>
          <h2 className="mt-3 text-xl font-semibold">
            {done ? "16유형 적합도 분석이 완료되었습니다" : stopped ? "분석을 계속할 수 없습니다" : stage === "analyzing" ? "AI가 리뷰 맥락을 분석하고 있습니다" : stage === "collecting" ? "공개 상품 정보와 리뷰를 확인하고 있습니다" : "분석 요청을 저장하고 있습니다"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#766767]">
            {done ? `${result?.product?.brand ?? ""} ${result?.product?.canonical_name ?? "상품"}`.trim() : stopped ? message : "상품에 따라 최대 1분 정도 걸릴 수 있습니다. 화면을 닫지 말아 주세요."}
          </p>
        </div>

        {!done && !stopped ? (
          <div className="mt-6 space-y-3 text-sm">
            {["상품 분석 요청 접수", "공개 정보와 리뷰 근거 확인", "AI 맥락 분석 및 특성 코드 생성", "16유형 적합도 계산"].map((label, index) => {
              const number = index + 1;
              const active = number <= stageNumber;
              return (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-[#fffafa] px-4 py-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-[#d88c9c] text-white" : "bg-[#eadfe1] text-[#9b898c]"}`}>{number}</span>
                  <span className={active ? "font-medium" : "text-[#9b898c]"}>{label}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        {done && result?.fits?.length ? (
          <div className="mt-7">
            <p className="text-center text-sm text-[#766767]">리뷰 근거 기반 16유형 적합도</p>
            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
              {result.fits.map((fit) => {
                const mine = fit.beautyCode === userCode;
                return (
                  <div key={fit.beautyCode} className={`rounded-2xl border px-2 py-3 text-center ${mine ? "border-[#d88c9c] bg-[#fff0f2] shadow-sm" : "border-[#ead7db] bg-white"}`}>
                    <p className="text-[11px] font-semibold text-[#6f6063]">{fit.beautyCode}</p>
                    <p className={`mt-1 text-lg font-semibold ${mine ? "text-[#c86f81]" : "text-[#382d2d]"}`}>{fit.fitScore}</p>
                  </div>
                );
              })}
            </div>
            {userCode ? <p className="mt-4 text-center text-sm font-semibold text-[#a85f6e]">{userCode} 유형 결과가 배경색으로 강조되었습니다.</p> : null}
          </div>
        ) : null}

        {(done || stopped) ? (
          <button type="button" onClick={() => setVisible(false)} className="mt-7 w-full rounded-full bg-[#d88c9c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c8798a]">
            {done ? "결과 화면 닫기" : "확인"}
          </button>
        ) : null}
      </section>
    </div>
  );
}
