"use client";

import { useEffect, useRef, useState } from "react";

type ProcessingStage = "saving" | "queued";

export default function AnalysisProcessingFeedback() {
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<ProcessingStage>("saving");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const submitHandler = (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!(form instanceof HTMLFormElement)) return;

      const submitButton = form.querySelector('button[type="submit"]');
      if (!submitButton?.textContent?.includes("적합도 분석하기")) return;

      const input = form.querySelector("input") as HTMLInputElement | null;
      if (!input?.value.trim()) return;

      if (timerRef.current) window.clearTimeout(timerRef.current);
      setStage("saving");
      setVisible(true);

      timerRef.current = window.setTimeout(() => {
        setStage("queued");
      }, 1000);
    };

    document.addEventListener("submit", submitHandler, true);
    return () => {
      document.removeEventListener("submit", submitHandler, true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  const queued = stage === "queued";

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/35 px-4">
      <section className="w-full max-w-md rounded-3xl bg-white p-6 text-center text-[#382d2d] shadow-2xl sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f2]">
          {queued ? (
            <span className="text-2xl text-[#d88c9c]">✓</span>
          ) : (
            <span className="h-7 w-7 animate-spin rounded-full border-4 border-[#f1dfe2] border-t-[#d88c9c]" />
          )}
        </div>

        <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-[#b97b88]">AI ANALYSIS</p>
        <h2 className="mt-3 text-xl font-semibold">
          {queued ? "AI 분석 대기 중입니다" : "AI 분석 요청을 처리하고 있습니다"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#766767]">
          {queued
            ? "요청이 정상적으로 접수되었습니다. 리뷰 확인과 AI 분석이 준비되면 결과 상태가 갱신됩니다."
            : "상품 정보와 Beauty Code를 안전하게 저장하고 있습니다."}
        </p>

        <div className="mt-6 space-y-3 text-left text-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-[#fffafa] px-4 py-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d88c9c] text-xs font-semibold text-white">1</span>
            <span className="font-medium">상품 분석 요청 접수</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-[#fffafa] px-4 py-3">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${queued ? "bg-[#d88c9c] text-white" : "bg-[#eadfe1] text-[#9b898c]"}`}>2</span>
            <span className={queued ? "font-medium" : "text-[#9b898c]"}>리뷰 확인 및 AI 분석 대기</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-[#fffafa] px-4 py-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eadfe1] text-xs font-semibold text-[#9b898c]">3</span>
            <span className="text-[#9b898c]">16유형 적합도 결과 생성</span>
          </div>
        </div>

        {queued ? (
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="mt-6 w-full rounded-full bg-[#d88c9c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c8798a]"
          >
            요청 상태 확인
          </button>
        ) : null}
      </section>
    </div>
  );
}
