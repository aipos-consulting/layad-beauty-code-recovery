"use client";

import { useEffect } from "react";

const MOBILE_MAX_WIDTH = 639;
const CONTINUE_LABEL = "선택한 유형으로 계속하기";

export default function MobileSelectTypeLinkFix() {
  useEffect(() => {
    if (window.innerWidth > MOBILE_MAX_WIDTH) return;
    if (window.location.pathname !== "/select-type") return;

    const form = document.querySelector<HTMLFormElement>('form[action="/select-type"][method="get"]');
    if (!form) return;

    const submit = form.querySelector<HTMLInputElement>('input[type="submit"][name="step"]');
    if (!submit) return;

    const link = document.createElement("a");
    link.textContent = CONTINUE_LABEL;
    link.className = submit.className;
    link.setAttribute("role", "button");
    link.setAttribute("aria-disabled", "true");
    link.style.opacity = "0.45";
    link.style.pointerEvents = "none";

    const syncLink = () => {
      const checked = form.querySelector<HTMLInputElement>('input[type="radio"][name="code"]:checked');
      if (!checked?.value) {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        link.style.opacity = "0.45";
        link.style.pointerEvents = "none";
        return;
      }

      link.href = `/select-type?code=${encodeURIComponent(checked.value)}&step=age`;
      link.setAttribute("aria-disabled", "false");
      link.style.opacity = "1";
      link.style.pointerEvents = "auto";
    };

    submit.replaceWith(link);
    form.querySelectorAll<HTMLInputElement>('input[type="radio"][name="code"]').forEach((radio) => {
      radio.addEventListener("change", syncLink);
    });
    syncLink();

    return () => {
      form.querySelectorAll<HTMLInputElement>('input[type="radio"][name="code"]').forEach((radio) => {
        radio.removeEventListener("change", syncLink);
      });
    };
  }, []);

  return null;
}
