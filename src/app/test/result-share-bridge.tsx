"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/app/i18n";

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: { sendDefault: (args: unknown) => void };
    };
  }
}

const labels = {
  ko: { title: "내 Beauty Code 공유하기", messenger: "카카오톡으로 공유", copy: "링크 복사", image: "결과 이미지 공유", copied: "결과 링크가 복사되었습니다.", imageFallback: "이 브라우저에서는 이미지 공유 대신 링크를 공유합니다.", kakaoMissing: "카카오 공유 설정이 아직 완료되지 않았습니다. 링크 복사를 이용해 주세요." },
  en: { title: "Share my Beauty Code", messenger: "Share", copy: "Copy link", image: "Share result image", copied: "Result link copied.", imageFallback: "Image sharing is not supported here, so the link will be shared instead.", kakaoMissing: "Kakao sharing is not configured yet. Please use Copy link." },
  ja: { title: "Beauty Codeをシェア", messenger: "LINEでシェア", copy: "リンクをコピー", image: "結果画像をシェア", copied: "結果リンクをコピーしました。", imageFallback: "このブラウザでは画像共有の代わりにリンクを共有します。", kakaoMissing: "Kakao共有の設定が完了していません。リンクコピーをご利用ください。" }
} as const;

function resultUrl(code: string) {
  return `${window.location.origin}/result/${code}`;
}

async function makeResultImage(code: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.fillStyle = "#fff8f8"; ctx.fillRect(0, 0, 1080, 1080);
  ctx.textAlign = "center";
  ctx.fillStyle = "#5f5053"; ctx.font = "600 42px sans-serif"; ctx.fillText("LAYAD BEAUTY CODE", 540, 180);
  ctx.fillStyle = "#d88c9c"; ctx.font = "700 150px sans-serif"; ctx.fillText(code, 540, 475);
  const axis = [`${code[0] === "O" ? "Oily" : "Dry"}`, `${code[1] === "G" ? "Glow" : "Matte"}`, `${code[2] === "P" ? "Perfection focused" : "Convenient focused"}`, `${code[3] === "V" ? "Variable" : "Even"}`];
  ctx.fillStyle = "#766767"; ctx.font = "500 34px sans-serif"; ctx.fillText(axis.join(" · "), 540, 585);
  ctx.fillStyle = "#9b858a"; ctx.font = "500 30px sans-serif"; ctx.fillText("What is your Beauty Code?", 540, 760);
  ctx.font = "500 28px sans-serif"; ctx.fillText("layad16.com", 540, 840);
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("image creation failed")), "image/png"));
}

export default function ResultShareBridge() {
  const { locale } = useLanguage();
  const text = labels[locale];
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const locate = () => {
      const headings = Array.from(document.querySelectorAll("h1"));
      const heading = headings.find((node) => /^[OD][GM][PC][VE]$/.test(node.textContent?.trim() ?? "")) as HTMLElement | undefined;
      if (!heading) { document.getElementById("layad-result-share-mount")?.remove(); setMount(null); setCode(""); return; }
      const nextCode = heading.textContent?.trim() ?? "";
      const resultSection = heading.closest("section");
      const fitSection = resultSection ? Array.from(resultSection.children).find((el) => el.textContent?.includes("PRODUCT FIT ANALYSIS")) : null;
      let portalMount = document.getElementById("layad-result-share-mount");
      if (!portalMount) { portalMount = document.createElement("div"); portalMount.id = "layad-result-share-mount"; if (fitSection) resultSection?.insertBefore(portalMount, fitSection); else heading.parentElement?.appendChild(portalMount); }
      setMount(portalMount); setCode(nextCode);
    };
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(resultUrl(code));
    setStatus(text.copied);
  }

  function lineShare() {
    const url = encodeURIComponent(resultUrl(code));
    const message = encodeURIComponent(`LAYAD BEAUTY CODE ${code}`);
    window.open(`https://social-plugins.line.me/lineit/share?url=${url}&text=${message}`, "_blank", "noopener,noreferrer");
  }

  function kakaoShare() {
    const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
    if (!key) { setStatus(text.kakaoMissing); return; }
    const send = () => {
      if (!window.Kakao) return;
      if (!window.Kakao.isInitialized()) window.Kakao.init(key);
      window.Kakao.Share.sendDefault({ objectType: "feed", content: { title: `LAYAD BEAUTY CODE ${code}`, description: "나의 Beauty Code 결과를 확인해 보세요.", imageUrl: `${window.location.origin}/layad-logo.svg`, link: { mobileWebUrl: resultUrl(code), webUrl: resultUrl(code) } }, buttons: [{ title: "결과 보기", link: { mobileWebUrl: resultUrl(code), webUrl: resultUrl(code) } }] });
    };
    if (window.Kakao) { send(); return; }
    const script = document.createElement("script"); script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"; script.crossOrigin = "anonymous"; script.onload = send; document.head.appendChild(script);
  }

  async function shareImage() {
    try {
      const blob = await makeResultImage(code);
      const file = new File([blob], `LAYAD-${code}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) { await navigator.share({ title: `LAYAD BEAUTY CODE ${code}`, text: `My Beauty Code is ${code}`, url: resultUrl(code), files: [file] }); return; }
      if (navigator.share) { setStatus(text.imageFallback); await navigator.share({ title: `LAYAD BEAUTY CODE ${code}`, url: resultUrl(code) }); return; }
      const href = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = href; a.download = `LAYAD-${code}.png`; a.click(); URL.revokeObjectURL(href);
    } catch { setStatus(text.imageFallback); }
  }

  if (!mount || !code) return null;
  return createPortal(<section className="mt-9 border-t border-[#f1dfe2] pt-8 text-center"><p className="text-sm font-semibold text-[#5f5053]">{text.title}</p><div className="mx-auto mt-5 flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={locale === "ja" ? lineShare : locale === "ko" ? kakaoShare : copyLink} className="rounded-full bg-[#d88c9c] px-6 py-3 text-sm font-semibold text-white">{text.messenger}</button><button type="button" onClick={copyLink} className="rounded-full border border-[#d88c9c] px-6 py-3 text-sm font-semibold text-[#a85f6e]">{text.copy}</button><button type="button" onClick={shareImage} className="rounded-full border border-[#d88c9c] px-6 py-3 text-sm font-semibold text-[#a85f6e]">{text.image}</button></div>{status ? <p className="mt-3 text-xs text-[#806f72]">{status}</p> : null}</section>, mount);
}
