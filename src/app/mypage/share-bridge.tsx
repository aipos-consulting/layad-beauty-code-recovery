"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/app/i18n";

const INSTAGRAM_URL = "https://www.instagram.com/layad_official";

const labels = {
  ko: { title: "친구에게 테스트 공유하기", copy: "링크 복사", kakao: "카카오톡", instagram: "공식 인스타 보러가기", copied: "결과 링크가 복사되었습니다.", kakaoLoading: "카카오톡 공유를 준비 중입니다. 잠시 후 다시 눌러 주세요.", kakaoError: "카카오톡 공유를 열지 못했습니다. 링크 복사를 이용해 주세요." },
  en: { title: "Share the test with friends", copy: "Copy link", kakao: "KakaoTalk", instagram: "Visit official Instagram", copied: "Result link copied.", kakaoLoading: "KakaoTalk sharing is loading. Please try again in a moment.", kakaoError: "Could not open KakaoTalk sharing. Please use Copy link." },
  ja: { title: "友だちにテストをシェア", copy: "リンクをコピー", kakao: "KakaoTalk", instagram: "公式Instagramを見る", copied: "結果リンクをコピーしました。", kakaoLoading: "KakaoTalk共有を準備しています。少し待ってからもう一度押してください。", kakaoError: "KakaoTalk共有を開けませんでした。リンクコピーをご利用ください。" },
} as const;

function resultUrl(code: string) { return `https://layad16.com/result/${code}`; }
function shareImageUrl(code: string) { return `https://layad16.com/api/share-card/${code}`; }

function KakaoIcon() {
  return <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FEE500]" aria-hidden><svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#191919]"><path d="M12 4C7.58 4 4 6.84 4 10.35c0 2.22 1.43 4.18 3.6 5.32l-.92 3.38a.42.42 0 0 0 .64.46l3.92-2.62c.25.02.5.03.76.03 4.42 0 8-2.84 8-6.35S16.42 4 12 4Z" /></svg></span>;
}
function LinkIcon() {
  return <span className="flex h-11 w-11 items-center justify-center bg-[#fff3f5]" aria-hidden><svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-[#6f6164]" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.6 13.4a4 4 0 0 0 5.66 0l2.14-2.14a4 4 0 0 0-5.66-5.66l-1.22 1.22" /><path d="M13.4 10.6a4 4 0 0 0-5.66 0L5.6 12.74a4 4 0 0 0 5.66 5.66l1.22-1.22" /></svg></span>;
}
function InstagramIcon() {
  return <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden><svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg></span>;
}

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: { sendDefault: (args: unknown) => void };
    };
  }
}

export default function MyPageShareBridge() {
  const { locale } = useLanguage();
  const text = labels[locale];
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [isAndroid, setIsAndroid] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);

  useEffect(() => {
    setIsAndroid(/Android/i.test(navigator.userAgent));
    const locate = () => {
      const codeNode = Array.from(document.querySelectorAll("p")).find((node) => /^[OD][GM][PC][VE]$/.test(node.textContent?.trim() ?? "")) as HTMLElement | undefined;
      if (!codeNode) {
        document.getElementById("layad-mypage-share-mount")?.remove();
        setMount(null); setCode(""); return;
      }
      const nextCode = codeNode.textContent?.trim() ?? "";
      let portalMount = document.getElementById("layad-mypage-share-mount");
      if (!portalMount) {
        portalMount = document.createElement("div");
        portalMount.id = "layad-mypage-share-mount";
        codeNode.insertAdjacentElement("afterend", portalMount);
      }
      setMount(portalMount); setCode(nextCode);
    };
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
    if (!key) return;
    const initialize = () => {
      try {
        if (!window.Kakao) return;
        if (!window.Kakao.isInitialized()) window.Kakao.init(key);
        setKakaoReady(true);
      } catch (error) {
        console.error("[Kakao Init]", error);
        setKakaoReady(false);
      }
    };
    if (window.Kakao) { initialize(); return; }
    const existing = document.querySelector<HTMLScriptElement>('script[data-layad-kakao-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", initialize, { once: true });
      return () => existing.removeEventListener("load", initialize);
    }
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js";
    script.crossOrigin = "anonymous";
    script.dataset.layadKakaoSdk = "true";
    script.onload = initialize;
    script.onerror = () => setKakaoReady(false);
    document.head.appendChild(script);
  }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(resultUrl(code));
    setStatus(text.copied);
  }

  function shareKakao() {
    if (!kakaoReady || !window.Kakao) {
      setStatus(text.kakaoLoading);
      return;
    }
    try {
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: `LAYAD BEAUTY CODE ${code}`,
          description: locale === "ko" ? "나의 Beauty Code 결과를 확인해 보세요." : locale === "ja" ? "私のBeauty Code結果をチェックしてみてください。" : "Check out my Beauty Code result.",
          imageUrl: shareImageUrl(code),
          link: { mobileWebUrl: resultUrl(code), webUrl: resultUrl(code) },
        },
        buttons: [{ title: locale === "ko" ? "결과 보기" : locale === "ja" ? "結果を見る" : "View result", link: { mobileWebUrl: resultUrl(code), webUrl: resultUrl(code) } }],
      });
      setStatus("");
    } catch (error) {
      console.error("[Kakao Share]", error);
      setStatus(text.kakaoError);
    }
  }

  if (!mount || !code) return null;
  return createPortal(
    <section className="mx-auto mt-5 w-full max-w-xl bg-[#fff3f5] px-4 text-center">
      <p className="text-sm font-semibold text-[#5f5053]">{text.title}</p>
      <div className="mt-4 flex items-start justify-center gap-8">
        {!isAndroid ? <button type="button" onClick={shareKakao} className="m-0 flex appearance-none flex-col items-center gap-1.5 border-0 bg-[#fff3f5] p-0 text-xs font-medium text-[#6f6164] shadow-none" aria-label={text.kakao}><KakaoIcon /><span>{text.kakao}</span></button> : null}
        <button type="button" onClick={copyLink} style={{ backgroundColor: "#fff3f5" }} className="m-0 flex appearance-none flex-col items-center gap-1.5 border-0 bg-[#fff3f5] p-0 text-xs font-medium text-[#6f6164] shadow-none" aria-label={text.copy}><LinkIcon /><span className="whitespace-nowrap">{text.copy}</span></button>
      </div>
      <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={`mx-auto mt-5 flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#d88c9c] bg-transparent py-2.5 font-semibold text-[#a85f6e] no-underline ${isAndroid ? "max-w-[250px] px-3 text-xs" : "max-w-[280px] px-4 text-sm"}`}><InstagramIcon /><span>{text.instagram}</span></a>
      {status ? <p className="mx-auto mt-3 max-w-sm break-words px-3 text-xs leading-5 text-[#806f72]">{status}</p> : null}
    </section>,
    mount,
  );
}
