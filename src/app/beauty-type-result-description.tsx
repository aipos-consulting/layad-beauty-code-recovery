"use client";

import { useEffect } from "react";
import { BEAUTY_TYPE_DESCRIPTIONS_KO } from "@/lib/beauty-type-descriptions";
import { useLanguage } from "./i18n";

const CODE_PATTERN = /^[OD][GM][PC][VE]$/;
const BLOCK_SELECTOR = '[data-layad-type-description="true"]';

function findResultCode(): string | null {
  const heading = Array.from(document.querySelectorAll("h1")).find((element) =>
    CODE_PATTERN.test(element.textContent?.trim() ?? ""),
  );
  return heading?.textContent?.trim() ?? null;
}

function findProductSection(code: string): { resultSection: HTMLElement; productSection: HTMLElement } | null {
  const heading = Array.from(document.querySelectorAll("h1")).find(
    (element) => element.textContent?.trim() === code,
  );
  if (!heading) return null;

  const resultSection = heading.closest("section") as HTMLElement | null;
  if (!resultSection) return null;

  const productSection = Array.from(resultSection.querySelectorAll("section")).find((element) =>
    element.textContent?.includes("PRODUCT FIT ANALYSIS"),
  ) as HTMLElement | undefined;

  return productSection ? { resultSection, productSection } : null;
}

function removeExistingBlock() {
  document.querySelector(BLOCK_SELECTOR)?.remove();
}

function syncDescription(locale: string) {
  const code = findResultCode();

  if (locale !== "ko" || !code) {
    removeExistingBlock();
    return;
  }

  const description = BEAUTY_TYPE_DESCRIPTIONS_KO[code];
  if (!description) {
    removeExistingBlock();
    return;
  }

  const target = findProductSection(code);
  if (!target) return;

  const existing = document.querySelector(BLOCK_SELECTOR) as HTMLElement | null;
  if (existing?.dataset.beautyCode === code && existing.nextElementSibling === target.productSection) return;
  existing?.remove();

  const block = document.createElement("section");
  block.dataset.layadTypeDescription = "true";
  block.dataset.beautyCode = code;
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
  target.resultSection.insertBefore(block, target.productSection);
}

export default function BeautyTypeResultDescription() {
  const { locale } = useLanguage();

  useEffect(() => {
    let frame = 0;
    const scheduleSync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => syncDescription(locale));
    };

    scheduleSync();

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      removeExistingBlock();
    };
  }, [locale]);

  return null;
}
