"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/app/i18n";

type CuratedProduct = {
  id: string;
  rank: number;
  name: string;
  brand: string | null;
  category: string | null;
  productUrl: string | null;
  fitScore: number;
};

const labels = {
  ko: { eyebrow: "BEAUTY CODE CURATION", title: "내 유형 추천 TOP 3", score: "적합도", note: "현재 분석 완료 상품 중 Beauty Code 적합도 상위 제품입니다." },
  en: { eyebrow: "BEAUTY CODE CURATION", title: "Top 3 for my type", score: "Fit", note: "Top products among completed analyses for your Beauty Code." },
  ja: { eyebrow: "BEAUTY CODE CURATION", title: "私のタイプおすすめ TOP 3", score: "適合度", note: "分析済み商品の中からBeauty Code適合度上位の商品です。" },
} as const;

export default function ResultTopProducts() {
  const { locale } = useLanguage();
  const text = labels[locale];
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [code, setCode] = useState("");
  const [products, setProducts] = useState<CuratedProduct[]>([]);

  useEffect(() => {
    const locate = () => {
      const heading = Array.from(document.querySelectorAll("h1")).find((node) =>
        /^[OD][GM][PC][VE]$/.test(node.textContent?.trim() ?? ""),
      ) as HTMLElement | undefined;

      if (!heading) {
        document.getElementById("layad-result-top-products-mount")?.remove();
        setMount(null);
        setCode("");
        setProducts([]);
        return;
      }

      const nextCode = heading.textContent?.trim() ?? "";
      const resultSection = heading.closest("section");
      let portalMount = document.getElementById("layad-result-top-products-mount");

      if (!portalMount) {
        portalMount = document.createElement("div");
        portalMount.id = "layad-result-top-products-mount";
        const shareMount = document.getElementById("layad-result-share-mount");
        const fitSection = resultSection
          ? Array.from(resultSection.children).find((el) => el.textContent?.includes("PRODUCT FIT ANALYSIS"))
          : null;
        if (shareMount?.parentElement === resultSection) resultSection?.insertBefore(portalMount, shareMount);
        else if (fitSection) resultSection?.insertBefore(portalMount, fitSection);
        else heading.parentElement?.appendChild(portalMount);
      }

      setMount(portalMount);
      setCode((current) => (current === nextCode ? current : nextCode));
    };

    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!code) return;
    let active = true;
    fetch(`/api/beauty-code-top-products?code=${encodeURIComponent(code)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (active) setProducts(response.ok && result.ok ? result.products ?? [] : []);
      })
      .catch(() => { if (active) setProducts([]); });
    return () => { active = false; };
  }, [code]);

  if (!mount || !code || products.length === 0) return null;

  return createPortal(
    <section className="mx-auto mt-9 w-full max-w-3xl border-t border-[#f1dfe2] pt-9 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-[#b97b88]">{text.eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold text-[#382d2d]">{text.title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-[#8b7b7e]">{text.note}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {products.map((product) => {
          const content = (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d88c9c] text-sm font-bold text-white">{product.rank}</span>
                <span className="rounded-full bg-[#fff0f3] px-3 py-1 text-xs font-semibold text-[#a94f65]">{text.score} {product.fitScore}</span>
              </div>
              <p className="mt-4 line-clamp-2 text-left text-sm font-semibold leading-6 text-[#4f4245]">{product.name}</p>
              <p className="mt-2 text-left text-xs text-[#8b7b7e]">{product.brand || product.category || "LAYAD"}</p>
            </>
          );

          return product.productUrl ? (
            <a key={product.id} href={product.productUrl} target="_blank" rel="noopener noreferrer" className="block rounded-2xl border border-[#efdde1] bg-[#fffafa] p-4 no-underline shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              {content}
            </a>
          ) : (
            <article key={product.id} className="rounded-2xl border border-[#efdde1] bg-[#fffafa] p-4 shadow-sm">
              {content}
            </article>
          );
        })}
      </div>
    </section>,
    mount,
  );
}
