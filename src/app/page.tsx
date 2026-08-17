"use client";

import Link from "next/link";
import { LanguageSwitcher, Locale, useLanguage } from "./i18n";

const copy: Record<Locale, {
  question: string;
  start: string;
  knowCode: string;
  copyright: string;
}> = {
  ko: {
    question: "당신의 코드는 무엇인가요?",
    start: "내 Code 찾기",
    knowCode: "내 Code 직접 선택",
    copyright: "본 웹사이트의 텍스트, 이미지, 디자인, 프로그램, 분류체계 및 기타 모든 콘텐츠는 LAYAD의 저작권과 지식재산권 보호 대상입니다. 상업적 목적의 사용 시 반드시 사전 서면 허가가 필요합니다. 무단 사용의 경우 법적 책임을 물을 수 있습니다.",
  },
  en: {
    question: "What is your code?",
    start: "Find my Code",
    knowCode: "Choose my Code",
    copyright: "All text, images, designs, software, classification systems, and other content on this website are protected by LAYAD copyright and intellectual property rights. Prior written permission is required for commercial use. Unauthorized use may result in legal liability.",
  },
  ja: {
    question: "あなたのコードは何ですか？",
    start: "自分のCodeを見つける",
    knowCode: "自分のCodeを選ぶ",
    copyright: "本ウェブサイトの文章、画像、デザイン、プログラム、分類体系およびその他すべてのコンテンツは、LAYADの著作権・知的財産権により保護されています。商用利用には事前の書面による許可が必要です。無断使用には法的責任を問う場合があります。",
  },
};

export default function Home() {
  const { locale } = useLanguage();
  const text = copy[locale];

  return (
    <main className="min-h-screen bg-[#F6F4F0] text-[#222222]">
      <header className="mx-auto flex max-w-6xl items-center justify-end px-5 py-5 sm:px-8 sm:py-7">
        <LanguageSwitcher compact />
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl flex-col px-5 pb-12 sm:px-8">
        <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center sm:pb-20">
          <h1 className="font-brand uppercase leading-[0.8] tracking-[-0.075em]">
            <span className="block text-[3.25rem] font-semibold sm:text-[4.75rem] lg:text-[5.5rem]">Layad</span>
            <span className="mt-2 block text-[5.25rem] font-bold sm:text-[7.75rem] lg:text-[9rem]">16 Codes</span>
          </h1>
          <p className="mt-8 text-lg font-medium sm:text-2xl">{text.question}</p>

          <div className="mt-12 grid w-full max-w-md gap-4 sm:mt-16">
            <Link href="/test" className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#222222] px-8 py-4 text-base font-semibold text-[#F6F4F0] shadow-[0_12px_30px_rgba(34,34,34,0.14)] transition hover:-translate-y-0.5 hover:bg-[#3a3836]">
              {text.start}
            </Link>
            <Link href="/select-type" className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#A99F93] bg-[#E7E1D9] px-8 py-4 text-base font-semibold text-[#222222] transition hover:-translate-y-0.5 hover:bg-[#DDD5CB]">
              {text.knowCode}
            </Link>
          </div>
        </div>

        <aside className="mx-auto w-full max-w-3xl border-t border-[#D7D0C7] py-7 text-center">
          <p className="text-xs font-semibold">© 2026 LAYAD. All rights reserved.</p>
          <p className="mx-auto mt-3 max-w-2xl text-[11px] leading-5 text-[#625D57]">{text.copyright}</p>
        </aside>
      </section>
    </main>
  );
}
