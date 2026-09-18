"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/app/i18n";

const INSTAGRAM_URL = "https://www.instagram.com/layad_official";
const NAVER_CAFE_URL = "https://cafe.naver.com/layad16";
const MARKETING_VISIT_KEY = "layad-marketing-visit-id-v1";

const labels = {
  ko: { title: "친구에게 테스트 공유하기", copy: "링크 복사", kakao: "카카오톡", naver: "네이버카페", instagram: "공식 인스타 보러가기", copied: "결과 링크가 복사되었습니다.", shareError: "카카오 공유 기록에 실패했습니다. 다시 시도해 주세요." },
  en: { title: "Share the test with friends", copy: "Copy link", kakao: "KakaoTalk", naver: "Naver Cafe", instagram: "Visit official Instagram", copied: "Result link copied.", shareError: "Could not record Kakao sharing. Please try again." },
  ja: { title: "友だちにテストをシェア", copy: "リンクをコピー", kakao: "KakaoTalk", naver: "Naver Cafe", instagram: "公式Instagramを見る", copied: "結果リンクをコピーしました。", shareError: "Kakao共有の記録に失敗しました。もう一度お試しください。" },
} as const;

function resultUrl(code: string) { return `https://layad16.com/result/${code}`; }
function copiedResultUrl(code: string) {
  const params = new URLSearchParams({
    utm_source: "link_copy",
    utm_medium: "share",
    utm_campaign: "beauty_result",
    utm_content: code,
  });
  return `${resultUrl(code)}?${params.toString()}`;
}
function shareUrl(code: string) { return `https://layad16.com/s/${code}`; }

function getMarketingVisitId() {
  try {
    const existing = window.sessionStorage.getItem(MARKETING_VISIT_KEY);
    if (existing) return existing;
    const created = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `mv_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    window.sessionStorage.setItem(MARKETING_VISIT_KEY, created);
    return created;
  } catch {
    return `mv_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function KakaoIcon() {
  return <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FEE500]" aria-hidden><svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#191919]"><path d="M12 4C7.58 4 4 6.84 4 10.35c0 2.22 1.43 4.18 3.6 5.32l-.92 3.38a.42.42 0 0 0 .64.46l3.92-2.62c.25.02.5.03.76.03 4.42 0 8-2.84 8-6.35S16.42 4 12 4Z" /></svg></span>;
}
function NaverCafeIcon() {
  return <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#03C75A] text-lg font-black text-white" aria-hidden>N</span>;
}
function LinkIcon() {
  return <span className="flex h-11 w-11 items-center justify-center bg-[#fff3f5]" aria-hidden><svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-[#6f6164]" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.6 13.4a4 4 0 0 0 5.66 0l2.14-2.14a4 4 0 0 0-5.66-5.66l-1.22 1.22" /><path d="M13.4 10.6a4 4 0 0 0-5.66 0L5.6 12.74a4 4 0 0 0 5.66 5.66l1.22-1.22" /></svg></span>;
}
function InstagramIcon() {
  return <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden><svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg></span>;
}

export default function ResultShareBridge() {
  const { locale } = useLanguage();
  const text = labels[locale];
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [isAndroid, setIsAndroid] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    setIsAndroid(/Android/i.test(navigator.userAgent));
    const locate = () => {
      const heading = Array.from(document.querySelectorAll("h1")).find((node) => /^[OD][GM][PC][VE]$/.test(node.textContent?.trim() ?? "")) as HTMLElement | undefined;
      if (!heading) {
        document.getElementById("layad-result-share-mount")?.remove();
        setMount(null); setCode(""); return;
      }
      const nextCode = heading.textContent?.trim() ?? "";
      const resultSection = heading.closest("section");
      const fitSection = resultSection ? Array.from(resultSection.children).find((el) => el.textContent?.includes("PRODUCT FIT ANALYSIS")) : null;
      let portalMount = document.getElementById("layad-result-share-mount");
      if (!portalMount) {
        portalMount = document.createElement("div");
        portalMount.id = "layad-result-share-mount";
        if (fitSection) resultSection?.insertBefore(portalMount, fitSection); else heading.parentElement?.appendChild(portalMount);
      }
      setMount(portalMount); setCode(nextCode);
    };
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(copiedResultUrl(code));
    setStatus(text.copied);
  }

  async function openKakaoShare() {
    if (sharing) return;
    setSharing(true);
    setStatus("");
    try {
      const response = await fetch("/api/marketing-attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId: getMarketingVisitId(),
          action: "share_click",
          shareChannel: "kakao",
          sourcePath: window.location.pathname,
          beautyCode: code,
        }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`share event ${response.status}`);
      window.location.assign(shareUrl(code));
    } catch (error) {
      console.error("[Kakao Share Entry]", error);
      setStatus(text.shareError);
      setSharing(false);
    }
  }

  if (!mount || !code) return null;
  return createPortal(
    <section className="mx-auto mt-9 w-full max-w-xl border-t border-[#f1dfe2] bg-[#fff3f5] px-4 pt-8 text-center">
      <p className="text-sm font-semibold text-[#5f5053]">{text.title}</p>
      <div className="mt-4 flex items-start justify-center gap-6 sm:gap-8">
        {!isAndroid ? <button type="button" onClick={openKakaoShare} disabled={sharing} className="m-0 flex min-w-[62px] appearance-none flex-col items-center gap-1.5 border-0 bg-[#fff3f5] p-0 text-xs font-medium text-[#6f6164] shadow-none disabled:opacity-60" aria-label={text.kakao}><KakaoIcon /><span>{sharing ? "..." : text.kakao}</span></button> : null}
        <a href={NAVER_CAFE_URL} target="_blank" rel="noopener noreferrer" className="flex min-w-[62px] flex-col items-center gap-1.5 bg-[#fff3f5] text-xs font-medium text-[#6f6164] no-underline" aria-label={text.naver}><NaverCafeIcon /><span className="whitespace-nowrap">{text.naver}</span></a>
        <button type="button" onClick={copyLink} style={{ backgroundColor: "#fff3f5" }} className="m-0 flex min-w-[62px] appearance-none flex-col items-center gap-1.5 border-0 bg-[#fff3f5] p-0 text-xs font-medium text-[#6f6164] shadow-none" aria-label={text.copy}><LinkIcon /><span className="whitespace-nowrap">{text.copy}</span></button>
      </div>
      <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={`mx-auto mt-5 flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#d88c9c] bg-transparent py-2.5 font-semibold text-[#a85f6e] no-underline ${isAndroid ? "max-w-[250px] px-3 text-xs" : "max-w-[280px] px-4 text-sm"}`}><InstagramIcon /><span>{text.instagram}</span></a>
      {status ? <p className="mx-auto mt-3 max-w-sm break-words px-3 text-xs leading-5 text-[#806f72]">{status}</p> : null}
    </section>, mount,
  );
}
