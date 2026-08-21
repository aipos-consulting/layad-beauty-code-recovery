"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PENDING_KEY = "layad-pending-beauty-code-v1";

function makeRef() {
  try { return crypto.randomUUID(); } catch { return `layad-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

export default function UserSaveBridge() {
  const pathname = usePathname();

  useEffect(() => {
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
