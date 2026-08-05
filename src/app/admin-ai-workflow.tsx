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
  const source = text.trim();
  if (!source) throw new Error("ChatGPT에서 받은 분석 결과를 붙여넣어 주세요.");
  if (source.includes("당신은 LAYAD BEAUTY CODE") || source.includes("분석 대상 상품:") || source.includes("Beauty Code 공식 축 정의")) {
    throw new Error("분석 지시문이 붙여넣어졌습니다. ChatGPT가 생성한 분석 결과를 복사해 주세요.");
  }
  const parsed = JSON.parse(extractStructuredResult(source)) as { summary?: unknown; scores?: Record<string, unknown> };
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (!summary || summary.includes("실제 상품 특성과 유형별 점수 차이를 설명하는 요약")) {
    throw new Error("실제 상품 분석 요약을 확인할 수 없습니다.");
  }
  const rawScores = parsed.scores;
  if (!rawScores || typeof rawScores !== "object") throw new Error("16유형 점수 항목을 찾지 못했습니다.");
  const scores = {} as Scores;
  for (const code of CODES) {
    const value = rawScores[code];
    if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 100) throw new Error(`${code} 점수는 0~100 정수여야 합니다.`);
    scores[code] = Number(value);
  }
  const values = Object.values(scores);
  if (values.every(value => value === 0)) throw new Error("0점 예시값은 분석 결과가 아닙니다. ChatGPT에서 실제 분석을 실행해 주세요.");
  if (new Set(values).size < 2) throw new Error("16유형 점수에 차이가 없습니다. 상품 특성을 반영해 다시 분석해 주세요.");
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
  const scoreTemplate = Object.fromEntries(CODES.map(code => [code, null]));
  return `당신은 LAYAD BEAUTY CODE의 화장품 상품 적합도 분석 담당자입니다.\n\n분석 대상 상품: ${product}\n신청자 Beauty Code: ${beautyCode}\n\nBeauty Code 공식 축 정의\n- O/D\n- G/M\n- P = Precise: 정교함·완성도 중심\n- C = Convenient: 간편함·편의성 중심\n- V = Variable: 제품·환경에 따라 결과가 달라짐\n- E = Even: 비교적 일정하고 안정적인 결과\n\n공개적으로 확인 가능한 상품 정보만 사용하고, 확인할 수 없는 사실은 추정하지 마세요. 상품 특성에 근거해 16개 유형 각각의 적합도를 0~100 정수로 평가하세요. 유형별 상대 차이가 드러나도록 일관된 기준을 적용하세요. 모든 점수를 0으로 두거나 동일한 점수로 채우지 마세요.\n\n응답은 설명이나 코드펜스 없이 아래 결과 형식만 출력하세요. null은 실제 0~100 정수로 바꾸고 모든 코드를 포함하세요.\n\n${JSON.stringify({ summary: "실제 상품 특성과 유형별 점수 차이를 설명하는 요약", scores: scoreTemplate }, null, 2)}`;
}

