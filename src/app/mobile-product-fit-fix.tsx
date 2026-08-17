"use client";

import { useEffect } from "react";

export default function MobileProductFitFix() {
  useEffect(() => {
    const syncButton = () => {
      if (window.innerWidth >= 640) return;
      const input = document.querySelector<HTMLInputElement>("#product-input");
      const form = input?.closest("form");
      const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (!input || !button) return;
      const hasValue = input.value.trim().length > 0;
      button.disabled = !hasValue;
      button.setAttribute("aria-disabled", String(!hasValue));
    };

    const onInput = (event: Event) => {
      if ((event.target as HTMLElement)?.id === "product-input") syncButton();
    };

    document.addEventListener("input", onInput, true);
    const observer = new MutationObserver(syncButton);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
    syncButton();

    return () => {
      document.removeEventListener("input", onInput, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
