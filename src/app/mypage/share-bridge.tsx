"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/app/i18n";

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (args: unknown) => void;
        createDefaultButton: (args: unknown) => void;
      };
    };
  }
}

const labels = {
  ko: { title: "내 Beauty Code 공유하기", copy: "URL 복사", kakao: "카카오톡 공유", line: "LINE 공유", copied: "결과 링크가 복사되었습니다.", kakaoMissing: "카카오 JavaScript Key가 Production에 반영되지 않았습니다.", kakaoLoad: "카카오 SDK를 불러오지 못했습니다.", kakaoError: "카카오 공유 오류", nativeShare: "인앱 브라우저: 기기 공유창을 열었습니다. 카카오톡을 선택해 주세요.", nativeShareUnsupported: "이 인앱 브라우저는 기기 공유를 지원하지 않습니다. 외부 브라우저에서 열어 주세요." },
  en: { title: "Share my Beauty Code", copy: "Copy URL", kakao: "KakaoTalk", line: "LINE", copied: "Result link copied.", kakaoMissing: "The Kakao JavaScript Key is not available in Production.", kakaoLoad: "Could not load the Kakao SDK.", kakaoError: "Kakao share error", nativeShare: "In-app browser: opened the device share sheet. Choose KakaoTalk.", nativeShareUnsupported: "This in-app browser does not support device sharing. Open in an external browser." },
  ja: { title: "Beauty Codeをシェア", copy: "URLをコピー", kakao: "KakaoTalk", line: "LINEでシェア", copied: "結果リンクをコピーしました。", kakaoMissing: "Kakao JavaScript KeyがProductionに反映されていません。", kakaoLoad: "Kakao SDKを読み込めませんでした。", kakaoError: "Kakao共有エラー", nativeShare: "アプリ内ブラウザ: 端末の共有画面を開きました。KakaoTalkを選択してください。", nativeShareUnsupported: "このアプリ内ブラウザは端末共有に対応していません。外部ブラウザで開いてください。" },
} as const;

function resultUrl(code: string) {
  return `https://layad16.com/result/${code}`;
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return "Unknown error"; }
}

function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  return /; wv\)|\bwv\b|WebView|Instagram|FBAN|FBAV|KAKAOTALK|NAVER|DaumApps|Line\//i.test(ua);
}

export default function MyPageShareBridge() {
  const { locale } = useLanguage();
  const text = labels[locale];
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [kakaoReady, setKakaoReady] = useState(false);

  useEffect(() => {
    const locate = () => {
      const codeNode = Array.from(document.querySelectorAll("p"))
        .find((node) => /^[OD][GM][PC][VE]$/.test(node.textContent?.trim() ?? "")) as HTMLElement | undefined;
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

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
    if (!key) {
      setStatus(text.kakaoMissing);
      return;
    }

    const initialize = () => {
      try {
        if (!window.Kakao) throw new Error("Kakao SDK unavailable");
        if (!window.Kakao.isInitialized()) window.Kakao.init(key);
        setKakaoReady(true);
      } catch (error) {
        console.error("[Kakao Init]", error);
        setStatus(`${text.kakaoError}: ${errorText(error)}`);
      }
    };

    if (window.Kakao) {
      initialize();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-layad-kakao-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", initialize, { once: true });
      existing.addEventListener("error", () => setStatus(text.kakaoLoad), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js";
    script.crossOrigin = "anonymous";
    script.dataset.layadKakaoSdk = "true";
    script.onload = initialize;
    script.onerror = () => setStatus(text.kakaoLoad);
    document.head.appendChild(script);
  }, [text.kakaoError, text.kakaoLoad, text.kakaoMissing]);

  async function copyLink() {
    await navigator.clipboard.writeText(resultUrl(code));
    setStatus(text.copied);
  }

  async function kakaoShare() {
    const url = resultUrl(code);
    const shareData = {
      title: `LAYAD BEAUTY CODE ${code}`,
      text: `LAYAD BEAUTY CODE ${code}`,
      url,
    };

    if (isInAppBrowser()) {
      if (typeof navigator.share === "function") {
        try {
          setStatus(text.nativeShare);
          await navigator.share(shareData);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("[Native Share]", error);
        }
      }
      setStatus(text.nativeShareUnsupported);
      return;
    }

    try {
      if (!kakaoReady || !window.Kakao?.isInitialized()) {
        throw new Error("Kakao SDK is not initialized");
      }
      window.Kakao.Share.sendDefault({
        objectType: "text",
        text: `LAYAD BEAUTY CODE ${code}`,
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      });
    } catch (error) {
      console.error("[Kakao Share]", error);
      setStatus(`${text.kakaoError}: ${errorText(error)}`);
    }
  }

  function lineShare() {
    const url = encodeURIComponent(resultUrl(code));
    const message = encodeURIComponent(`LAYAD BEAUTY CODE ${code}`);
    window.open(`https://social-plugins.line.me/lineit/share?url=${url}&text=${message}`, "_blank", "noopener,noreferrer");
  }

  if (!mount || !code) return null;

  return createPortal(
    <section className="mx-auto mt-5 max-w-xl text-center">
      <p className="text-sm font-semibold text-[#5f5053]">{text.title}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={copyLink} className="rounded-full border border-[#d88c9c] bg-white px-5 py-3 text-sm font-semibold text-[#a85f6e]">{text.copy}</button>
        <button type="button" onClick={kakaoShare} className="rounded-full bg-[#d88c9c] px-5 py-3 text-sm font-semibold text-white">{text.kakao}</button>
        <button type="button" onClick={lineShare} className="rounded-full border border-[#d88c9c] bg-white px-5 py-3 text-sm font-semibold text-[#a85f6e]">{text.line}</button>
      </div>
      {status ? <p className="mt-3 break-words text-xs leading-5 text-[#806f72]">{status}</p> : null}
    </section>,
    mount,
  );
}
