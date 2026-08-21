"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "layad-supabase-session-id";
const PENDING_PRODUCT_KEY = "layad-pending-saved-product-v1";

type Fit = {
  beautyCode: string;
  fitScore: number;
  reviewCount: number;
  confidence: number;
};

type ResultPayload = {
  ok?: boolean;
  requestId?: string;
  sessionId?: string;
  status?: string;
  message?: string;
  errorMessage?: string | null;
  product?: { canonical_name?: string; brand?: string; category?: string } | null;
  userBeautyCode?: string | null;
  fits?: Fit[];
};

type ViewState =
  | { kind: "hidden" }
  | { kind: "loading"; productName: string }
  | { kind: "pending"; productName: string; message: string }
  | { kind: "error"; productName: string; message: string }
  | { kind: "completed"; productName: string; productRef: string; beautyCode: string; score: number; fits: Fit[] };

const ALLOWED_LABELS = [
  "적합도 분석하기",
  "잘 맞는지 확인하기",
  "Analyze product fit",
  "Check product fit",
  "適合度を分析",
  "相性を確認",
];

export default function ProductFitResultFeedback() {
  const [view, setView] = useState<ViewState>({ kind: "hidden" });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const submitHandler = async (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!(form instanceof HTMLFormElement)) return;

      const button = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      const input = form.querySelector("input") as HTMLInputElement | null;
      const label = button?.textContent ?? "";
      const inputValue = input?.value.trim() ?? "";

      if (!inputValue || !ALLOWED_LABELS.some((item) => label.includes(item))) return;

      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const inputType = /^https?:\/\//i.test(inputValue) ? "url" : "name";
      if (button) button.disabled = true;
      setSaveMessage("");
      setView({ kind: "loading", productName: inputValue });

      try {
        const requestResponse = await fetch("/api/product-analysis-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, inputType, inputValue }),
        });
        const requestPayload = (await requestResponse.json()) as ResultPayload;

        if (!requestResponse.ok || !requestPayload.ok || !requestPayload.requestId) {
          throw new Error(requestPayload.message || "상품 분석 요청을 저장하지 못했습니다.");
        }

        if (input) input.value = "";

        if (requestPayload.status !== "completed") {
          setView({
            kind: "pending",
            productName: inputValue,
            message: requestPayload.message || "상품 분석 요청이 접수되었습니다. ChatGPT 분석 대기 상태입니다.",
          });
          return;
        }

        const resultResponse = await fetch(
          `/api/product-analysis-result?sessionId=${encodeURIComponent(sessionId)}&requestId=${encodeURIComponent(requestPayload.requestId)}`,
          { cache: "no-store" },
        );
        const resultPayload = (await resultResponse.json()) as ResultPayload;

        if (!resultResponse.ok || !resultPayload.ok || resultPayload.status !== "completed" || !resultPayload.fits) {
          throw new Error(resultPayload.message || "저장된 적합도 결과를 불러오지 못했습니다.");
        }

        const beautyCode = resultPayload.userBeautyCode || "";
        const myFit = resultPayload.fits.find((fit) => fit.beautyCode === beautyCode);
        if (!myFit) throw new Error("회원님의 Beauty Code 적합도 점수를 찾지 못했습니다.");

        setView({
          kind: "completed",
          productName: resultPayload.product?.canonical_name || inputValue,
          productRef: requestPayload.requestId,
          beautyCode,
          score: myFit.fitScore,
          fits: resultPayload.fits,
        });
      } catch (error) {
        setView({
          kind: "error",
          productName: inputValue,
          message: error instanceof Error ? error.message : "적합도 결과 확인에 실패했습니다.",
        });
      } finally {
        if (button) button.disabled = false;
      }
    };

    document.addEventListener("submit", submitHandler, true);
    return () => document.removeEventListener("submit", submitHandler, true);
  }, []);

  async function saveProduct() {
    if (view.kind !== "completed" || saving) return;
    const pending = {
      productRef: view.productRef,
      productName: view.productName,
      beautyCode: view.beautyCode,
      fitScore: view.score,
    };
    localStorage.setItem(PENDING_PRODUCT_KEY, JSON.stringify(pending));
    setSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/mypage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-product", ...pending }),
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; message?: string; code?: string };
      if (response.ok && payload.ok) {
        localStorage.removeItem(PENDING_PRODUCT_KEY);
        setSaveMessage("My Page에 저장했습니다.");
        return;
      }
      if (response.status === 401 || payload.code === "AUTH_REQUIRED") {
        setSaveMessage("로그인하면 이 상품을 My Page에 저장할 수 있습니다. 결과는 브라우저에 보관했습니다.");
        return;
      }
      setSaveMessage(`${payload.message || "저장에 실패했습니다."} 결과는 브라우저에 보관되어 있습니다.`);
    } catch {
      setSaveMessage("네트워크가 불안정합니다. 결과는 브라우저에 보관되어 있습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (view.kind === "hidden") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        {view.kind === "loading" && (
          <><p className="text-xs font-semibold tracking-[0.18em] text-[#b66f7f]">PRODUCT FIT</p><h2 className="mt-3 text-xl font-bold text-[#4f4144]">저장된 분석 결과를 확인하고 있습니다</h2><p className="mt-3 text-sm text-[#806f72]">{view.productName}</p></>
        )}
        {view.kind === "pending" && (
          <><p className="text-xs font-semibold tracking-[0.18em] text-[#b66f7f]">PRODUCT FIT</p><h2 className="mt-3 text-xl font-bold text-[#4f4144]">상품 분석 요청이 접수되었습니다</h2><p className="mt-3 text-sm text-[#806f72]">{view.productName}</p><p className="mt-5 rounded-2xl bg-[#fff4f6] p-4 text-sm leading-6 text-[#6d5960]">{view.message}</p></>
        )}
        {view.kind === "error" && (
          <><p className="text-xs font-semibold tracking-[0.18em] text-[#b66f7f]">PRODUCT FIT</p><h2 className="mt-3 text-xl font-bold text-[#4f4144]">결과를 확인하지 못했습니다</h2><p className="mt-3 text-sm text-[#806f72]">{view.productName}</p><p className="mt-5 rounded-2xl bg-[#fff4f6] p-4 text-sm leading-6 text-[#a14f62]">{view.message}</p></>
        )}
        {view.kind === "completed" && (
          <>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#b66f7f]">PRODUCT FIT ANALYSIS</p>
            <h2 className="mt-3 text-xl font-bold text-[#4f4144]">내 상품 적합도 결과</h2>
            <p className="mt-2 text-sm text-[#806f72]">{view.productName}</p>
            <div className="mt-5 rounded-3xl bg-[#fff0f2] p-6 text-center"><p className="text-sm font-semibold text-[#9f6572]">내 Beauty Code {view.beautyCode}</p><p className="mt-2 text-5xl font-black text-[#c86f82]">{view.score}</p><p className="mt-1 text-sm font-semibold text-[#806f72]">100점 만점</p></div>
            <div className="mt-5 grid grid-cols-4 gap-2">{view.fits.map((fit) => <div key={fit.beautyCode} className={`min-w-0 rounded-xl border px-1.5 py-3 text-center ${fit.beautyCode === view.beautyCode ? "border-[#c86f82] bg-[#fff0f2]" : "border-[#ead7db] bg-white"}`}><div className="whitespace-nowrap text-[11px] font-semibold tracking-[-0.02em] text-[#6d5960] sm:text-xs">{fit.beautyCode}</div><div className="mt-1 text-sm font-bold text-[#4f4144]">{fit.fitScore}</div></div>)}</div>
            <button type="button" onClick={saveProduct} disabled={saving} className="mt-5 w-full rounded-2xl border border-[#d88c9c] bg-white px-5 py-3 text-sm font-semibold text-[#a85f6e] disabled:opacity-60">{saving ? "저장 중..." : "My Page에 저장"}</button>
            {saveMessage ? <p className="mt-3 rounded-2xl bg-[#fff4f6] p-3 text-sm leading-6 text-[#806f72]">{saveMessage}</p> : null}
            {saveMessage.startsWith("로그인하면") ? <a href="/account" className="mt-3 block text-center text-sm font-semibold text-[#a85f6e] underline underline-offset-4">로그인 · 회원가입</a> : null}
          </>
        )}
        {view.kind !== "loading" && <button type="button" onClick={() => { setView({ kind: "hidden" }); setSaveMessage(""); }} className="mt-4 w-full rounded-2xl bg-[#d88c9c] px-5 py-3 text-sm font-semibold text-white">확인</button>}
      </div>
    </div>
  );
}
