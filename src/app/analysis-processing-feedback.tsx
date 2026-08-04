"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SESSION_KEY = "layad-supabase-session-id";

type Stage = "saving" | "collecting" | "analyzing" | "completed" | "failed" | "config";
type Fit = { beautyCode: string; fitScore: number; reviewCount: number; confidence: number };
type ResultPayload = {
  ok?: boolean;
  code?: string;
  status?: string;
  errorMessage?: string | null;
  message?: string;
  product?: { canonical_name?: string; brand?: string; category?: string } | null;
  userBeautyCode?: string | null;
  fits?: Fit[];
};

function fitMessage(score: number) {
  if (score >= 90) return { admin: "매우 적합", user: "매우 잘 어울립니다" };
  if (score >= 75) return { admin: "적합", user: "잘 어울립니다" };
  if (score >= 60) return { admin: "보통", user: "무난하게 어울립니다" };
  if (score >= 40) return { admin: "낮음", user: "일부 특성이 맞지 않을 수 있습니다" };
  return { admin: "매우 낮음", user: "다른 상품과 함께 비교해 보세요" };
}

function heatStyle(score: number, mine: boolean, best: boolean) {
  const alpha = Math.max(0.08, Math.min(0.42, score / 240));
  return {
    backgroundColor: `rgba(216, 140, 156, ${alpha})`,
    borderColor: mine ? "#a94f65" : best ? "#d88c9c" : "#ead7db",
    boxShadow: mine ? "0 0 0 2px rgba(169,79,101,.18)" : undefined,
  };
}

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
          setMessage("데이터 저장 설정을 확인해 주세요.");
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
          setMessage(payload.errorMessage || "현재 공개된 상품 정보가 충분하지 않아 적합도를 제공하기 어렵습니다.");
          return;
        }

        if (payload.status === "analyzing") setStage("analyzing");
        else setStage("collecting");

        if (attemptsRef.current >= 45) {
          setStage("failed");
          setMessage("분석 시간이 길어지고 있습니다. 운영자가 결과를 준비한 뒤 다시 확인해 주세요.");
          return;
        }
        timerRef.current = window.setTimeout(poll, 2000);
      } catch {
        if (attemptsRef.current >= 8) {
          setStage("failed");
          setMessage("분석 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        timerRef.current = window.setTimeout(poll, 2000);
      }
    };

    const submitHandler = async (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!(form instanceof HTMLFormElement)) return;
      const button = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      const input = form.querySelector("input") as HTMLInputElement | null;
      const label = button?.textContent ?? "";
      const inputValue = input?.value.trim() ?? "";
      if ((!label.includes("적합도 분석하기") && !label.includes("잘 맞는지 확인하기")) || !inputValue) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        setMessage("회원님의 Beauty Code 세션을 확인하지 못했습니다. 유형을 다시 선택해 주세요.");
        setStage("failed");
        setVisible(true);
        return;
      }

      const inputType = /^https?:\/\//i.test(inputValue) ? "url" : "name";
      if (button) button.disabled = true;
      stopTimer();
      attemptsRef.current = 0;
      setResult(null);
      setMessage("");

      try {
        const response = await fetch("/api/product-analysis-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, inputType, inputValue }),
        });
        const payload = (await response.json()) as ResultPayload & { requestId?: string };
        if (!response.ok || !payload.ok || !payload.requestId) {
          throw new Error(payload.message || (payload.code === "SUPABASE_NOT_CONFIGURED" ? "데이터 저장 설정을 확인해 주세요." : "상품 신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."));
        }

        if (input) input.value = "";
        setStage("collecting");
        setVisible(true);
        timerRef.current = window.setTimeout(poll, 800);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "상품 신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setStage("failed");
        setVisible(true);
      } finally {
        if (button) button.disabled = false;
      }
    };

    document.addEventListener("submit", submitHandler, true);
    return () => {
      document.removeEventListener("submit", submitHandler, true);
      stopTimer();
    };
  }, []);

  const fits = useMemo(() => [...(result?.fits ?? [])].sort((a, b) => b.fitScore - a.fitScore), [result]);
  if (!visible) return null;

  const done = stage === "completed";
  const stopped = stage === "failed" || stage === "config";
  const stageNumber = stage === "saving" ? 1 : stage === "collecting" ? 2 : stage === "analyzing" ? 3 : done ? 4 : 0;
  const userCode = result?.userBeautyCode ?? null;
  const myFit = fits.find((fit) => fit.beautyCode === userCode);
  const bestFit = fits[0];
  const myRank = myFit ? fits.findIndex((fit) => fit.beautyCode === myFit.beautyCode) + 1 : null;
  const productName = `${result?.product?.brand ?? ""} ${result?.product?.canonical_name ?? "선택하신 상품"}`.trim();

  const statusTitle = done
    ? "회원님의 Beauty Code를 기준으로 확인한 결과입니다"
    : stopped
      ? "적합도 결과를 아직 보여드릴 수 없습니다"
      : stage === "analyzing"
        ? "운영자가 AI 분석을 진행하고 있습니다"
        : stage === "collecting"
          ? "운영자가 상품 정보를 확인하고 있습니다"
          : "상품 신청을 접수하고 있습니다";

  const statusDescription = done
    ? productName
    : stopped
      ? message
      : stage === "analyzing"
        ? "회원님의 Beauty Code와 선택하신 상품이 얼마나 잘 맞는지 꼼꼼하게 확인하고 있습니다."
        : stage === "collecting"
          ? "상품 특성을 확인한 뒤 회원님의 Beauty Code를 기준으로 16유형 적합도 분석을 진행합니다."
          : "신청이 완료되면 운영자가 상품을 확인하고 AI 분석을 시작합니다.";

  return (
    <div className="fixed inset-0 z-[140] overflow-y-auto bg-black/40 px-4 py-6">
      <section className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-6 text-[#382d2d] shadow-2xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f2]">
            {done ? <span className="text-2xl text-[#d88c9c]">✓</span> : stopped ? <span className="text-2xl text-[#b84f63]">!</span> : <span className="h-7 w-7 animate-spin rounded-full border-4 border-[#f1dfe2] border-t-[#d88c9c]" />}
          </div>
          <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-[#b97b88]">LAYAD BEAUTY CODE</p>
          <h2 className="mt-3 text-xl font-semibold">{statusTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[#766767]">{statusDescription}</p>
        </div>

        {!done && !stopped ? (
          <div className="mt-6 space-y-3 text-sm">
            {["상품 신청 완료", "상품 정보 확인", "운영자 AI 적합도 분석", "회원님 유형 결과 공개"].map((label, index) => {
              const number = index + 1;
              const active = number <= stageNumber;
              return <div key={label} className="flex items-center gap-3 rounded-2xl bg-[#fffafa] px-4 py-3"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-[#d88c9c] text-white" : "bg-[#eadfe1] text-[#9b898c]"}`}>{number}</span><span className={active ? "font-medium" : "text-[#9b898c]"}>{label}</span></div>;
            })}
          </div>
        ) : null}

        {done && myFit ? (
          <>
            <section className="mt-7 rounded-3xl border border-[#efcbd3] bg-[#fff7f8] p-6 text-center">
              <p className="text-sm text-[#806f72]">선택하신 상품은 회원님의 Beauty Code <b>{userCode}</b>와</p>
              <p className="mt-3 text-3xl font-semibold text-[#a94f65]">{fitMessage(myFit.fitScore).user}</p>
              <p className="mt-4 text-6xl font-semibold text-[#d07488]">{myFit.fitScore}<span className="ml-1 text-xl">점</span></p>
              <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs">
                <span className="rounded-full bg-white px-3 py-2">16유형 중 {myRank}위</span>
                <span className="rounded-full bg-white px-3 py-2">최고 적합 {bestFit?.beautyCode} {bestFit?.fitScore}점</span>
                <span className="rounded-full bg-white px-3 py-2">최고점과 {Math.max(0, (bestFit?.fitScore ?? myFit.fitScore) - myFit.fitScore)}점 차이</span>
              </div>
            </section>

            <section className="mt-7">
              <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold tracking-[0.16em] text-[#b97b88]">FIT HEATMAP</p><h3 className="mt-1 text-lg font-semibold">이 상품의 16유형 적합도</h3></div><p className="text-xs text-[#806f72]">내 유형은 굵은 테두리로 표시됩니다.</p></div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(result?.fits ?? []).map((fit) => {
                  const mine = fit.beautyCode === userCode;
                  const best = fit.beautyCode === bestFit?.beautyCode;
                  return <article key={fit.beautyCode} style={heatStyle(fit.fitScore, mine, best)} className="rounded-2xl border p-4 text-center"><div className="flex items-center justify-center gap-1"><b>{fit.beautyCode}</b>{mine ? <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px]">회원님</span> : best ? <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px]">최고</span> : null}</div><p className="mt-2 text-2xl font-semibold">{fit.fitScore}</p><p className="mt-1 text-xs">{fitMessage(fit.fitScore).admin}</p></article>;
                })}
              </div>
            </section>
          </>
        ) : null}

        {(done || stopped) ? <button type="button" onClick={() => setVisible(false)} className="mt-7 w-full rounded-full bg-[#d88c9c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c8798a]">확인</button> : null}
      </section>
    </div>
  );
}
