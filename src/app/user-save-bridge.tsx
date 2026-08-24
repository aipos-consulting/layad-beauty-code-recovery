"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PENDING_KEY = "layad-pending-beauty-code-v1";
const PENDING_PRODUCT_KEY = "layad-pending-saved-product-v1";
const LAST_FIT_STATE_KEY = "layad-last-product-fit-state-v1";
const LAST_SAVED_REQUEST_KEY = "layad-last-saved-product-request-v1";

function makeRef() {
  try { return crypto.randomUUID(); } catch { return `layad-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

type StoredFitState = {
  beautyCode?: string;
  result?: {
    productName?: string;
    score?: number;
    requestId?: string;
    sessionId?: string;
  };
};

export default function UserSaveBridge() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/fit") {
      let saving = false;

      const saveFitResult = async () => {
        if (saving || !document.getElementById("fit-analysis-result")) return;

        let saved: StoredFitState | null = null;
        try {
          const raw = localStorage.getItem(LAST_FIT_STATE_KEY);
          if (!raw) return;
          saved = JSON.parse(raw) as StoredFitState;
        } catch {
          return;
        }

        const requestId = saved?.result?.requestId?.trim();
        const productName = saved?.result?.productName?.trim();
        const beautyCode = saved?.beautyCode?.trim().toUpperCase();
        const fitScore = saved?.result?.score;
        if (!requestId || !productName || typeof fitScore !== "number") return;
        if (localStorage.getItem(LAST_SAVED_REQUEST_KEY) === requestId) return;

        const pending = {
          productRef: requestId,
          productName,
          beautyCode,
          fitScore,
        };

        saving = true;
        localStorage.setItem(PENDING_PRODUCT_KEY, JSON.stringify(pending));
        try {
          const response = await fetch("/api/mypage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save-product", ...pending }),
          });
          const payload = await response.json().catch(() => ({})) as { ok?: boolean };
          if (response.ok && payload.ok) {
            localStorage.removeItem(PENDING_PRODUCT_KEY);
            localStorage.setItem(LAST_SAVED_REQUEST_KEY, requestId);
          }
        } catch {
          // Keep the pending product so My Page can retry saving it.
        } finally {
          saving = false;
        }
      };

      void saveFitResult();
      const observer = new MutationObserver(() => { void saveFitResult(); });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }

    if (pathname !== "/test") return;

    const install = () => {
      const marker = Array.from(document.querySelectorAll("p")).find(node => node.textContent?.trim() === "YOUR BEAUTY CODE");
      if (!marker) return;
      const container = marker.parentElement;
      if (!container || container.querySelector("[data-layad-save-code]")) return;
      const heading = Array.from(container.querySelectorAll("h1")).find(node => /^[OD][GM][PC][VE]$/.test(node.textContent?.trim() ?? ""));
      const beautyCode = heading?.textContent?.trim();
      if (!beautyCode || !heading) return;

      const wrap = document.createElement("div");
      wrap.setAttribute("data-layad-save-code", "true");
      wrap.className = "mt-5 flex justify-center";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "내 Beauty Code 저장하기";
      button.className = "rounded-full bg-[#d88c9c] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c8798a] disabled:opacity-60";
      button.onclick = async () => {
        if (button.disabled) return;
        button.disabled = true;
        button.textContent = "저장 준비 중...";
        const pending = { beautyCode, source: "test", axisScores: {}, clientRef: makeRef() };
        localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
        try {
          const response = await fetch("/api/mypage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save-code", ...pending }),
          });
          const payload = await response.json().catch(() => ({})) as { ok?: boolean };
          if (response.ok && payload.ok) {
            localStorage.removeItem(PENDING_KEY);
            window.location.href = "/mypage";
            return;
          }
          if (response.status === 401) {
            window.location.href = "/account";
            return;
          }
          window.location.href = "/mypage";
        } catch {
          window.location.href = "/mypage";
        }
      };
      wrap.appendChild(button);
      heading.insertAdjacentElement("afterend", wrap);
    };

    install();
    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
