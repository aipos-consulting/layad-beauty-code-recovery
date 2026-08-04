"use client";

import Link from "next/link";
import { LanguageSwitcher, Locale, useLanguage } from "./i18n";

const copy: Record<Locale, {
  badge: string;
  subtitle: string;
  start: string;
  startHelp: string;
  or: string;
  knowCode: string;
  knowCodeHelp: string;
  meta: string;
  features: { icon: string; title: string; description: string }[];
  copyrightTitle: string;
  copyrightBody: string;
  copyrightWarning: string;
}> = {
  ko: {
    badge: "20문항 · 16유형",
    subtitle: "당신만의 메이크업 유형을 찾아보세요",
    start: "Beauty Code 테스트 시작",
    startHelp: "20문항에 응답해 나의 Beauty Code를 확인합니다.",
    or: "또는",
    knowCode: "내 Beauty Code를 알고 있어요",
    knowCodeHelp: "이미 알고 있는 16유형을 직접 선택합니다.",
    meta: "약 3분 소요 · 무료 테스트 · 비회원 즉시 시작",
    features: [
      { icon: "01", title: "20가지 질문", description: "4가지 축, 20문항으로 나의 메이크업 성향을 살펴봅니다." },
      { icon: "02", title: "4축 분석", description: "O/D, G/M, P/C, V/E 네 가지 축으로 분류합니다." },
      { icon: "03", title: "16가지 유형", description: "응답 결과를 조합해 16가지 Beauty Code 중 하나를 확인합니다." },
      { icon: "04", title: "제품 특성 안내", description: "결과에 어울리는 제품 카테고리와 적합 특성을 안내합니다." },
    ],
    copyrightTitle: "저작권 및 무단 사용 엄중 경고",
    copyrightBody: "본 웹사이트의 텍스트, 이미지, 디자인, 프로그램, 분류체계 및 기타 모든 콘텐츠는 LAYAD의 저작권과 지식재산권 보호 대상입니다. LAYAD의 사전 서면 허가 없이 복제, 배포, 전송, 전시, 변형, 2차적 저작물 작성 또는 상업적 이용을 엄격히 금지합니다.",
    copyrightWarning: "무단 이용이 확인되는 경우 관련 법령에 따라 민사·형사상 책임을 물을 수 있습니다.",
  },
  en: {
    badge: "20 QUESTIONS · 16 TYPES",
    subtitle: "Discover your personal makeup style",
    start: "Start the Beauty Code test",
    startHelp: "Answer 20 questions to discover your Beauty Code.",
    or: "OR",
    knowCode: "I already know my Beauty Code",
    knowCodeHelp: "Select one of the 16 types directly.",
    meta: "About 3 minutes · Free · Start without signing up",
    features: [
      { icon: "01", title: "20 questions", description: "Explore your makeup preferences through 20 questions across four axes." },
      { icon: "02", title: "Four-axis analysis", description: "Classification uses the O/D, G/M, P/C and V/E axes." },
      { icon: "03", title: "16 Beauty Codes", description: "Your answers combine into one of 16 Beauty Code types." },
      { icon: "04", title: "Product characteristics", description: "See suitable product categories and characteristics for your result." },
    ],
    copyrightTitle: "Copyright and unauthorized use notice",
    copyrightBody: "All text, images, designs, software, classification systems and other content on this website are protected by LAYAD copyright and intellectual property rights. Reproduction, distribution, transmission, display, modification, derivative works or commercial use without prior written permission is prohibited.",
    copyrightWarning: "Unauthorized use may result in civil or criminal liability under applicable law.",
  },
  ja: {
    badge: "20問 · 16タイプ",
    subtitle: "あなたらしいメイクタイプを見つけましょう",
    start: "Beauty Codeテストを始める",
    startHelp: "20問に答えて自分のBeauty Codeを確認します。",
    or: "または",
    knowCode: "自分のBeauty Codeを知っています",
    knowCodeHelp: "既に分かっている16タイプから直接選択します。",
    meta: "約3分 · 無料 · 会員登録なしですぐ開始",
    features: [
      { icon: "01", title: "20の質問", description: "4つの軸、20問でメイクの傾向を確認します。" },
      { icon: "02", title: "4軸分析", description: "O/D、G/M、P/C、V/Eの4軸で分類します。" },
      { icon: "03", title: "16タイプ", description: "回答を組み合わせ、16種類のBeauty Codeから1つを確認します。" },
      { icon: "04", title: "製品特性の案内", description: "結果に合う製品カテゴリーと適した特性を案内します。" },
    ],
    copyrightTitle: "著作権および無断使用に関する警告",
    copyrightBody: "本サイトの文章、画像、デザイン、プログラム、分類体系およびその他すべてのコンテンツは、LAYADの著作権・知的財産権により保護されています。事前の書面による許可なく、複製、配布、送信、展示、改変、二次的著作物の作成または商用利用を行うことを禁止します。",
    copyrightWarning: "無断使用が確認された場合、関連法令に基づき民事・刑事上の責任を問うことがあります。",
  },
};

