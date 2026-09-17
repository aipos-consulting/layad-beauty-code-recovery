"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const CAFE_URL = "https://cafe.naver.com/layad16";

export default function NaverCafeResultLink() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const findTarget = () => {
      if (window.location.pathname !== "/test") {
        setTarget(null);
        return;
      }
      const sections = Array.from(document.querySelectorAll<HTMLElement>("main > section"));
      const resultSection = sections.find((section) => section.textContent?.includes("YOUR BEAUTY CODE")) ?? null;
      setTarget(resultSection);
    };

    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", findTarget);
    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", findTarget);
    };
  }, []);

  if (!target) return null;

  return createPortal(
    <div className="mt-5 text-center" data-layad-naver-cafe-link="true">
      <a
        href={CAFE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-12 min-w-56 items-center justify-center rounded-full border border-[#03c75a] bg-white px-7 text-sm font-semibold text-[#169b4b]"
      >
        LAYAD 네이버 카페 바로가기
      </a>
    </div>,
    target,
  );
}
