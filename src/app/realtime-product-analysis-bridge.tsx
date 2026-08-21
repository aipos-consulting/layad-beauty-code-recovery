"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "layad-supabase-session-id";

type Stage = "idle" | "saving" | "reviews" | "analyzing" | "scoring" | "completed" | "failed";
type Fit = { beautyCode: string; fitScore: number; reviewCount: number; confidence: number };
type ResultPayload = {
  ok?: boolean;
  code?: string;
  status?: string;
  message?: string;
  errorMessage?: string | null;
  requestId?: string;
  reused?: boolean;
  product?: { canonical_name?: string; brand?: string; category?: string } | null;
  userBeautyCode?: string | null;
  fits?: Fit[];
};

type ProductRequestDetail = {
  beautyCode: string;
  inputType: "name" | "url";
  inputValue: string;
};

const stageText: Record<Exclude<Stage, "idle" | "completed" | "failed">, { title: string; desc: string; step: number }> = {
  saving: {
    title: "상품을 확인하고 있습니다",
    desc: "이미 분석된 상품인지 먼저 확인합니다. 기존 결과가 있으면 바로 보여드립니다.",
    step: 1,
  },
  reviews: {
    title: "실제 공개 리뷰를 찾고 있습니다",
    desc: "신규 상품은 웹에 공개된 실제 사용자 리뷰와 출처를 확인합니다.",
    step: 2,
  },
  analyzing: {
    title: "리뷰의 사용감과 특성을 분석하고 있습니다",
    desc: "확인된 리뷰 근거를 O/D · G/M · P/C · V/E 네 축으로 분석합니다.",
    step: 3,
  },
  scoring: {
    title: "16유형 적합도를 계산하고 있습니다",
    desc: "리뷰 분석 결과를 회원님의 Beauty Code와 비교해 최종 적합도를 계산합니다.",
    step: 4,
  },
};

