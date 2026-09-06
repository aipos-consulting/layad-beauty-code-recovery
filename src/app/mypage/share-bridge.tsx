"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/app/i18n";

const INSTAGRAM_URL = "https://www.instagram.com/layad_official";

const labels = {
  ko: { title: "내 Beauty Code 공유하기", copy: "URL 복사", kakao: "카카오톡", line: "LINE", instagram: "Instagram", copied: "결과 링크가 복사되었습니다." },
  en: { title: "Share my Beauty Code", copy: "Copy URL", kakao: "KakaoTalk", line: "LINE", instagram: "Instagram", copied: "Result link copied." },
  ja: { title: "Beauty Codeをシェア", copy: "URLをコピー", kakao: "KakaoTalk", line: "LINE", instagram: "Instagram", copied: "結果リンクをコピーしました。" },
} as const;

function resultUrl(code: string) {
  return `https://layad16.com/result/${code}`;
}

function shareUrl(code: string) {
  return `https://layad16.com/s/${code}`;
}

function KakaoIcon() {
  return <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEE500] text-[22px] font-black text-[#191919]" aria-hidden>♣</span>;
}

function InstagramIcon() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9c4c9] bg-white" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-[#a85f6e]" strokeWidth="1.8">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.8" r="1" fill="#a85f6e" stroke="none" />
      </svg>
    </span>
  );
}

function LineIcon() {
  return <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#06C755] text-sm font-black text-white" aria-hidden>LINE</span>;
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

  function lineShare() {
    const url = encodeURIComponent(resultUrl(code));
    const message = encodeURIComponent(`LAYAD BEAUTY CODE ${code}`);
    window.open(`https://social-plugins.line.me/lineit/share?url=${url}&text=${message}`, "_blank", "noopener,noreferrer");
  }

  if (!mount || !code) return null;

  return createPortal(
    <section className="mx-auto mt-5 max-w-xl text-center">
      <p className="text-sm font-semibold text-[#5f5053]">{text.title}</p>
      <div className="mt-4 flex items-start justify-center gap-5">
        <a href={shareUrl(code)} className="flex flex-col items-center gap-1.5 text-xs font-medium text-[#6f6164]" aria-label={text.kakao}>
          <KakaoIcon />
          <span>{text.kakao}</span>
        </a>
        <button type="button" onClick={lineShare} className="flex flex-col items-center gap-1.5 text-xs font-medium text-[#6f6164]" aria-label={text.line}>
          <LineIcon />
          <span>{text.line}</span>
        </button>
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 text-xs font-medium text-[#6f6164]" aria-label={text.instagram}>
          <InstagramIcon />
          <span>{text.instagram}</span>
        </a>
      </div>
      <button type="button" onClick={copyLink} className="mt-4 rounded-full border border-[#d88c9c] bg-white px-5 py-2.5 text-sm font-semibold text-[#a85f6e]">{text.copy}</button>
      {status ? <p className="mt-3 break-words text-xs leading-5 text-[#806f72]">{status}</p> : null}
    </section>,
    mount,
  );
}
