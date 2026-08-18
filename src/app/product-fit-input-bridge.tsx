"use client";

import { useEffect } from "react";

export default function ProductFitInputBridge() {
  useEffect(() => {
    const onInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.id !== "product-input") return;

      const form = target.closest("form");
      const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (!button) return;

      const hasValue = target.value.trim().length > 0;
      button.disabled = !hasValue;
      button.setAttribute("aria-disabled", String(!hasValue));
    };

    document.addEventListener("input", onInput, true);
    return () => document.removeEventListener("input", onInput, true);
  }, []);

  return null;
}
