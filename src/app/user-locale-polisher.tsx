"use client";

import { useEffect } from "react";
import { useLanguage } from "./i18n";
import { BEAUTY_CODE_NICKNAMES } from "@/lib/beauty-code-labels";

export default function UserLocalePolisher() {
  const { locale } = useLanguage();

  useEffect(() => {
    const replacements = new Map<string, string>();
    for (const code of Object.keys(BEAUTY_CODE_NICKNAMES.ko)) {
      const target = BEAUTY_CODE_NICKNAMES[locale][code];
      for (const language of ["ko", "en", "ja"] as const) {
        replacements.set(BEAUTY_CODE_NICKNAMES[language][code], target);
      }
    }

    const polish = () => {
      if (window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/ceo")) return;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const current = node.textContent?.trim() ?? "";
        const replacement = replacements.get(current);
        if (replacement && replacement !== current) node.textContent = replacement;
        node = walker.nextNode();
      }
    };

    polish();
    const observer = new MutationObserver(polish);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}
