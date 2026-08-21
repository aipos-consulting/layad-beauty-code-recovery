"use client";

import { useEffect, useMemo, useState } from "react";

const SESSION_KEY = "layad-supabase-session-id";

type RequestDetail = {
  beautyCode: string;
  inputType: "name" | "url";
  inputValue: string;
};

type Fit = { beautyCode: string; fitScore: number; reviewCount: number; confidence: number };
type ResultPayload = {
  ok?: boolean;
  code?: string;
  status?: string;
  message?: string;
  errorMessage?: string | null;
  requestId?: string;
  product?: { canonical_name?: string; brand?: string; category?: string } | null;
  userBeautyCode?: string | null;
  fits?: Fit[];
};

type Stage = "idle" | "checking" | "collecting" | "analyzing" | "scoring" | "done" | "failed";

export default function ProductFitInputBridge() {
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [productName, setProductName] = useState("");

  useEffect(() => {
    const onInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.id !== "product-input" && target.id !== "manual-product-input") return;
      const form = target.closest("form");
      const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (!button) return;
      const hasValue = target.value.trim().length > 0;
      button.disabled = !hasValue;
      button.setAttribute("aria-disabled", String(!hasValue));
    };

    const onRequest = async (event: Event) => {
      const detail = (event as CustomEvent<RequestDetail>).detail;
      if (!detail?.inputValue) return;

      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        setStage("failed");
        setMessage("Beauty Code 세션을 확인하지 못했습니다. 유형 선택을 다시 확인해 주세요.");
        return;
      }

      setProductName(detail.inputValue);
      setResult(null);
      setMessage("");
      setStage("checking");

      try {
        const requestResponse = await fetch("/api/product-analysis-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            beautyCode: detail.beautyCode,
            inputType: detail.inputType,
            inputValue: detail.inputValue,
          }),
        });
        const requestPayload = await requestResponse.json() as ResultPayload & { productName?: string };
        if (!requestResponse.ok || !requestPayload.ok || !requestPayload.requestId) {
          throw new Error(requestPayload.message || "상품 확인에 실패했습니다.");
        }

        if (requestPayload.status !== "completed") {
          setStage("collecting");
          await new Promise((resolve) => window.setTimeout(resolve, 450));
          setStage("analyzing");

          const runResponse = await fetch("/api/product-analysis-run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId: requestPayload.requestId }),
          });
          const runPayload = await runResponse.json().catch(() => ({})) as ResultPayload;
          if (!runResponse.ok || !runPayload.ok) {
            throw new Error(runPayload.message || `실시간 리뷰 분석에 실패했습니다. (${runResponse.status})`);
          }
        }

        setStage("scoring");
        const resultResponse = await fetch(`/api/product-analysis-result?sessionId=${encodeURIComponent(sessionId)}&requestId=${encodeURIComponent(requestPayload.requestId)}`, { cache: "no-store" });
        const resultPayload = await resultResponse.json() as ResultPayload;
        if (!resultResponse.ok || !resultPayload.ok || resultPayload.status !== "completed") {
          throw new Error(resultPayload.errorMessage || resultPayload.message || "분석 결과를 불러오지 못했습니다.");
        }

        setResult(resultPayload);
        setStage("done");
      } catch (error) {
        setStage("failed");
        setMessage(error instanceof Error ? error.message : "상품 분석 중 오류가 발생했습니다.");
      }
    };

    document.addEventListener("input", onInput, true);
    window.addEventListener("layad:product-fit-request", onRequest as EventListener);
    return () => {
      document.removeEventListener("input", onInput, true);
      window.removeEventListener("layad:product-fit-request", onRequest as EventListener);
    };
  }, []);

  const myFit = useMemo(() => {
    const code = result?.userBeautyCode;
    return result?.fits?.find((fit) => fit.beautyCode === code) ?? null;
  }, [result]);

  if (stage === "idle") return null;

  const stageIndex = stage === "checking" ? 1 : stage === "collecting" ? 2 : stage === "analyzing" ? 3 : stage === "scoring" ? 4 : stage === "done" ? 4 : 0;
  const labels = ["상품 확인", "공개 리뷰 수집", "리뷰 특성 분석", "16유형 적합도 계산"];
  const title = stage === "done"
    ? "분석이 완료되었습니다"
    : stage === "failed"
      ? "분석을 완료하지 못했습니다"
      : stage === "checking"
        ? "상품을 확인하고 있습니다"
        : stage === "collecting"
          ? "실제 공개 리뷰를 찾고 있습니다"
          : stage === "analyzing"
            ? "실제 리뷰의 사용감과 상품 특성을 분석하고 있습니다"
            : "회원님의 Beauty Code와 비교하고 있습니다";

  return (
    <div className="fixed inset-0 z-[210] overflow-y-auto bg-black/45 px-4 py-6">
      <section className="mx-auto w-full max-w-lg rounded-3xl bg-white p-6 text-[#382d2d] shadow-2xl sm:p-8">
        <div className="text-center">
          {stage === "done" ? (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f2] text-2xl text-[#d88c9c]">✓</div>
          ) : stage === "failed" ? (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f2] text-2xl text-[#b84f63]">!</div>
          ) : (
            <div className="mx-auto h-14 w-14 rounded-full border-4 border-[#f1dfe2] border-t-[#d88c9c] animate-spin" />
          )}
          <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-[#b97b88]">LAYAD BEAUTY CODE</p>
          <h2 className="mt-3 text-xl font-semibold">{title}</h2>
          <p className="mt-3 break-words text-sm leading-6 text-[#766767]">{productName}</p>
        </div>

        {stage !== "done" && stage !== "failed" ? (
          <>
            <div className="mt-6 rounded-2xl border border-[#f1dfe2] bg-[#fffafa] p-4">
              <p className="text-sm font-semibold text-[#5f5053]">왜 몇 초가 필요한가요?</p>
              <p className="mt-2 text-sm leading-6 text-[#766767]">신규 상품은 단순 점수를 만드는 것이 아니라, 공개된 실제 사용자 리뷰를 찾아 사용감과 상품 특성을 분석한 뒤 회원님의 Beauty Code와 비교합니다.</p>
            </div>
            <div className="mt-5 space-y-2">
              {labels.map((label, index) => {
                const active = index + 1 <= stageIndex;
                return (
                  <div key={label} className="flex items-center gap-3 rounded-2xl bg-[#fffafa] px-4 py-3 text-sm">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-[#d88c9c] text-white" : "bg-[#eadfe1] text-[#9b898c]"}`}>{index + 1}</span>
                    <span className={active ? "font-medium" : "text-[#9b898c]"}>{label}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {stage === "done" && myFit ? (
          <div className="mt-7 rounded-3xl border border-[#efcbd3] bg-[#fff7f8] p-6 text-center">
            <p className="text-sm text-[#806f72]">회원님의 Beauty Code <b>{result?.userBeautyCode}</b></p>
            <p className="mt-3 text-5xl font-semibold text-[#d07488]">{myFit.fitScore}<span className="ml-1 text-lg">점</span></p>
            <p className="mt-3 text-sm text-[#806f72]">공개 리뷰 근거 {myFit.reviewCount}건 기반</p>
          </div>
        ) : null}

        {stage === "failed" ? <p className="mt-6 rounded-2xl bg-[#fff5f6] p-4 text-sm leading-6 text-[#a85f6e]">{message}</p> : null}

        {(stage === "done" || stage === "failed") ? (
          <button type="button" onClick={() => setStage("idle")} className="mt-7 w-full rounded-full bg-[#d88c9c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c8798a]">확인</button>
        ) : null}
      </section>
    </div>
  );
}