export default function AdminAiWorkflow() {
  useEffect(() => {
    if (!window.location.pathname.startsWith("/admin")) return;

    const enhance = () => {
      const paragraphs = Array.from(document.querySelectorAll("p"));
      const guide = paragraphs.find(node => node.textContent?.includes("ChatGPT Plus에 분석 지시문") || node.textContent?.includes("AI 분석 결과를 확인한 후 승인") || node.textContent?.includes("수동 분석 결과를 붙여넣어") || node.textContent?.includes("지시문을 복사해 ChatGPT"));
      if (guide) guide.textContent = "지시문을 복사하고 ChatGPT를 연 뒤, 같은 화면에서 분석 결과를 붙여넣어 확인하고 공개합니다.";

      const legacyHeading = Array.from(document.querySelectorAll("h3")).find(node => node.textContent?.includes("ChatGPT Plus 분석 지시문"));
      const legacySection = legacyHeading?.closest("section");
      if (!legacySection || legacySection.getAttribute("data-manual-validation-ready") === "true") return;

      legacySection.setAttribute("data-manual-validation-ready", "true");
      let currentResult: ManualResult | null = null;

      legacySection.innerHTML = `
        <div class="rounded-2xl border border-[#eadfe1] bg-white p-4">
          <p class="text-xs font-semibold text-[#a94f65]">현재 분석 방식</p>
          <p class="mt-2 text-sm leading-6 text-[#66575a]">수동 분석 · 앱에서 API를 호출하지 않습니다. 운영자는 지시문 복사, ChatGPT 실행, 결과 붙여넣기, 승인만 수행합니다.</p>
        </div>

        <section class="mt-5 rounded-2xl border border-[#eadfe1] bg-[#fffdfd] p-5">
          <p class="text-xs font-semibold text-[#a94f65]">STEP 1</p>
          <h3 class="mt-1 font-semibold">지시문 복사하고 ChatGPT 열기</h3>
          <p class="mt-2 text-xs leading-5 text-[#78696c]">버튼을 누르면 선택한 상품의 분석 지시문이 복사되고 ChatGPT가 새 창으로 열립니다.</p>
          <button type="button" data-copy-open class="mt-4 rounded-xl bg-[#d88c9c] px-4 py-3 text-sm font-semibold text-white">지시문 복사하고 ChatGPT 열기</button>
          <pre data-prompt-preview class="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f7f1f2] p-4 text-xs leading-6 text-[#66575a]"></pre>
        </section>

        <section class="mt-4 rounded-2xl border border-[#eadfe1] bg-[#fffdfd] p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold text-[#a94f65]">STEP 2</p>
              <h3 class="mt-1 font-semibold">ChatGPT에서 분석하고 결과 붙여넣기</h3>
            </div>
            <button type="button" data-open-chatgpt class="rounded-xl border border-[#d88c9c] bg-white px-4 py-3 text-sm font-semibold text-[#a94f65]">ChatGPT 다시 열기</button>
          </div>
          <ol class="mt-3 list-decimal space-y-1 pl-5 text-xs leading-5 text-[#78696c]">
            <li>새 창에 열린 ChatGPT에 복사된 지시문을 붙여넣고 실행합니다.</li>
            <li>ChatGPT의 분석 결과 전체를 복사합니다.</li>
            <li>아래 입력란에 붙여넣고 분석 결과 확인을 누릅니다.</li>
          </ol>
          <textarea data-manual-input rows="10" placeholder="ChatGPT가 생성한 분석 결과 전체를 여기에 붙여넣으세요." class="mt-4 w-full rounded-xl border border-[#dfd1d4] bg-white p-3 text-sm"></textarea>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" data-paste class="rounded-xl border border-[#d8b6bd] px-4 py-3 text-sm font-semibold">클립보드 붙여넣기</button>
            <button type="button" data-validate class="rounded-xl bg-[#382d2d] px-4 py-3 text-sm font-semibold text-white">분석 결과 확인</button>
            <button type="button" data-clear class="rounded-xl border border-[#d8b6bd] px-4 py-3 text-sm font-semibold">초기화</button>
          </div>
        </section>

        <div data-status class="mt-4 rounded-xl bg-[#f7f1f2] p-4 text-sm text-[#66575a]">먼저 지시문 복사하고 ChatGPT 열기를 눌러 주세요.</div>

        <section data-result class="mt-4 hidden rounded-2xl border border-[#eadfe1] bg-white p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div><p class="text-xs font-semibold text-[#a94f65]">STEP 3</p><h3 class="mt-1 font-semibold">분석 결과 확인 및 공개</h3></div>
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
        </section>`;

      const promptPreview = legacySection.querySelector<HTMLElement>("[data-prompt-preview]");
      const copyOpenButton = legacySection.querySelector<HTMLButtonElement>("[data-copy-open]");
      const openButton = legacySection.querySelector<HTMLButtonElement>("[data-open-chatgpt]");
      const pasteButton = legacySection.querySelector<HTMLButtonElement>("[data-paste]");
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
        if (status) status.textContent = "선택한 상품의 지시문을 복사하고 ChatGPT를 열어 분석을 시작하세요.";
      });

      const openChatGpt = () => window.open("https://chatgpt.com/", "layad-chatgpt-analysis", "popup=yes,width=760,height=900,resizable=yes,scrollbars=yes");

      copyOpenButton?.addEventListener("click", async () => {
        const context = selectedContext();
        if (!context.requestId || !status || !copyOpenButton) return;
        const chatWindow = openChatGpt();
        try {
          await navigator.clipboard.writeText(manualPrompt(context.product, context.beautyCode));
          await fetch("/api/admin/analysis-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: context.requestId, action: "start" }) });
          copyOpenButton.textContent = "복사 완료 · ChatGPT 열림";
          status.textContent = chatWindow ? "ChatGPT 창이 열렸습니다. 지시문을 붙여넣고 분석한 뒤 결과를 아래 입력란에 붙여넣으세요." : "지시문은 복사됐지만 새 창이 차단되었습니다. ChatGPT 다시 열기를 눌러 주세요.";
          input?.focus();
          window.setTimeout(() => { copyOpenButton.textContent = "지시문 복사하고 ChatGPT 열기"; }, 1800);
        } catch {
          status.textContent = "지시문 복사에 실패했습니다. 브라우저 클립보드 권한을 확인해 주세요.";
        }
      });

      openButton?.addEventListener("click", () => {
        openChatGpt();
        if (status) status.textContent = "ChatGPT 창을 다시 열었습니다. 분석 결과를 복사해 아래에 붙여넣으세요.";
        input?.focus();
      });

      pasteButton?.addEventListener("click", async () => {
        if (!input || !status) return;
        try {
          input.value = await navigator.clipboard.readText();
          input.focus();
          status.textContent = "클립보드 내용을 붙여넣었습니다. 분석 결과 확인을 눌러 주세요.";
        } catch {
          status.textContent = "브라우저가 클립보드 읽기를 허용하지 않았습니다. 직접 붙여넣어 주세요.";
        }
      });

      validateButton?.addEventListener("click", () => {
        if (!input || !status) return;
        try {
          currentResult = parseManualResult(input.value);
          if (summary) summary.textContent = currentResult.summary;
          if (grid) grid.innerHTML = CODES.map(code => `<div class="rounded-xl border border-[#eadfe1] bg-white p-3 text-center"><p class="text-xs font-semibold">${code}</p><p class="mt-1 text-xl font-semibold">${currentResult!.scores[code]}</p></div>`).join("");
          result?.classList.remove("hidden");
          result?.scrollIntoView({ behavior: "smooth", block: "start" });
          status.textContent = "실제 분석 결과 16개를 확인했습니다. 승인 및 공개, 다시 분석, 보류 중 하나를 선택하세요.";
        } catch (error) {
          currentResult = null;
          result?.classList.add("hidden");
          status.textContent = error instanceof Error ? `결과 확인 실패: ${error.message}` : "분석 결과를 확인하지 못했습니다.";
        }
      });

      const resetManual = () => {
        currentResult = null;
        if (input) input.value = "";
        result?.classList.add("hidden");
        if (status) status.textContent = "ChatGPT에서 다시 분석한 후 새 결과를 붙여넣어 주세요.";
        input?.focus();
      };
      clearButton?.addEventListener("click", resetManual);
      retryButton?.addEventListener("click", () => { resetManual(); openChatGpt(); });

      approveButton?.addEventListener("click", async () => {
        const context = selectedContext();
        if (!context.requestId || !currentResult || !status || !approveButton) return;
        approveButton.disabled = true;
        status.textContent = "검증된 결과를 승인하고 공개하고 있습니다.";
        try {
          const response = await fetch("/api/admin/fit-result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: context.requestId, scores: currentResult.scores, summary: currentResult.summary }) });
          const payload = await response.json();
          if (!response.ok || !payload.ok) throw new Error(payload.message || payload.detail || payload.code || "승인 실패");
          status.textContent = "분석 결과의 승인 및 공개가 완료되었습니다.";
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
