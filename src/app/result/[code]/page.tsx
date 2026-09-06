import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BEAUTY_TYPES, type BeautyTypeCode } from "@/lib/review-product-fit";
import { BEAUTY_TYPE_DESCRIPTIONS } from "@/lib/beauty-type-descriptions-localized";

function isBeautyCode(code: string): code is BeautyTypeCode {
  return (BEAUTY_TYPES as readonly string[]).includes(code);
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  if (!isBeautyCode(code)) return {};
  const title = `LAYAD BEAUTY CODE ${code}`;
  const description = `나의 Beauty Code는 ${code}. LAYAD 16유형 결과를 확인해 보세요.`;
  return { title, description, openGraph: { title, description, type: "website" } };
}

export default async function SharedResultPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  if (!isBeautyCode(code)) notFound();
  const axis = [code[0] === "O" ? "Oily" : "Dry", code[1] === "G" ? "Glow" : "Matte", code[2] === "P" ? "Perfection focused" : "Convenient focused", code[3] === "V" ? "Variable" : "Even"];
  const description = BEAUTY_TYPE_DESCRIPTIONS.ko[code];
  return <main className="min-h-screen bg-[#fff8f8] px-5 py-8 text-[#382d2d] sm:px-8"><section className="mx-auto max-w-3xl rounded-[2rem] bg-white px-6 py-10 text-center shadow-[0_24px_70px_rgba(120,70,80,0.12)] sm:px-12"><Link href="/" className="inline-block"><img src="/layad-logo.svg" alt="LAYAD" className="mx-auto h-auto w-[120px]" /></Link><p className="mt-8 text-xs font-semibold tracking-[0.25em] text-[#b97b88]">SHARED BEAUTY CODE</p><h1 className="mt-5 text-5xl font-semibold tracking-[0.18em] text-[#d88c9c] sm:text-6xl">{code}</h1><p className="mt-5 text-sm leading-7 text-[#766767]">{axis.join(" · ")}</p>{description ? <div className="mt-8 whitespace-pre-line rounded-3xl border border-[#f1dfe2] bg-[#fffafa] px-5 py-6 text-left text-sm leading-7 text-[#6f6063] sm:px-7">{description}</div> : null}<div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"><Link href="/test" className="inline-flex h-12 min-w-56 items-center justify-center rounded-full bg-[#d88c9c] px-7 text-sm font-semibold text-white">나도 Beauty Code 테스트하기</Link><Link href="/" className="inline-flex h-12 min-w-56 items-center justify-center rounded-full border border-[#d88c9c] px-7 text-sm font-semibold text-[#a85f6e]">LAYAD 홈으로</Link></div></section></main>;
}
