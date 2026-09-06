"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/app/i18n";

const INSTAGRAM_URL = "https://www.instagram.com/layad_official";

const labels = {
  ko: { title: "친구에게 테스트 공유하기", copy: "링크", kakao: "카카오톡", instagram: "공식 인스타 보러가기", copied: "결과 링크가 복사되었습니다.", inApp: "현재 브라우저에서는 카카오톡 직접 공유를 지원하지 않습니다. 링크 아이콘으로 결과 링크를 복사해 공유해 주세요." },
  en: { title: "Share the test with friends", copy: "Link", kakao: "KakaoTalk", instagram: "Visit official Instagram", copied: "Result link copied.", inApp: "Direct KakaoTalk sharing is not supported in this in-app browser. Please use the Link icon to copy and share the result link." },
  ja: { title: "友だちにテストをシェア", copy: "リンク", kakao: "KakaoTalk", instagram: "公式Instagramを見る", copied: "結果リンクをコピーしました。", inApp: "このアプリ内ブラウザではKakaoTalkの直接共有に対応していません。リンクアイコンから結果リンクをコピーして共有してください。" },
} as const;

function resultUrl(code: string) {
  return `https://layad16.com/result/${code}`;
}

function shareUrl(code: string) {
  return `https://layad16.com/s/${code}`;
}

function isAndroidInAppBrowser() {
  const ua = navigator.userAgent;
  const android = /Android/i.test(ua);
  const webView = /;\s*wv\)/i.test(ua) || /\bwv\b/i.test(ua) || /Version\/\d+(?:\.\d+)?[^\n]*Chrome\/[^\n]*Mobile Safari/i.test(ua);
  const knownInApp = /KAKAOTALK|NAVER|DaumApps|Instagram|FBAN|FBAV|FB_IAB|Line\/|Snapchat|Twitter|X\//i.test(ua);
  return android && (webView || knownInApp);
}

function KakaoIcon() {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FEE500]" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#191919]">
        <path d="M12 4C7.58 4 4 6.84 4 10.35c0 2.22 1.43 4.18 3.6 5.32l-.92 3.38a.42.42 0 0 0 .64.46l3.92-2.62c.25.02.5.03.76.03 4.42 0 8-2.84 8-6.35S16.42 4 12 4Z" />
      </svg>
    </span>
  );
}

function LinkIcon() {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d9c4c9] bg-white" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-[#6f6164]" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.6 13.4a4 4 0 0 0 5.66 0l2.14-2.14a4 4 0 0 0-5.66-5.66l-1.22 1.22" />
        <path d="M13.4 10.6a4 4 0 0 0-5.66 0L5.6 12.74a4 4 0 0 0 5.66 5.66l1.22-1.22" />
      </svg>
    </span>
  );
}

function InstagramIcon() {
  return (
    <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export default function MyPageShareBridge() {
  const { locale } = useLanguage();
  const text = labels[locale];
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const locate = () => {
      const codeNode = Array.from(document.querySelectorAll("p")).find((node) =>
        /^[OD][GM][PC][VE]$/.test(node.textContent?.trim() ?? ""),
      ) as HTMLElement | undefined;

      if (!codeNode) {
        document.getElementById("layad-mypage-share-mount")?.remove();
        setMount(null);
        setCode("");
        return;
      }

      const nextCode = codeNode.textContent?.trim() ?? "";
      let portalMount = document.getElementById("layad-mypage-share-mount");
      if (!portalMount) {
        portalMount = document.createElement("div");
        portalMount.id = "layad-mypage-share-mount";
        codeNode.insertAdjacentElement("afterend", portalMount);
      }

      setMount(portalMount);
      setCode(nextCode);
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

  function openKakaoShare() {
    if (isAndroidInAppBrowser()) {
      setStatus(text.inApp);
      return;
    }
    window.location.href = shareUrl(code);
  }

  if (!mount || !code) return null;

  return createPortal(
    <section className="mx-auto mt-5 max-w-xl text-center">
      <p className="text-sm font-semibold text-[#5f5053]">{text.title}</p>
      <div className="mt-4 flex items-start justify-center gap-7">
        <button type="button" onClick={openKakaoShare} className="flex flex-col items-center gap-1.5 text-xs font-medium text-[#6f6164]" aria-label={text.kakao}>
          <KakaoIcon />
          <span>{text.kakao}</span>
        </button>
        <button type="button" onClick={copyLink} className="flex flex-col items-center gap-1.5 text-xs font-medium text-[#6f6164]" aria-label={text.copy}>
          <LinkIcon />
          <span>{text.copy}</span>
        </button>
      </div>
      <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="mx-auto mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-[#d88c9c] bg-white px-5 py-2.5 text-sm font-semibold text-[#a85f6e]">
        <InstagramIcon />
        <span>{text.instagram}</span>
      </a>
      {status ? <p className="mx-auto mt-3 max-w-sm break-words px-3 text-xs leading-5 text-[#806f72]">{status}</p> : null}
    </section>,
    mount,
  );
}
