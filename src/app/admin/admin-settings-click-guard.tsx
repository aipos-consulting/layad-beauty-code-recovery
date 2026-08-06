"use client";

import { useEffect } from "react";

export default function AdminSettingsClickGuard() {
  useEffect(() => {
    if (window.location.pathname !== "/admin/data-management") return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a");
      if (!link || link.textContent?.trim() !== "운영 설정") return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign("/admin/settings");
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
