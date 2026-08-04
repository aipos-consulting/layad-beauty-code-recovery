"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "ko" | "en" | "ja";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "layad-locale";

function detectLocale(): Locale {
  if (typeof window === "undefined") return "ko";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "ko" || saved === "en" || saved === "ja") return saved;
  const language = window.navigator.language.toLowerCase();
  if (language.startsWith("ja")) return "ja";
  if (language.startsWith("en")) return "en";
  return "ko";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

const languageLabels: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  return (
    <label className="inline-flex items-center gap-2 text-xs font-medium text-[#6f625f]">
      <span className="sr-only">Language</span>
      <span aria-hidden>🌐</span>
      <select
        aria-label="Language"
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className={`rounded-full border border-[#e4d5d0] bg-white text-[#4c4240] outline-none focus:border-[#d7837e] ${compact ? "px-2 py-1" : "px-3 py-2"}`}
      >
        {(Object.keys(languageLabels) as Locale[]).map((code) => (
          <option key={code} value={code}>{languageLabels[code]}</option>
        ))}
      </select>
    </label>
  );
}
