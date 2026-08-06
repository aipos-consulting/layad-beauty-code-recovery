"use client";

import { useEffect } from "react";

function fixDataManagementNavigation() {
  const aside = document.querySelector("main aside");
  const nav = aside?.querySelector("nav");
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll("a"));
  const settingsLink = links.find(link => link.textContent?.trim() === "운영 설정");
  const dataLink = links.find(link => link.textContent?.trim() === "운영 데이터 관리");

  if (settingsLink) settingsLink.setAttribute("href", "/admin/settings");

  if (settingsLink && dataLink) {
    const settingsGroup = nav.querySelector('[data-admin-group="운영 설정"]');
    const dataGroup = nav.querySelector('[data-admin-group="데이터 관리"]');
    const anchor = settingsGroup ?? settingsLink;

    if (dataGroup) nav.insertBefore(dataGroup, anchor);
    nav.insertBefore(dataLink, anchor);
  }
}

export default function AdminNavigationFix() {
  useEffect(() => {
    if (window.location.pathname !== "/admin/data-management") return;

    const frame = window.requestAnimationFrame(fixDataManagementNavigation);
    const timer = window.setTimeout(fixDataManagementNavigation, 250);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