export default function Home() {
  const { locale } = useLanguage();
  const text = copy[locale];

  return (
    <main className="min-h-screen bg-[#fffdfc] text-[#272322]">
      <header className="border-b border-[#eadfda] bg-white/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <img src="/layad-logo.svg" alt="LAYAD Seoul - Layers add delight" className="h-auto w-[122px] object-contain sm:w-[154px]" />
          <div className="flex items-center gap-3 sm:gap-5">
            <p className="hidden text-xs font-semibold tracking-[0.16em] sm:block sm:text-sm">LAYAD BEAUTY CODE</p>
            <LanguageSwitcher compact />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#eadfda]">
        <div className="pointer-events-none absolute -right-16 top-16 h-52 w-52 rounded-full bg-[#f6d8d2]/55 blur-3xl" />
        <div className="pointer-events-none absolute right-8 top-48 h-36 w-14 rotate-[24deg] rounded-full bg-gradient-to-b from-[#d9a28e] to-[#f8e5dd] opacity-70 shadow-xl" />
        <div className="pointer-events-none absolute -right-16 bottom-[-30px] h-44 w-60 rotate-[-18deg] rounded-[2.5rem] border border-[#e5b3a2] bg-gradient-to-br from-[#f8ddd3] to-[#df9b84] opacity-70 shadow-2xl" />

        <div className="relative mx-auto flex min-h-[650px] max-w-6xl items-center px-5 py-16 sm:px-8 sm:py-20">
          <div className="w-full text-center lg:max-w-4xl">
            <p className="text-sm font-semibold tracking-[0.12em] text-[#cf7772] sm:text-base">{text.badge}</p>
            <h1 className="mt-7 text-4xl font-semibold tracking-[0.04em] sm:text-5xl lg:text-6xl">LAYAD BEAUTY CODE</h1>
            <p className="mt-5 text-lg text-[#5e5753] sm:text-xl">{text.subtitle}</p>

            <div className="mx-auto mt-10 grid max-w-xl gap-3">
              <Link href="/test" className="inline-flex min-h-14 items-center justify-center gap-6 rounded-full bg-gradient-to-r from-[#d7837e] to-[#cb706f] px-8 py-4 text-base font-semibold text-white shadow-[0_12px_30px_rgba(198,105,102,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(198,105,102,0.32)]">
                {text.start} <span aria-hidden>→</span>
              </Link>
              <p className="text-xs text-[#756d68]">{text.startHelp}</p>

              <div className="my-1 flex items-center gap-3 text-xs text-[#aa9994]">
                <span className="h-px flex-1 bg-[#eadfda]" />{text.or}<span className="h-px flex-1 bg-[#eadfda]" />
              </div>

              <Link href="/select-type" className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#d7837e] bg-white px-8 py-4 text-base font-semibold text-[#b76766] transition hover:bg-[#fff5f3]">
                {text.knowCode}
              </Link>
              <p className="text-xs text-[#756d68]">{text.knowCodeHelp}</p>
            </div>

            <p className="mt-5 text-sm text-[#756d68]">{text.meta}</p>
          </div>
        </div>
      </section>

      <section className="bg-[#fffafa]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:py-16">
          {text.features.map((feature) => (
            <article key={feature.icon} className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f8e4e1] text-sm font-semibold tracking-[0.12em]">{feature.icon}</div>
              <h2 className="mt-5 text-lg font-semibold">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#6d6561]">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#eadfda] bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#e5d8d2] bg-[#fffdfc] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f9e5e2] text-xl" aria-hidden>🔒</div>
            <div>
              <h2 className="text-lg font-bold">{text.copyrightTitle}</h2>
              <p className="mt-3 text-sm font-medium">© 2026 LAYAD. All rights reserved.</p>
              <p className="mt-3 text-sm leading-6 text-[#5f5753]">{text.copyrightBody}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#c94f49]">{text.copyrightWarning}</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#eadfda] bg-white px-5 py-6 text-center text-xs text-[#756d68]">© 2026 LAYAD. All rights reserved.</footer>
    </main>
  );
}
