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
  ko: { title: "내 Beauty Code 공유하기", copy: "URL 복사", kakao: "카카오톡 공유", line: "LINE 공유", copied: "결과 링크가 복사되었습니다.", kakaoMissing: "카카오 공유 설정을 확인해 주세요." },
  en: { title: "Share my Beauty Code", copy: "Copy URL", kakao: "KakaoTalk", line: "LINE", copied: "Result link copied.", kakaoMissing: "Please check Kakao sharing settings." },
  ja: { title: "Beauty Codeをシェア", copy: "URLをコピー", kakao: "KakaoTalk", line: "LINEでシェア", copied: "結果リンクをコピーしました。", kakaoMissing: "Kakao共有設定をご確認ください。" },
} as const;

function resultUrl(code: string) {
  return `${window.location.origin}/result/${code}`;
}

export default function MyPageShareBridge() {
  const { locale } = useLanguage();
  const text = labels[locale];
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");

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
    if (!key) {
      setStatus(text.kakaoMissing);
      return;
    }
    const send = () => {
      if (!window.Kakao) return;
      if (!window.Kakao.isInitialized()) window.Kakao.init(key);
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: `LAYAD BEAUTY CODE ${code}`,
          description: locale === "ja" ? "私のBeauty Codeをチェックしてみてください。" : locale === "en" ? "Check out my Beauty Code result." : "나의 Beauty Code 결과를 확인해 보세요.",
          imageUrl: `${window.location.origin}/layad-logo.svg`,
          link: { mobileWebUrl: resultUrl(code), webUrl: resultUrl(code) },
        },
        buttons: [{ title: locale === "ja" ? "結果を見る" : locale === "en" ? "View result" : "결과 보기", link: { mobileWebUrl: resultUrl(code), webUrl: resultUrl(code) } }],
      });
    };
    if (window.Kakao) {
      send();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js";
    script.crossOrigin = "anonymous";
    script.onload = send;
    document.head.appendChild(script);
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
      {status ? <p className="mt-3 text-xs text-[#806f72]">{status}</p> : null}
    </section>,
    mount,
  );
}
