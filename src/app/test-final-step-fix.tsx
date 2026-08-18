"use client";

import { useEffect } from "react";

const FINAL_QUESTION_LABEL = "QUESTION 20";
const FINAL_ADVANCE_DELAY_MS = 180;

export default function TestFinalStepFix() {
  useEffect(() => {
    if (window.location.pathname !== "/test") return;

    const nativeSetTimeout = window.setTimeout.bind(window);

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!(button instanceof HTMLButtonElement)) return;

      const questionLabel = Array.from(document.querySelectorAll("p")).find(
        (element) => element.textContent?.trim() === FINAL_QUESTION_LABEL,
      );
      if (!questionLabel) return;

      const originalSetTimeout = window.setTimeout;
      window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        if (timeout === FINAL_ADVANCE_DELAY_MS && typeof handler === "function") {
          queueMicrotask(() => handler(...args));
          return 0;
        }
        return originalSetTimeout(handler, timeout, ...args);
      }) as typeof window.setTimeout;

      nativeSetTimeout(() => {
        window.setTimeout = originalSetTimeout;
      }, 0);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  return null;
}
