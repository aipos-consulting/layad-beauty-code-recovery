"use client";

import { useEffect } from "react";

const CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;

type Scores = Record<(typeof CODES)[number], number>;

export default function AdminAiWorkflow() {
  useEffect(() => {
    if (!window.location.pathname.startsWith("/admin")) return;

    const enhance = () => {
      const paragraphs = Array.from(document.querySelectorAll("p"));
      const guide = paragraphs.find(node => node.textContent?.includes("ChatGPT Plus에 분석 지시문"));
      if (guide) guide.textContent = "AI 분석 결과를 확인한 후 승인하면 사용자에게 즉시 공개됩니다. 결과가 적절하지 않으면 AI 재분석을 요청하거나 보류할 수 있습니다.";

      const legacyHeading = Array.from(document.querySelectorAll("h3")).find(node => node.textContent?.includes("ChatGPT Plus 분석 지시문"));
      const legacySection = legacyHeading?.closest("section");
      if (!legacySection || legacySection.getAttribute("data-ai-approval-ready") === "true") return;

      legacySection.setAttribute("data-ai-approval-ready", "true");
      let currentScores: Scores | null = null;
      let currentSummary = "";

      legacySection.innerHTML = `
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 class="font-semibold">AI 분석 및 1건 즉시 승인</h3>
            <p class="mt-1 text-xs text-[#78696c]">AI가 생성한 결과는 수정하지 않습니다. 승인·재분석·보류 중 하나를 선택합니다.</p>
          </div>
          <button type="button" data-ai-start class="rounded-xl bg-[#d88c9c] px-4 py-3 text-sm font-semibold text-white">AI 분석 시작</button>
        </div>
        <div data-ai-status class="mt-4 rounded-xl bg-[#f7f1f2] p-4 text-sm text-[#66575a]">분석 완료 즉시 1건 단위로 승인할 수 있습니다.</div>
        <div data-ai-result class="mt-4 hidden">
          <p data-ai-summary class="rounded-xl bg-white p-4 text-sm leading-6 text-[#66575a]"></p>
          <div data-ai-grid class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"></div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" data-ai-approve class="rounded-xl bg-[#382d2d] px-5 py-3 text-sm font-semibold text-white">승인 및 공개</button>
            <button type="button" data-ai-retry class="rounded-xl border border-[#d8b6bd] px-4 py-3 text-sm font-semibold">AI 재분석</button>
            <button type="button" data-ai-hold class="rounded-xl border border-[#d8b6bd] px-4 py-3 text-sm font-semibold">보류</button>
          </div>
        </div>
        <div class="mt-4 rounded-xl border border-[#eadfe1] bg-white p-4 text-xs leading-6 text-[#78696c]">
          초기 운영 설정: 승인 단위 1건 · 분석 완료 즉시 알림 · 운영자 승인 후 공개 · 점수 수정 불가
          <button type="button" data-notification class="ml-2 underline">브라우저 알림 켜기</button>
        </div>`;

      const startButton = legacySection.querySelector<HTMLButtonElement>("[data-ai-start]");
      const approveButton = legacySection.querySelector<HTMLButtonElement>("[data-ai-approve]");
      const retryButton = legacySection.querySelector<HTMLButtonElement>("[data-ai-retry]");
      const holdButton = legacySection.querySelector<HTMLButtonElement>("[data-ai-hold]");
      const notificationButton = legacySection.querySelector<HTMLButtonElement>("[data-notification]");
      const status = legacySection.querySelector<HTMLElement>("[data-ai-status]");
      const result = legacySection.querySelector<HTMLElement>("[data-ai-result]");
      const summary = legacySection.querySelector<HTMLElement>("[data-ai-summary]");
      const grid = legacySection.querySelector<HTMLElement>("[data-ai-grid]");

      const selectedRequestId = () => document.querySelector<HTMLSelectElement>("select")?.value ?? "";

      const renderResult = (scores: Scores, text: string) => {
        currentScores = scores;
        currentSummary = text;
        if (summary) summary.textContent = text;
        if (grid) grid.innerHTML = CODES.map(code => `<div class="rounded-xl border border-[#eadfe1] bg-white p-3 text-center"><p class="text-xs font-semibold">${code}</p><p class="mt-1 text-xl font-semibold">${scores[code]}</p></div>`).join("");
        result?.classList.remove("hidden");
      };

      const runAnalysis = async () => {
        const requestId = selectedRequestId();
        if (!requestId || !status || !startButton) return;
        currentScores = null;
        result?.classList.add("hidden");
        startButton.disabled = true;
        startButton.textContent = "AI 분석 중";
        status.textContent = "상품 정보를 확인하고 16유형 점수를 생성하고 있습니다.";
        try {
          const response = await fetch("/api/admin/ai-fit-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId }) });
          const payload = await response.json();
          if (!response.ok || !payload.ok) throw new Error(payload.message || payload.code || "AI 분석 실패");
          renderResult(payload.scores as Scores, payload.summary ?? "AI 분석이 완료되었습니다.");
          status.textContent = "AI 분석 및 자동 검증이 완료되었습니다. 승인하면 즉시 공개됩니다.";
          if (Notification.permission === "granted") new Notification("LAYAD AI 분석 완료", { body: "상품 분석 1건이 승인 대기 중입니다." });
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "AI 분석에 실패했습니다.";
        } finally {
          startButton.disabled = false;
          startButton.textContent = "AI 분석 시작";
        }
      };

      startButton?.addEventListener("click", runAnalysis);
      retryButton?.addEventListener("click", runAnalysis);

      approveButton?.addEventListener("click", async () => {
        const requestId = selectedRequestId();
        if (!requestId || !currentScores || !status || !approveButton) return;
        approveButton.disabled = true;
        status.textContent = "결과를 승인하고 공개하고 있습니다.";
        try {
          const response = await fetch("/api/admin/fit-result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, scores: currentScores, summary: currentSummary }) });
          const payload = await response.json();
          if (!response.ok || !payload.ok) throw new Error(payload.message || payload.detail || payload.code || "승인 실패");
          status.textContent = "승인 및 공개가 완료되었습니다.";
          result?.classList.add("hidden");
          window.setTimeout(() => window.location.reload(), 700);
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "승인에 실패했습니다.";
          approveButton.disabled = false;
        }
      });

      holdButton?.addEventListener("click", async () => {
        const requestId = selectedRequestId();
        if (!requestId || !status || !holdButton) return;
        holdButton.disabled = true;
        try {
          const response = await fetch("/api/admin/analysis-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, action: "hold" }) });
          const payload = await response.json();
          if (!response.ok || !payload.ok) throw new Error(payload.message || payload.detail || "보류 실패");
          status.textContent = "해당 분석을 보류했습니다.";
          result?.classList.add("hidden");
          window.setTimeout(() => window.location.reload(), 700);
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "보류에 실패했습니다.";
          holdButton.disabled = false;
        }
      });

      notificationButton?.addEventListener("click", async () => {
        if (!("Notification" in window)) return;
        const permission = await Notification.requestPermission();
        if (notificationButton) notificationButton.textContent = permission === "granted" ? "브라우저 알림 사용 중" : "브라우저 알림 허용 필요";
      });

      const scoreInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]'));
      scoreInputs.forEach(input => { input.disabled = true; input.closest("label")?.classList.add("hidden"); });
      const legacySave = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(button => button.textContent?.includes("16유형 결과 저장 및 공개"));
      if (legacySave) legacySave.classList.add("hidden");
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
