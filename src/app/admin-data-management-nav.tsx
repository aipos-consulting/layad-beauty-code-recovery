"use client";

import { useEffect } from "react";

export default function AdminDataManagementNav() {
  useEffect(() => {
    if (window.location.pathname !== "/admin") return;

    const addLink = () => {
      if (document.querySelector('[data-admin-data-management-link="true"]')) return;

      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const settingsButton = buttons.find(button => button.textContent?.trim() === "운영 설정");
      const container = settingsButton?.parentElement;
      if (!container) return;

      const link = document.createElement("a");
      link.href = "/admin/data-management";
      link.setAttribute("data-admin-data-management-link", "true");
      link.className = "block w-full rounded-xl px-4 py-3 text-left text-sm text-white/75 hover:bg-white/10";
      link.textContent = "운영 데이터 관리";
      container.insertBefore(link, settingsButton ?? null);
    };

    addLink();
    const observer = new MutationObserver(addLink);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