export default function RealtimeProductAnalysisBridge() {
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [productInput, setProductInput] = useState("");

  useEffect(() => {
    const run = async (detail: ProductRequestDetail) => {
      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) return;

      setProductInput(detail.inputValue);
      setResult(null);
      setError("");
      setStage("saving");
      setVisible(true);

      try {
        const requestResponse = await fetch("/api/product-analysis-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, inputType: detail.inputType, inputValue: detail.inputValue }),
        });
        const requestPayload = (await requestResponse.json()) as ResultPayload;
        if (!requestResponse.ok || !requestPayload.ok || !requestPayload.requestId) {
          throw new Error(requestPayload.message || "상품 요청을 저장하지 못했습니다.");
        }

        if (requestPayload.status === "completed" || requestPayload.reused) {
          setStage("scoring");
        } else {
          setStage("reviews");
          const runResponse = await fetch("/api/product-analysis-run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId: requestPayload.requestId }),
          });
          setStage("analyzing");
          const runPayload = (await runResponse.json().catch(() => ({}))) as ResultPayload;
          if (!runResponse.ok || !runPayload.ok) {
            throw new Error(runPayload.message || `실시간 AI 분석 실행 실패 (${runResponse.status})`);
          }
          setStage("scoring");
        }

        const resultResponse = await fetch(`/api/product-analysis-result?sessionId=${encodeURIComponent(sessionId)}&requestId=${encodeURIComponent(requestPayload.requestId)}`, { cache: "no-store" });
        const resultPayload = (await resultResponse.json()) as ResultPayload;
        if (!resultResponse.ok || !resultPayload.ok) {
          throw new Error(resultPayload.message || resultPayload.errorMessage || "분석 결과를 읽지 못했습니다.");
        }
        if (resultPayload.status !== "completed") {
          throw new Error(resultPayload.errorMessage || `분석이 완료되지 않았습니다. 현재 상태: ${resultPayload.status ?? "unknown"}`);
        }
        setResult(resultPayload);
        setStage("completed");
      } catch (e) {
        setError(e instanceof Error ? e.message : "실시간 분석 중 오류가 발생했습니다.");
        setStage("failed");
      }
    };

    const handler = (event: Event) => {
      const custom = event as CustomEvent<ProductRequestDetail>;
      if (!custom.detail?.inputValue) return;
      void run(custom.detail);
    };

    window.addEventListener("layad:product-fit-request", handler as EventListener);
    return () => window.removeEventListener("layad:product-fit-request", handler as EventListener);
  }, []);

  if (!visible || stage === "idle") return null;

  const fits = [...(result?.fits ?? [])].sort((a, b) => b.fitScore - a.fitScore);
  const mine = fits.find((fit) => fit.beautyCode === result?.userBeautyCode);
  const info = stage !== "completed" && stage !== "failed" ? stageText[stage] : null;
  const activeStep = info?.step ?? (stage === "completed" ? 4 : 0);
  const steps = ["상품 확인", "실제 공개 리뷰 수집", "리뷰 특성 분석", "16유형 적합도 계산"];

  return (
    <div className="fixed inset-0 z-[220] overflow-y-auto bg-black/45 px-4 py-6">
      <section className="mx-auto w-full max-w-xl rounded-3xl bg-white p-6 text-[#382d2d] shadow-2xl sm:p-8">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#b97b88]">LAYAD BEAUTY CODE</p>
          {stage === "completed" ? (
            <>
              <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f2] text-2xl text-[#d88c9c]">✓</div>
              <h2 className="mt-4 text-xl font-semibold">실시간 분석이 완료되었습니다</h2>
              <p className="mt-2 text-sm text-[#766767]">{productInput}</p>
              {mine ? <p className="mt-6 text-5xl font-semibold text-[#d07488]">{mine.fitScore}<span className="ml-1 text-lg">점</span></p> : null}
              {result?.userBeautyCode ? <p className="mt-2 text-sm text-[#806f72]">회원님 Beauty Code {result.userBeautyCode}</p> : null}
            </>
          ) : stage === "failed" ? (
            <>
              <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f2] text-2xl text-[#b84f63]">!</div>
              <h2 className="mt-4 text-xl font-semibold">실시간 분석을 완료하지 못했습니다</h2>
              <p className="mt-3 text-sm leading-6 text-[#b84f63]">{error}</p>
            </>
          ) : (
            <>
              <div className="mx-auto mt-5 h-9 w-9 animate-spin rounded-full border-4 border-[#f1dfe2] border-t-[#d88c9c]" />
              <h2 className="mt-4 text-xl font-semibold">{info?.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#766767]">{info?.desc}</p>
            </>
          )}
        </div>

        {stage !== "completed" && stage !== "failed" ? (
          <>
            <div className="mt-6 rounded-2xl border border-[#f0d6dc] bg-[#fff8f9] px-4 py-4 text-sm leading-6 text-[#6f5c60]">
              <p className="font-semibold text-[#a94f65]">왜 시간이 필요한가요?</p>
              <p className="mt-1">LAYAD는 임의 점수를 만들지 않습니다. 신규 상품은 공개된 실제 사용자 리뷰와 출처를 확인하고, 그 근거를 분석한 뒤 16개 Beauty Code 적합도를 계산합니다.</p>
            </div>
            <div className="mt-5 space-y-2">
              {steps.map((label, index) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-[#fffafa] px-4 py-3 text-sm">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${index + 1 <= activeStep ? "bg-[#d88c9c] text-white" : "bg-[#eadfe1] text-[#9b898c]"}`}>{index + 1}</span>
                  <span className={index + 1 <= activeStep ? "font-medium" : "text-[#9b898c]"}>{label}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {(stage === "completed" || stage === "failed") ? (
          <button type="button" onClick={() => setVisible(false)} className="mt-7 w-full rounded-full bg-[#d88c9c] px-5 py-3 text-sm font-semibold text-white">확인</button>
        ) : null}
      </section>
    </div>
  );
}
