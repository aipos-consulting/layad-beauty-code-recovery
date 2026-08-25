"use client";

import { useEffect } from "react";

const LABELS = {
  ko: "제품 적합도 분석 바로가기",
  en: "Go to product fit analysis",
  ja: "商品適合度分析へ",
} as const;

function resolveLabel(form: HTMLFormElement) {
  const submitText = form.querySelector<HTMLButtonElement>('button[type="submit"]')?.textContent?.trim() ?? "";
  if (submitText.includes("適合度")) return LABELS.ja;
  if (/check product fit/i.test(submitText)) return LABELS.en;
  return LABELS.ko;
}

export default function ProductFitInputBridge() {
  useEffect(() => {
    const replaceProductFitForm = () => {
      if (window.location.pathname !== "/test") return;

      const input = document.getElementById("product-input");
      if (!(input instanceof HTMLInputElement)) return;

      const form = input.closest("form");
      if (!(form instanceof HTMLFormElement) || form.dataset.fitShortcutApplied === "true") return;

      form.dataset.fitShortcutApplied = "true";
      const requestList = form.nextElementSibling;
      const shortcut = document.createElement("a");
      shortcut.href = "/fit";
      shortcut.textContent = resolveLabel(form);
      shortcut.setAttribute("aria-label", resolveLabel(form));
      shortcut.className = "mx-auto mt-8 flex min-h-[52px] max-w-2xl items-center justify-center rounded-2xl bg-[#d88c9c] px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#c97d8e] focus:outline-none focus:ring-2 focus:ring-[#d88c9c] focus:ring-offset-2";

      form.replaceWith(shortcut);
      if (requestList instanceof HTMLElement) requestList.remove();
    };

    replaceProductFitForm();
    const observer = new MutationObserver(replaceProductFitForm);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
