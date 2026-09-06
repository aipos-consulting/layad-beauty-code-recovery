"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

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

function isBeautyCode(value: string) {
  return /^[OD][GM][PC][VE]$/.test(value);
}

function resultUrl(code: string) {
  return `https://layad16.com/result/${code}`;
}

function shareImageUrl(code: string) {
  return `https://layad16.com/api/share-card/${code}`;
}

export default function SharePage() {
  const params = useParams<{ code: string }>();
  const code = useMemo(() => String(params?.code ?? "").toUpperCase(), [params]);
  const valid = isBeautyCode(code);
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!valid) return;

    const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
    if (!key) {
      setStatus("카카오 공유 설정을 확인해 주세요.");
      return;
    }

    const initialize = () => {
      if (!window.Kakao) {
        setStatus("카카오 SDK를 불러오지 못했습니다.");
        return;
      }
      try {
        if (!window.Kakao.isInitialized()) window.Kakao.init(key);
        setReady(true);
      } catch (error) {
        console.error("[Kakao Init]", error);
        setStatus("카카오 공유 설정을 확인해 주세요.");
      }
    };

    if (window.Kakao) {
      initialize();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-layad-kakao-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", initialize, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js";
    script.crossOrigin = "anonymous";
    script.dataset.layadKakaoSdk = "true";
    script.onload = initialize;
    script.onerror = () => setStatus("카카오 SDK를 불러오지 못했습니다.");
    document.head.appendChild(script);
  }, [valid]);

  useEffect(() => {
    if (!valid || !ready || !window.Kakao) return;

    try {
      window.Kakao.Share.createDefaultButton({
        container: "#layad-kakao-share-btn",
        objectType: "feed",
        content: {
          title: `LAYAD BEAUTY CODE ${code}`,
          description: "나의 Beauty Code 결과를 확인해 보세요.",
          imageUrl: shareImageUrl(code),
          link: {
            mobileWebUrl: resultUrl(code),
            webUrl: resultUrl(code),
          },
        },
        buttons: [
          {
            title: "결과 보기",
            link: {
              mobileWebUrl: resultUrl(code),
              webUrl: resultUrl(code),
            },
          },
        ],
      });
      setStatus("");
    } catch (error) {
      console.error("[Kakao Button Bind]", error);
      setStatus("카카오 공유 버튼을 준비하지 못했습니다.");
    }
  }, [code, ready, valid]);

  if (!valid) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-[#5f5053]">유효하지 않은 Beauty Code입니다.</p>
          <a href="https://layad16.com" className="mt-5 inline-block rounded-full border border-[#d88c9c] px-5 py-3 text-sm font-semibold text-[#a85f6e]">
            LAYAD 홈으로
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 py-10">
      <section className="w-full text-center">
        <p className="text-sm font-semibold tracking-[0.18em] text-[#a85f6e]">LAYAD BEAUTY CODE</p>
        <h1 className="mt-4 text-5xl font-bold tracking-[0.16em] text-[#5f5053]">{code}</h1>
        <p className="mt-4 text-sm leading-6 text-[#806f72]">친구에게 나의 Beauty Code 결과를 공유해 보세요.</p>

        <div className="mt-8 flex flex-col gap-3">
          <a
            id="layad-kakao-share-btn"
            href="javascript:;"
            className="rounded-full bg-[#FEE500] px-5 py-4 text-sm font-bold text-[#191919]"
          >
            카카오톡으로 공유하기
          </a>
          <a
            href={resultUrl(code)}
            className="rounded-full border border-[#d88c9c] bg-white px-5 py-4 text-sm font-semibold text-[#a85f6e]"
          >
            결과 보기
          </a>
        </div>

        {status ? <p className="mt-4 text-xs leading-5 text-[#806f72]">{status}</p> : null}
      </section>
    </main>
  );
}
