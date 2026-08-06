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
    if (
      value.startsWith("약 3분 소요") ||
      value.startsWith("About 3 minutes") ||
      value.startsWith("約3分")
    ) {
      (node as HTMLElement).style.display = "none";
    }
  });
}

function applyAdminTheme(main: HTMLElement) {
  const aside = main.querySelector("aside") as HTMLElement | null;
  if (aside) {
    aside.style.background = "rgba(255,255,255,.96)";
    aside.style.color = "#382d2d";
    aside.style.borderRight = "1px solid rgba(234,223,225,.95)";
    aside.style.backdropFilter = "blur(10px)";
    aside.style.boxShadow = "4px 0 24px rgba(84,64,68,.05)";

    const title = aside.querySelector("p") as HTMLElement | null;
    if (title) title.style.display = "none";

    if (!aside.querySelector("[data-layad-admin-brand]")) {
      const brand = document.createElement("div");
      brand.setAttribute("data-layad-admin-brand", "true");
      brand.style.padding = "0 16px 18px";
      brand.innerHTML = `
        <img src="/layad-logo.svg" alt="LAYAD Seoul" style="width:150px;height:auto;display:block;margin-bottom:14px" />
        <p style="margin:0;color:#d88c9c;font-size:13px;font-weight:700;letter-spacing:.16em">LAYAD ADMIN</p>
      `;
      aside.insertBefore(brand, aside.firstChild);
    }

    aside.querySelectorAll("a").forEach((link) => {
      const element = link as HTMLElement;
      element.style.color = "#5b4d50";
      if (element.textContent?.trim() === "운영 데이터 관리") {
        element.style.background = "#d88c9c";
        element.style.color = "white";
      }
    });
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
      if (window.location.pathname === "/admin/data-management") applyAdminTheme(main);
    };

    applyTheme();
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
