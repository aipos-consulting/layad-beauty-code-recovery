"use client";

import { useEffect } from "react";

const CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;
type Scores = Record<(typeof CODES)[number], number>;
type ManualResult = { summary: string; scores: Scores };

function extractStructuredResult(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("분석 결과 형식을 확인할 수 없습니다.");
  return trimmed.slice(start, end + 1);
}

function parseManualResult(text: string): ManualResult {
  const parsed = JSON.parse(extractStructuredResult(text)) as { summary?: unknown; scores?: Record<string, unknown> };
  const summary = typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : "분석 요약이 없습니다.";
  const rawScores = parsed.scores;
  if (!rawScores || typeof rawScores !== "object") throw new Error("16유형 점수 항목을 찾지 못했습니다.");

  const scores = {} as Scores;
  for (const code of CODES) {
    const value = rawScores[code];
    if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 100) {
      throw new Error(`${code} 점수는 0~100 정수여야 합니다.`);
    }
    scores[code] = Number(value);
  }
  return { summary, scores };
}

function selectedContext() {
  const select = document.querySelector<HTMLSelectElement>("select");
  const optionText = select?.selectedOptions[0]?.textContent?.trim() ?? "";
  const product = optionText.split(" · 신청자 ")[0]?.trim() || "신청 상품";
  const beautyCode = optionText.match(/신청자\s+([A-Z]{4})/)?.[1] ?? "미확인";
  return { requestId: select?.value ?? "", product, beautyCode };
}

function manualPrompt(product: string, beautyCode: string) {
  const scoreTemplate = Object.fromEntries(CODES.map(code => [code, 0]));
  return `당신은 LAYAD BEAUTY CODE의 화장품 상품 적합도 분석 담당자입니다.\n\n분석 대상 상품: ${product}\n신청자 Beauty Code: ${beautyCode}\n\nBeauty Code 공식 축 정의\n- O/D\n- G/M\n- P = Precise: 정교함·완성도 중심\n- C = Convenient: 간편함·편의성 중심\n- V = Variable: 제품·환경에 따라 결과가 달라짐\n- E = Even: 비교적 일정하고 안정적인 결과\n\n공개적으로 확인 가능한 상품 정보만 사용하고, 확인할 수 없는 사실은 추정하지 마세요. 상품 특성에 근거해 16개 유형 각각의 적합도를 0~100 정수로 평가하세요. 같은 상품 안에서 유형별 상대 차이가 드러나도록 일관된 기준을 적용하세요.\n\n응답은 설명이나 코드펜스 없이 아래 결과 형식만 출력하세요. 모든 코드가 반드시 포함되어야 합니다.\n\n${JSON.stringify({ summary: "상품 특성과 유형별 점수 차이를 설명하는 짧은 요약", scores: scoreTemplate }, null, 2)}`;
}

