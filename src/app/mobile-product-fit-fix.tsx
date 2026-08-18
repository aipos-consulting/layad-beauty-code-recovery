"use client";

import { useEffect } from "react";

const ANALYSIS_LABELS = [
  "적합도 분석하기",
  "잘 맞는지 확인하기",
  "Analyze product fit",
  "Check product fit",
  "適合度を分析",
  "相性を確認",
];

export default function MobileProductFitFix() {
  useEffect(() => {
    const isAnalysisForm = (form: HTMLFormElement) => {
      const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const label = button?.textContent?.trim() ?? "";
      return ANALYSIS_LABELS.some((item) => label.includes(item));
    };

    const syncForm = (form: HTMLFormElement) => {
      if (window.innerWidth >= 640 || !isAnalysisForm(form)) return;

      const input = form.querySelector<HTMLInputElement>('input[type="text"], input:not([type])');
      const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (!input || !button) return;

      const hasValue = input.value.trim().length > 0;
      button.disabled = !hasValue;
      button.setAttribute("aria-disabled", String(!hasValue));
    };

    const syncAll = () => {
      document.querySelectorAll<HTMLFormElement>("form").forEach(syncForm);
    };

    const onInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const form = target.closest("form");
      if (form) syncForm(form);
    };

    const onResize = () => syncAll();

    document.addEventListener("input", onInput, true);
    window.addEventListener("resize", onResize);

    const observer = new MutationObserver(syncAll);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });

    syncAll();

    return () => {
      document.removeEventListener("input", onInput, true);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, []);

  return null;
}
