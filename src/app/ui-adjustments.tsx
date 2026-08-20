"use client";

import { useEffect } from "react";
import { BEAUTY_TYPE_DESCRIPTIONS_KO } from "@/lib/beauty-type-descriptions";

const FINAL_GUIDE = "선택하신 상품이 회원님의 Beauty Code와 얼마나 잘 맞는지 확인해 보세요.";

function addBeautyTypeDescription() {
  if (document.querySelector('[data-layad-type-description="true"]')) return;

  const resultHeading = Array.from(document.querySelectorAll("h1")).find((element) =>
    /^[OD][GM][PC][VE]$/.test(element.textContent?.trim() ?? ""),
  );
  if (!resultHeading) return;

  const code = resultHeading.textContent?.trim() ?? "";
  const description = BEAUTY_TYPE_DESCRIPTIONS_KO[code];
  if (!description) return;

  const resultSection = resultHeading.closest("section");
  if (!resultSection) return;

  const productSection = Array.from(resultSection.querySelectorAll("section")).find((element) =>
    element.textContent?.includes("PRODUCT FIT ANALYSIS"),
  );
  if (!productSection) return;

  const block = document.createElement("section");
  block.dataset.layadTypeDescription = "true";
  block.className = "mt-8 rounded-3xl border border-[#f1dfe2] bg-[#fffafa] px-5 py-6 text-left sm:px-7 sm:py-7";

  const eyebrow = document.createElement("p");
  eyebrow.className = "text-xs font-semibold tracking-[0.18em] text-[#b97b88]";
  eyebrow.textContent = "LAYAD 16 TYPE";

  const title = document.createElement("h2");
  title.className = "mt-2 text-xl font-semibold text-[#4d3f42] sm:text-2xl";
  title.textContent = `${code} 유형 설명`;

  const content = document.createElement("div");
  content.className = "mt-5 whitespace-pre-line text-sm leading-7 text-[#6f6063] sm:text-[15px]";
  content.textContent = description;

  block.append(eyebrow, title, content);
  resultSection.insertBefore(block, productSection);
}

const adjustProductAnalysisUI = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const text = node.textContent ?? "";
    const replaced = text
      .replaceAll("AI 맥락 분석", "AI 분석")
      .replaceAll("적합도 분석하기", "잘 맞는지 확인하기")
      .replaceAll("내 상품 적합도 분석", "나에게 잘 맞는 상품인지 확인하기")
      .replaceAll("상품 적합도 분석", "Beauty Code 상품 궁합")
      .replaceAll("궁금한 상품명 또는 상품 링크를 등록하면 리뷰 맥락 분석을 통해 나의 Beauty Code와의 적합도를 확인할 수 있습니다.", FINAL_GUIDE)
      .replaceAll("상품명 또는 상품 링크를 등록하면 AI 분석을 시작합니다.", FINAL_GUIDE);

    if (replaced !== text) node.textContent = replaced;
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
      return;
    }

    const text = element.textContent?.trim() ?? "";
    const isQuestionOptionCode =
      /^[ODGMPCVE]$/.test(text) &&
      element.classList.contains("h-9") &&
      element.classList.contains("w-9");

    if (isQuestionOptionCode) element.style.display = "none";
  });

  addBeautyTypeDescription();
};

export default function UiAdjustments() {
  useEffect(() => {
    const frame = window.requestAnimationFrame(adjustProductAnalysisUI);
    const timer = window.setTimeout(adjustProductAnalysisUI, 300);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
