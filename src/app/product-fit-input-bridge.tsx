"use client";

import { useEffect } from "react";

const SESSION_KEY = "layad-supabase-session-id";

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

    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const input = form.querySelector<HTMLInputElement>("#product-input");
      if (!input || !input.value.trim()) return;

      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) return;

      window.setTimeout(async () => {
        try {
          const statusResponse = await fetch(`/api/product-analysis-result?sessionId=${encodeURIComponent(sessionId)}`, {
            cache: "no-store",
          });
          if (!statusResponse.ok) return;

          const statusPayload = (await statusResponse.json()) as {
            ok?: boolean;
            requestId?: string;
            status?: string;
          };

          if (!statusPayload.ok || !statusPayload.requestId || statusPayload.status !== "submitted") return;

          const runResponse = await fetch("/api/product-analysis-run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId: statusPayload.requestId }),
          });

          if (!runResponse.ok) {
            const detail = await runResponse.text();
            console.error("Product analysis run failed", runResponse.status, detail);
          }
        } catch (error) {
          console.error("Product analysis start failed", error);
        }
      }, 500);
    };

    document.addEventListener("input", onInput, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return null;
}
