"use client";

import { useEffect } from "react";

const adjustProductAnalysisUI = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    if (node.textContent?.includes("AI 맥락 분석")) {
      node.textContent = node.textContent.replaceAll("AI 맥락 분석", "AI 분석");
    }
    node = walker.nextNode();
  }

  document.querySelectorAll("p").forEach((element) => {
    if (element.textContent?.trim() === "16유형 분석 상태") {
      element.style.textAlign = "center";
      element.style.fontSize = "0.6875rem";
      element.style.letterSpacing = "0.08em";
    }
  });

  document.querySelectorAll("span").forEach((element) => {
    if (element.textContent?.trim() === "내 유형") {
      element.remove();
    }
  });
};

export default function UiAdjustments() {
  useEffect(() => {
    adjustProductAnalysisUI();

    const observer = new MutationObserver(() => {
      adjustProductAnalysisUI();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
