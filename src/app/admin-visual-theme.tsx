"use client";

import { useEffect } from "react";

export default function AdminVisualTheme() {
  useEffect(() => {
    if (window.location.pathname !== "/admin/data-management") return;

    const applyTheme = () => {
      const main = document.querySelector("main");
      if (!main) return;

      main.classList.add("layad-admin-background");

      const aside = main.querySelector("aside") as HTMLElement | null;
      if (aside) {
        aside.style.background = "rgba(255,255,255,.88)";
        aside.style.color = "#382d2d";
        aside.style.borderRight = "1px solid rgba(234,223,225,.9)";
        aside.style.backdropFilter = "blur(12px)";
      }

      const header = main.querySelector("header") as HTMLElement | null;
      if (header) {
        header.style.background = "rgba(255,255,255,.78)";
        header.style.backdropFilter = "blur(12px)";
      }

      main.querySelectorAll("section").forEach(section => {
        const element = section as HTMLElement;
        element.style.background = "rgba(255,255,255,.88)";
        element.style.backdropFilter = "blur(12px)";
        element.style.boxShadow = "0 12px 35px rgba(84,64,68,.08)";
      });
    };

    applyTheme();
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
