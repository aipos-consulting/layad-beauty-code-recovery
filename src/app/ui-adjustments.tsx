"use client";

import { useEffect } from "react";

const FINAL_GUIDE = "선택하신 상품이 회원님의 Beauty Code와 얼마나 잘 맞는지 확인해 보세요.";

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

  document.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
    const placeholder = input.getAttribute("placeholder") ?? "";
    if (placeholder.includes("프라이머 상품명") || placeholder.includes("상품명 또는")) {
      input.setAttribute("placeholder", "상품명");
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
    const isQuestionOptionCode =
      /^[ODGMPCVE]$/.test(text) &&
      element.classList.contains("h-9") &&
      element.classList.contains("w-9");

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
