"use client";

import { useEffect } from "react";

const FINAL_GUIDE = "현재 테스트 기간에는 LAYAD 상품으로만 반복 검증할 수 있습니다.";
const TEST_PRODUCT = "layad";

const adjustProductAnalysisUI = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const text = node.textContent ?? "";
    node.textContent = text
      .replaceAll("AI 맥락 분석", "AI 분석")
      .replaceAll("적합도 분석하기", "잘 맞는지 확인하기")
      .replaceAll("내 상품 적합도 분석", "나에게 잘 맞는 상품인지 확인하기")
      .replaceAll("상품 적합도 분석", "Beauty Code 상품 궁합")
      .replaceAll("궁금한 상품명 또는 상품 링크를 등록하면 리뷰 맥락 분석을 통해 나의 Beauty Code와의 적합도를 확인할 수 있습니다.", FINAL_GUIDE)
      .replaceAll("상품명 또는 상품 링크를 등록하면 AI 분석을 시작합니다.", FINAL_GUIDE);
    node = walker.nextNode();
  }

  document.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const input = form.querySelector<HTMLInputElement>("input");
    const label = button?.textContent ?? "";
    const targetLabels = ["잘 맞는지 확인하기", "적합도 분석하기", "Analyze product fit", "Check product fit", "適合度を分析", "相性を確認"];
    if (!input || !targetLabels.some((item) => label.includes(item))) return;

    input.value = TEST_PRODUCT;
    input.readOnly = true;
    input.setAttribute("aria-label", "테스트 상품 layad");
    input.classList.add("cursor-not-allowed", "bg-[#f7f1f2]");

    if (!form.querySelector("[data-layad-test-guide]")) {
      const guide = document.createElement("p");
      guide.setAttribute("data-layad-test-guide", "true");
      guide.className = "mt-2 text-xs text-[#a94f65]";
      guide.textContent = "테스트 성공 전까지 layad 상품만 신청할 수 있으며, 실패한 경우 같은 상품으로 다시 신청할 수 있습니다.";
      input.insertAdjacentElement("afterend", guide);
    }
  });

  document.querySelectorAll("p").forEach((element) => {
    const text = element.textContent?.trim() ?? "";
    if (text === "16유형 분석 상태") {
      element.style.textAlign = "center";
      element.style.fontSize = "0.6875rem";
      element.style.letterSpacing = "0.08em";
    }
    if (text.startsWith("QUESTION ") && text.includes("·")) {
      element.textContent = text.split("·")[0].trim();
    }
  });

  document.querySelectorAll("span").forEach((element) => {
    if (element.textContent?.trim() === "내 유형") {
      element.remove();
      return;
    }
    const text = element.textContent?.trim() ?? "";
    const isQuestionOptionCode = /^[ODGMPCVE]$/.test(text) && element.classList.contains("h-9") && element.classList.contains("w-9");
    if (isQuestionOptionCode) element.style.display = "none";
  });
};

export default function UiAdjustments() {
  useEffect(() => {
    adjustProductAnalysisUI();
    const observer = new MutationObserver(adjustProductAnalysisUI);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
