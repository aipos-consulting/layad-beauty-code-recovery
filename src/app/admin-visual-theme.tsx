"use client";

import { useEffect } from "react";

function applyHomeTheme(main: HTMLElement) {
  const hero = main.querySelector("section.relative.overflow-hidden") as HTMLElement | null;
  if (!hero) return;

  hero.querySelectorAll(":scope > .pointer-events-none").forEach((node) => {
    (node as HTMLElement).style.display = "none";
  });

  const heroInner = hero.querySelector(":scope > div.relative") as HTMLElement | null;
  const content = heroInner?.querySelector(":scope > div") as HTMLElement | null;
  if (!heroInner || !content) return;

  heroInner.style.alignItems = "flex-start";
  heroInner.style.paddingTop = "88px";
  heroInner.style.paddingBottom = "88px";

  const badge = Array.from(content.querySelectorAll("p")).find((node) => {
    const value = node.textContent?.trim() ?? "";
    return value.includes("20문항") || value.includes("20 QUESTIONS") || value.includes("20問");
  }) as HTMLElement | undefined;
  if (badge) badge.style.display = "none";

  const title = content.querySelector("h1") as HTMLElement | null;
  if (title) title.style.marginTop = "0";

  const subtitle = title?.nextElementSibling as HTMLElement | null;
  if (subtitle) subtitle.style.marginTop = "18px";

  const actionGroup = content.querySelector("div.mx-auto.mt-10") as HTMLElement | null;
  if (actionGroup) actionGroup.style.marginTop = "72px";

  Array.from(content.querySelectorAll("p")).forEach((node) => {
    const value = node.textContent?.trim() ?? "";
    if (value.startsWith("약 3분 소요") || value.startsWith("About 3 minutes") || value.startsWith("約3分")) {
      (node as HTMLElement).style.display = "none";
    }
  });
}

function groupLabel(text: string) {
  const label = document.createElement("div");
  label.setAttribute("data-admin-group", text);
  label.textContent = text;
  label.style.margin = "22px 12px 8px";
  label.style.color = "#9a8d90";
  label.style.fontSize = "11px";
  label.style.fontWeight = "700";
  label.style.letterSpacing = ".12em";
  return label;
}

function applyAdminTheme(main: HTMLElement) {
  const aside = main.querySelector("aside") as HTMLElement | null;
  if (!aside) return;

  aside.style.width = "256px";
  aside.style.minHeight = "100vh";
  aside.style.display = "flex";
  aside.style.flexDirection = "column";
  aside.style.background = "rgba(255,255,255,.96)";
  aside.style.color = "#382d2d";
  aside.style.borderRight = "1px solid rgba(234,223,225,.95)";
  aside.style.backdropFilter = "blur(10px)";
  aside.style.boxShadow = "4px 0 24px rgba(84,64,68,.05)";

  const oldTitle = aside.querySelector(":scope > p") as HTMLElement | null;
  if (oldTitle) oldTitle.style.display = "none";

  if (!aside.querySelector("[data-layad-admin-brand]")) {
    const brand = document.createElement("div");
    brand.setAttribute("data-layad-admin-brand", "true");
    brand.style.padding = "2px 16px 20px";
    brand.style.borderBottom = "1px solid #f0e6e8";
    brand.innerHTML = `
      <img src="/layad-logo.svg" alt="LAYAD Seoul" style="width:150px;height:auto;display:block;margin-bottom:14px" />
      <p style="margin:0;color:#d88c9c;font-size:13px;font-weight:700;letter-spacing:.16em">LAYAD ADMIN</p>
    `;
    aside.insertBefore(brand, aside.firstChild);
  }

  const nav = aside.querySelector("nav");
  if (nav) {
    (nav as HTMLElement).style.flex = "1";
    (nav as HTMLElement).style.marginTop = "10px";

    const entries = Array.from(nav.children).filter((node) => !(node as HTMLElement).dataset.adminGroup);
    const hasDataLink = entries.some((node) => node.textContent?.trim() === "운영 데이터 관리");
    if (!hasDataLink) {
      const link = document.createElement("a");
      link.href = "/admin/data-management";
      link.textContent = "운영 데이터 관리";
      link.className = "block rounded-xl px-4 py-3 text-sm";
      nav.appendChild(link);
      entries.push(link);
    }

    nav.querySelectorAll("[data-admin-group]").forEach((node) => node.remove());

    const refreshed = Array.from(nav.children);
    const insertBeforeText = (target: string, label: string) => {
      const node = refreshed.find((item) => item.textContent?.trim() === target);
      if (node) nav.insertBefore(groupLabel(label), node);
    };
    insertBeforeText("대시보드", "대시보드");
    insertBeforeText("상품 신청 정보", "상품 운영");
    insertBeforeText("운영 데이터 관리", "데이터 관리");
    insertBeforeText("운영 설정", "운영 설정");

    nav.querySelectorAll("a, button").forEach((item) => {
      const element = item as HTMLElement;
      const label = element.textContent?.trim() ?? "";
      const isDataPage = window.location.pathname === "/admin/data-management" && label === "운영 데이터 관리";
      const isAlreadyActive = element.className.includes("bg-[#d88c9c]") || element.className.includes("text-white");
      element.style.display = "block";
      element.style.width = "100%";
      element.style.borderRadius = "12px";
      element.style.padding = "12px 16px";
      element.style.marginBottom = "4px";
      element.style.textAlign = "left";
      element.style.fontSize = "14px";
      element.style.color = isDataPage || isAlreadyActive ? "#b95f74" : "#5b4d50";
      element.style.background = isDataPage || isAlreadyActive ? "#fff0f3" : "transparent";
      element.style.fontWeight = isDataPage || isAlreadyActive ? "700" : "500";
    });
  }

  if (!aside.querySelector("[data-admin-logout]")) {
    const logout = document.createElement("a");
    logout.setAttribute("data-admin-logout", "true");
    logout.href = "/";
    logout.textContent = "로그아웃";
    logout.style.margin = "20px 12px 0";
    logout.style.padding = "12px 16px";
    logout.style.border = "1px solid #eadfe1";
    logout.style.borderRadius = "12px";
    logout.style.color = "#5b4d50";
    logout.style.fontSize = "14px";
    logout.style.textAlign = "center";
    aside.appendChild(logout);
  }

  const header = main.querySelector("header") as HTMLElement | null;
  if (header) {
    header.style.background = "rgba(255,255,255,.92)";
    header.style.backdropFilter = "blur(10px)";
  }

  main.querySelectorAll("section").forEach((section) => {
    const element = section as HTMLElement;
    element.style.background = "rgba(255,255,255,.92)";
    element.style.backdropFilter = "blur(10px)";
    element.style.boxShadow = "0 12px 35px rgba(84,64,68,.08)";
  });
}

export default function AdminVisualTheme() {
  useEffect(() => {
    const applyTheme = () => {
      const main = document.querySelector("main") as HTMLElement | null;
      if (!main) return;

      main.classList.add("layad-admin-background");

      if (window.location.pathname === "/") applyHomeTheme(main);
      if (window.location.pathname.startsWith("/admin")) applyAdminTheme(main);
    };

    applyTheme();
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
