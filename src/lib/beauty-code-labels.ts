import type { Locale } from "@/app/i18n";

export const BEAUTY_CODE_NICKNAMES: Record<Locale, Record<string, string>> = {
  ko: {
    OGPV: "광채 연금술사", OGPE: "글로우 컬렉터", OGCV: "윤광 마술사", OGCE: "윤광 에이스",
    OMPV: "피부결 건축가", OMPE: "매트 큐레이터", OMCV: "보송 해결사", OMCE: "베이스 실용주의자",
    DGPV: "광채 탐험가", DGPE: "글로우 큐레이터", DGCV: "수분 조율사", DGCE: "윤광 미니멀리스트",
    DMPV: "밸런스 연금술사", DMPE: "벨벳 장인", DMCV: "매트 네비게이터", DMCE: "벨벳 미니멀리스트",
  },
  en: {
    OGPV: "Radiance Alchemist", OGPE: "Glow Collector", OGCV: "Glow Magician", OGCE: "Glow Ace",
    OMPV: "Skin Texture Architect", OMPE: "Matte Curator", OMCV: "Soft-Matte Solver", OMCE: "Base Pragmatist",
    DGPV: "Radiance Explorer", DGPE: "Glow Curator", DGCV: "Hydration Tuner", DGCE: "Glow Minimalist",
    DMPV: "Balance Alchemist", DMPE: "Velvet Artisan", DMCV: "Matte Navigator", DMCE: "Velvet Minimalist",
  },
  ja: {
    OGPV: "ツヤの錬金術師", OGPE: "ツヤコレクター", OGCV: "ツヤマジシャン", OGCE: "ツヤのエース",
    OMPV: "肌質アーキテクト", OMPE: "マットキュレーター", OMCV: "さらさらソルバー", OMCE: "ベース実用派",
    DGPV: "ツヤ探検家", DGPE: "ツヤキュレーター", DGCV: "うるおい調律師", DGCE: "ツヤミニマリスト",
    DMPV: "バランス錬金術師", DMPE: "ベルベット職人", DMCV: "マットナビゲーター", DMCE: "ベルベットミニマリスト",
  },
};

export function beautyCodeNickname(code: string, locale: Locale, fallback?: string | null) {
  return BEAUTY_CODE_NICKNAMES[locale][code] || fallback || code;
}

export function localeDate(value: string | Date, locale: Locale) {
  const tag = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
  return new Date(value).toLocaleDateString(tag);
}