export default function AdminAiWorkflow() {
  useEffect(() => {
    if (!window.location.pathname.startsWith("/admin")) return;

    const enhance = () => {
      const paragraphs = Array.from(document.querySelectorAll("p"));
      const guide = paragraphs.find(node => node.textContent?.includes("ChatGPT Plus에 분석 지시문") || node.textContent?.includes("AI 분석 결과를 확인한 후 승인"));
      if (guide) guide.textContent = "수동 분석 결과를 붙여넣어 검증한 후 승인하면 사용자에게 즉시 공개됩니다. 점수는 수정하지 않습니다.";

      const legacyHeading = Array.from(document.querySelectorAll("h3")).find(node => node.textContent?.includes("ChatGPT Plus 분석 지시문"));
      const legacySection = legacyHeading?.closest("section");
      if (!legacySection || legacySection.getAttribute("data-manual-validation-ready") === "true") return;

      legacySection.setAttribute("data-manual-validation-ready", "true");
      let currentResult: ManualResult | null = null;

      legacySection.innerHTML = `
        <div class="rounded-2xl border border-[#eadfe1] bg-white p-4">
          <p class="text-xs font-semibold text-[#a94f65]">분석 방식</p>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border-2 border-[#d88c9c] bg-[#fff7f8] p-4">
              <div class="flex items-center justify-between gap-2"><strong>수동 분석</strong><span class="rounded-full bg-white px-2 py-1 text-[11px] font-semibold">현재 운영</span></div>
              <p class="mt-2 text-xs leading-5 text-[#78696c]">OpenAI API를 사용하지 않습니다. 운영자가 지시문과 결과를 복사·붙여넣습니다.</p>
            </div>
            <div class="rounded-xl border border-[#eadfe1] bg-[#f7f4f4] p-4 opacity-70">
              <div class="flex items-center justify-between gap-2"><strong>자동 분석</strong><span class="rounded-full bg-white px-2 py-1 text-[11px]">오너 검증 후</span></div>
              <p class="mt-2 text-xs leading-5 text-[#78696c]">OpenAI API, 비용 한도, 결과 재사용 정책을 적용하는 향후 운영 방식입니다.</p>
            </div>
          </div>
        </div>

        <div class="mt-5">
          <h3 class="font-semibold">수동 분석 · 1건 즉시 승인</h3>
          <p class="mt-1 text-xs text-[#78696c]">① 지시문 복사 → ② ChatGPT 실행 → ③ 결과 붙여넣기 → ④ 자동 검증 → ⑤ 승인 및 공개</p>
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <section class="rounded-2xl border border-[#eadfe1] bg-[#fffdfd] p-5">
            <div class="flex items-start justify-between gap-3">
              <div><p class="text-xs font-semibold text-[#a94f65]">STEP 1</p><h4 class="mt-1 font-semibold">분석 지시문 복사</h4><p class="mt-2 text-xs leading-5 text-[#78696c]">선택 상품과 결과 출력 형식이 자동 포함됩니다.</p></div>
              <button type="button" data-copy-prompt class="rounded-xl bg-[#d88c9c] px-4 py-3 text-sm font-semibold text-white">지시문 복사</button>
            </div>
            <pre data-prompt-preview class="mt-4 max-h-44 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f7f1f2] p-4 text-xs leading-6 text-[#66575a]"></pre>
          </section>

          <section class="rounded-2xl border border-[#eadfe1] bg-[#fffdfd] p-5">
            <p class="text-xs font-semibold text-[#a94f65]">STEP 2</p>
            <h4 class="mt-1 font-semibold">ChatGPT 결과 붙여넣기</h4>
            <p class="mt-2 text-xs leading-5 text-[#78696c]">ChatGPT가 반환한 분석 결과 전체를 붙여넣으세요. 16개 점수는 개별 입력하지 않습니다.</p>
            <textarea data-manual-input rows="8" placeholder="ChatGPT 분석 결과 전체를 여기에 붙여넣으세요." class="mt-4 w-full rounded-xl border border-[#dfd1d4] bg-white p-3 text-sm"></textarea>
            <div class="mt-3 flex flex-wrap gap-2">
              <button type="button" data-validate class="rounded-xl bg-[#382d2d] px-4 py-3 text-sm font-semibold text-white">결과 검증</button>
              <button type="button" data-clear class="rounded-xl border border-[#d8b6bd] px-4 py-3 text-sm font-semibold">초기화</button>
            </div>
          </section>
        </div>

        <div data-status class="mt-4 rounded-xl bg-[#f7f1f2] p-4 text-sm text-[#66575a]">수동 모드는 앱의 OpenAI API 비용이 발생하지 않습니다.</div>

        <section data-result class="mt-4 hidden rounded-2xl border border-[#eadfe1] bg-white p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div><p class="text-xs font-semibold text-[#a94f65]">STEP 3</p><h4 class="mt-1 font-semibold">검증 완료 · 읽기 전용 결과</h4></div>
            <span class="rounded-full bg-[#edf8ef] px-3 py-2 text-xs font-semibold text-[#376b42]">16/16 정상</span>
          </div>
          <p data-summary class="mt-4 rounded-xl bg-[#fff7f8] p-4 text-sm leading-6 text-[#66575a]"></p>
          <div data-score-grid class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"></div>
          <div class="mt-5 flex flex-wrap gap-2">
            <button type="button" data-approve class="rounded-xl bg-[#382d2d] px-5 py-3 text-sm font-semibold text-white">승인 및 공개</button>
            <button type="button" data-retry class="rounded-xl border border-[#d8b6bd] px-4 py-3 text-sm font-semibold">다시 분석</button>
            <button type="button" data-hold class="rounded-xl border border-[#d8b6bd] px-4 py-3 text-sm font-semibold">보류</button>
          </div>
          <p class="mt-3 text-xs text-[#78696c]">점수가 적절하지 않으면 수정하지 말고 다시 분석하거나 보류합니다.</p>
        </section>

        <div class="mt-4 rounded-xl border border-[#eadfe1] bg-white p-4 text-xs leading-6 text-[#78696c]">
          초기 운영 설정: 수동 모드 · 승인 단위 1건 · 운영자 승인 후 공개 · 점수 수정 불가 · 자동 모드는 오너 검증 후 전환
        </div>`;

      const promptPreview = legacySection.querySelector<HTMLElement>("[data-prompt-preview]");
      const copyButton = legacySection.querySelector<HTMLButtonElement>("[data-copy-prompt]");
      const input = legacySection.querySelector<HTMLTextAreaElement>("[data-manual-input]");
      const validateButton = legacySection.querySelector<HTMLButtonElement>("[data-validate]");
      const clearButton = legacySection.querySelector<HTMLButtonElement>("[data-clear]");
      const status = legacySection.querySelector<HTMLElement>("[data-status]");
      const result = legacySection.querySelector<HTMLElement>("[data-result]");
      const summary = legacySection.querySelector<HTMLElement>("[data-summary]");
      const grid = legacySection.querySelector<HTMLElement>("[data-score-grid]");
      const approveButton = legacySection.querySelector<HTMLButtonElement>("[data-approve]");
      const retryButton = legacySection.querySelector<HTMLButtonElement>("[data-retry]");
      const holdButton = legacySection.querySelector<HTMLButtonElement>("[data-hold]");

      const refreshPrompt = () => {
        const context = selectedContext();
        if (promptPreview) promptPreview.textContent = manualPrompt(context.product, context.beautyCode);
      };
      refreshPrompt();

      const select = document.querySelector<HTMLSelectElement>("select");
      select?.addEventListener("change", () => {
        currentResult = null;
        if (input) input.value = "";
        result?.classList.add("hidden");
        refreshPrompt();
        if (status) status.textContent = "선택한 상품의 수동 분석을 시작할 수 있습니다.";
      });

      copyButton?.addEventListener("click", async () => {
        const context = selectedContext();
        if (!context.requestId || !status || !copyButton) return;
        const prompt = manualPrompt(context.product, context.beautyCode);
        try {
          await fetch("/api/admin/analysis-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: context.requestId, action: "start" }) });
          await navigator.clipboard.writeText(prompt);
          copyButton.textContent = "복사 완료";
          status.textContent = "지시문을 복사했습니다. ChatGPT에서 실행한 뒤 분석 결과 전체를 붙여넣으세요.";
          window.setTimeout(() => { if (copyButton) copyButton.textContent = "지시문 복사"; }, 1500);
        } catch {
          status.textContent = "지시문 복사에 실패했습니다. 브라우저 클립보드 권한을 확인해 주세요.";
        }
      });

      validateButton?.addEventListener("click", () => {
        if (!input || !status) return;
        try {
          currentResult = parseManualResult(input.value);
          if (summary) summary.textContent = currentResult.summary;
          if (grid) grid.innerHTML = CODES.map(code => `<div class="rounded-xl border border-[#eadfe1] bg-white p-3 text-center"><p class="text-xs font-semibold">${code}</p><p class="mt-1 text-xl font-semibold">${currentResult!.scores[code]}</p></div>`).join("");
          result?.classList.remove("hidden");
          status.textContent = "16개 점수를 모두 검증했습니다. 내용을 확인하고 승인·다시 분석·보류 중 하나를 선택하세요.";
        } catch (error) {
          currentResult = null;
          result?.classList.add("hidden");
          status.textContent = error instanceof Error ? `결과 검증 실패: ${error.message}` : "결과 검증에 실패했습니다.";
        }
      });

      const resetManual = () => {
        currentResult = null;
        if (input) input.value = "";
        result?.classList.add("hidden");
        if (status) status.textContent = "지시문을 다시 실행하고 새 분석 결과를 붙여넣으세요.";
      };
      clearButton?.addEventListener("click", resetManual);
      retryButton?.addEventListener("click", resetManual);

      approveButton?.addEventListener("click", async () => {
        const context = selectedContext();
        if (!context.requestId || !currentResult || !status || !approveButton) return;
        approveButton.disabled = true;
        status.textContent = "검증된 결과를 승인하고 공개하고 있습니다.";
        try {
          const response = await fetch("/api/admin/fit-result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: context.requestId, scores: currentResult.scores, summary: currentResult.summary }) });
          const payload = await response.json();
          if (!response.ok || !payload.ok) throw new Error(payload.message || payload.detail || payload.code || "승인 실패");
          status.textContent = "수동 분석 결과의 승인 및 공개가 완료되었습니다.";
          result?.classList.add("hidden");
          window.setTimeout(() => window.location.reload(), 700);
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "승인에 실패했습니다.";
          approveButton.disabled = false;
        }
      });

      holdButton?.addEventListener("click", async () => {
        const context = selectedContext();
        if (!context.requestId || !status || !holdButton) return;
        holdButton.disabled = true;
        try {
          const response = await fetch("/api/admin/analysis-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: context.requestId, action: "hold" }) });
          const payload = await response.json();
          if (!response.ok || !payload.ok) throw new Error(payload.message || payload.detail || "보류 실패");
          status.textContent = "해당 상품 분석을 보류했습니다.";
          result?.classList.add("hidden");
          window.setTimeout(() => window.location.reload(), 700);
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "보류에 실패했습니다.";
          holdButton.disabled = false;
        }
      });

      const scoreInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]'));
      scoreInputs.forEach(scoreInput => { scoreInput.disabled = true; scoreInput.closest("label")?.classList.add("hidden"); });
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
