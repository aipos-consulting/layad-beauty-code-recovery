"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type CodeRow = { beauty_code: string; is_current: boolean };
type MyPagePayload = { ok?: boolean; code?: string; codes?: CodeRow[] };
type FastPayload = {
  ok?: boolean;
  status?: string;
  cached?: boolean;
  productName?: string;
  beautyCode?: string;
  fitScore?: number;
  confidence?: number;
  reviewCount?: number;
  message?: string;
  timings?: { beginMs?: number; openAiMs?: number; finalizeMs?: number; totalMs?: number };
};

export default function FitPage() {
  const [beautyCode, setBeautyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [productInput, setProductInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ productName: string; score: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/mypage", { cache: "no-store" });
        const payload = await response.json().catch(() => ({})) as MyPagePayload;
        if (response.status === 401 || payload.code === "AUTH_REQUIRED") {
          setAuthRequired(true);
          return;
        }
        if (!response.ok || !payload.ok) throw new Error();
        const current = payload.codes?.find((code) => code.is_current) ?? payload.codes?.[0] ?? null;
        setBeautyCode(current?.beauty_code ?? null);
      } catch {
        setMessage("저장된 Beauty Code를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!beautyCode || !productInput.trim() || busy) return;

    const inputValue = productInput.trim();
    setBusy(true);
    setMessage("상품 정보를 확인하고 적합도를 분석하고 있습니다.");
    setResult(null);

    try {
      const response = await fetch("/api/product-fit-fast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beautyCode, inputValue }),
      });
      const payload = await response.json().catch(() => ({})) as FastPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "적합도 분석에 실패했습니다.");
      }
      if (payload.status !== "completed" || typeof payload.fitScore !== "number") {
        setMessage(payload.message || "공개 근거가 충분하지 않아 자동 분석을 보류했습니다.");
        return;
      }

      setResult({ productName: payload.productName || inputValue, score: payload.fitScore });
      setMessage("");
      setProductInput("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "적합도 분석에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#fff8f8] px-5 py-16 text-center text-[#806f72]">Beauty Code를 확인하는 중입니다.</main>;

  if (authRequired) {
    return (
      <main className="min-h-screen bg-[#fff8f8] px-5 py-14 text-[#382d2d]">
        <section className="mx-auto max-w-md rounded-[2rem] bg-white p-8 text-center shadow-[0_24px_70px_rgba(120,70,80,0.12)]">
          <p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">PRODUCT FIT</p>
          <h1 className="mt-4 text-3xl font-semibold">상품 적합도 분석</h1>
          <p className="mt-4 text-sm leading-7 text-[#766767]">저장된 Beauty Code로 바로 분석하려면 로그인해 주세요.</p>
          <Link href="/account" className="mt-7 block rounded-2xl bg-[#d88c9c] px-5 py-3.5 font-semibold text-white">로그인 · 회원가입</Link>
          <Link href="/test" className="mt-3 block rounded-2xl border border-[#ead7db] px-5 py-3.5 font-semibold text-[#806f72]">처음 Beauty Code 테스트하기</Link>
        </section>
      </main>
    );
  }

  if (!beautyCode) {
    return (
      <main className="min-h-screen bg-[#fff8f8] px-5 py-14 text-[#382d2d]">
        <section className="mx-auto max-w-md rounded-[2rem] bg-white p-8 text-center shadow-[0_24px_70px_rgba(120,70,80,0.12)]">
          <p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">PRODUCT FIT</p>
          <h1 className="mt-4 text-3xl font-semibold">먼저 Beauty Code가 필요합니다</h1>
          <p className="mt-4 text-sm leading-7 text-[#766767]">테스트는 최초 한 번만 하면 되고, 저장된 이후에는 이 화면에서 계속 상품 적합도를 분석할 수 있습니다.</p>
          <Link href="/test" className="mt-7 block rounded-2xl bg-[#d88c9c] px-5 py-3.5 font-semibold text-white">Beauty Code 테스트하기</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8f8] px-5 py-10 text-[#382d2d] sm:px-8">
      <section className="mx-auto max-w-2xl rounded-[2rem] bg-white p-7 shadow-[0_24px_70px_rgba(120,70,80,0.12)] sm:p-10">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">PRODUCT FIT ANALYSIS</p>
          <h1 className="mt-4 text-3xl font-semibold">상품 적합도 분석</h1>
          <p className="mt-3 text-sm leading-7 text-[#766767]">현재 Beauty Code <strong className="text-[#a85f6e]">{beautyCode}</strong> 기준으로 분석합니다.</p>
        </div>

        <form onSubmit={submit} data-direct-product-fit="true" className="mt-8 rounded-3xl border border-[#f1dfe2] bg-[#fffafa] p-5 sm:p-6">
          <label htmlFor="fit-product-input" className="text-sm font-semibold">상품명 또는 상품 링크</label>
          <input
            id="fit-product-input"
            value={productInput}
            onChange={(event) => setProductInput(event.target.value)}
            placeholder="예: 에스티로더 더블웨어 파운데이션"
            maxLength={2000}
            className="mt-3 w-full rounded-2xl border border-[#e8cfd4] bg-white px-4 py-3 text-sm outline-none focus:border-[#d88c9c] focus:ring-2 focus:ring-[#f4dce1]"
          />
          <button type="submit" disabled={!productInput.trim() || busy} className="mt-3 w-full rounded-2xl bg-[#d88c9c] px-6 py-3 text-sm font-semibold text-white enabled:hover:bg-[#c8798a] disabled:cursor-not-allowed disabled:bg-[#d8cccc]">
            {busy ? "분석 중..." : "분석 시작하기"}
          </button>
        </form>

        {message ? <p className="mt-5 rounded-2xl bg-[#fff3df] p-4 text-sm leading-6 text-[#8d5a23]">{message}</p> : null}

        {result ? (
          <section className="mt-6 rounded-3xl bg-[#fff0f2] p-7 text-center">
            <p className="text-sm font-semibold text-[#9f6572]">{result.productName}</p>
            <p className="mt-2 text-5xl font-black text-[#c86f82]">{result.score}</p>
            <p className="mt-1 text-sm font-semibold text-[#806f72]">{beautyCode} 기준 · 100점 만점</p>
          </section>
        ) : null}

        <div className="mt-7 text-center"><Link href="/mypage" className="text-sm font-semibold text-[#a85f6e]">My Page에서 Beauty Code 보기</Link></div>
      </section>
    </main>
  );
}
