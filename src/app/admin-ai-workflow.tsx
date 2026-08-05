"use client";

import { useEffect } from "react";

const CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

export default function AdminAiWorkflow() {
  useEffect(() => {
    if (!window.location.pathname.startsWith("/admin")) return;

    const enhance = () => {
      const paragraphs = Array.from(document.querySelectorAll("p"));
      const guide = paragraphs.find(node => node.textContent?.includes("ChatGPT Plus에 분석 지시문"));
      if (guide) guide.textContent = "AI 분석 결과 또는 검토한 16유형 점수를 입력한 후 저장 및 공개합니다.";

      const legacyHeading = Array.from(document.querySelectorAll("h3")).find(node => node.textContent?.includes("ChatGPT Plus 분석 지시문"));
      const legacySection = legacyHeading?.closest("section");
      if (!legacySection || legacySection.getAttribute("data-hybrid-ai-ready") === "true") return;

      legacySection.setAttribute("data-hybrid-ai-ready", "true");
      legacySection.innerHTML = `
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 class="font-semibold">AI 분석 및 운영자 검토</h3>
            <p class="mt-1 text-xs text-[#78696c]">AI가 16유형 점수를 초안으로 채웁니다. 운영자는 내용을 검토·수정한 뒤 저장 및 공개합니다.</p>
          </div>
          <button type="button" data-ai-start class="rounded-xl bg-[#d88c9c] px-4 py-3 text-sm font-semibold text-white">AI 분석 시작</button>
        </div>
        <div data-ai-status class="mt-4 rounded-xl bg-[#f7f1f2] p-4 text-sm text-[#66575a]">AI 분석을 시작하거나, 아래 점수를 직접 입력해 수동 방식으로 진행할 수 있습니다.</div>
        <div class="mt-3 flex flex-wrap gap-2 text-xs text-[#78696c]">
          <span class="rounded-full bg-white px-3 py-2">정상: AI 초안 → 운영자 검토 → 공개</span>
          <span class="rounded-full bg-white px-3 py-2">예외: AI 실패 → 수동 입력 → 공개</span>
        </div>`;

      const button = legacySection.querySelector<HTMLButtonElement>("[data-ai-start]");
      const status = legacySection.querySelector<HTMLElement>("[data-ai-status]");
      button?.addEventListener("click", async () => {
        const select = document.querySelector<HTMLSelectElement>('select');
        const requestId = select?.value;
        if (!requestId || !status || !button) return;

        button.disabled = true;
        button.textContent = "AI 분석 중";
        status.textContent = "상품 정보를 확인하고 16유형 점수 초안을 생성하고 있습니다.";

        try {
          const response = await fetch("/api/admin/ai-fit-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId }),
          });
          const payload = await response.json();
          if (!response.ok || !payload.ok) throw new Error(payload.message || payload.code || "AI 분석 실패");

          const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]'));
          for (const code of CODES) {
            const input = inputs.find(item => item.closest("label")?.textContent?.includes(code));
            const score = payload.scores?.[code];
            if (input && Number.isFinite(score)) setReactInputValue(input, String(score));
          }
          status.textContent = `AI 분석 초안을 입력했습니다. ${payload.summary ?? "16유형 점수를 검토한 뒤 저장 및 공개해 주세요."}`;
        } catch (error) {
          status.textContent = `${error instanceof Error ? error.message : "AI 분석에 실패했습니다."} 아래 점수를 직접 입력해 수동 방식으로 계속할 수 있습니다.`;
        } finally {
          button.disabled = false;
          button.textContent = "AI 분석 다시 실행";
        }
      });
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
