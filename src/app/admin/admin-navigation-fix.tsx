"use client";

import { useEffect } from "react";

const sectionLabels: Record<string, string> = {
  dashboard: "대시보드",
  statistics: "사용자 통계 상세",
  requests: "상품 신청 정보",
  analysis: "분석 작업",
  products: "상품 관리",
  results: "적합도 결과",
  settings: "운영 설정",
};

function fixDataManagementNavigation() {
  const aside = document.querySelector("main aside");
  const nav = aside?.querySelector("nav");
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll("a"));
  const settingsLink = links.find(link => link.textContent?.trim() === "운영 설정");
  const dataLink = links.find(link => link.textContent?.trim() === "운영 데이터 관리");

  if (settingsLink) settingsLink.setAttribute("href", "/admin?section=settings");

  if (settingsLink && dataLink) {
    const settingsGroup = nav.querySelector('[data-admin-group="운영 설정"]');
    const dataGroup = nav.querySelector('[data-admin-group="데이터 관리"]');
    const anchor = settingsGroup ?? settingsLink;

    if (dataGroup) nav.insertBefore(dataGroup, anchor);
    nav.insertBefore(dataLink, anchor);
  }
}

function openRequestedAdminSection() {
  if (window.location.pathname !== "/admin") return;

  const section = new URLSearchParams(window.location.search).get("section");
  const label = section ? sectionLabels[section] : undefined;
  if (!label) return;

  const button = Array.from(document.querySelectorAll("main aside nav button"))
    .find(item => item.textContent?.trim() === label) as HTMLButtonElement | undefined;

  if (button) button.click();
}

export default function AdminNavigationFix() {
  useEffect(() => {
    const apply = () => {
      if (window.location.pathname === "/admin/data-management") {
        fixDataManagementNavigation();
      }
      openRequestedAdminSection();
    };

    const frame = window.requestAnimationFrame(apply);
    const timer1 = window.setTimeout(apply, 300);
    const timer2 = window.setTimeout(apply, 650);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
    };
  }, []);

  return null;
}
