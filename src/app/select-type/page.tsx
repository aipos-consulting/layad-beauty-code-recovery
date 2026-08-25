"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { BEAUTY_TYPES, type BeautyTypeCode } from "@/lib/review-product-fit";
import { createProductAnalysisRequest, validateProductInput, type ProductAnalysisRequest } from "@/lib/product-analysis-request";

const SESSION_KEY = "layad-supabase-session-id";
const SAVED_CODE_KEY = "layad-saved-beauty-code";
const SAVED_SOURCE_KEY = "layad-saved-beauty-code-source";

type AgeBand = "14-19" | "20-29" | "30-39" | "40-49" | "50-59" | "60+" | "prefer_not_to_say";
type Character = { beauty_code: string; nickname: string; image_url: string | null };

const ageOptions: Array<{ value: AgeBand; label: string }> = [
  { value: "14-19", label: "14–19세" }, { value: "20-29", label: "20–29세" }, { value: "30-39", label: "30–39세" },
  { value: "40-49", label: "40–49세" }, { value: "50-59", label: "50–59세" }, { value: "60+", label: "60세 이상" },
  { value: "prefer_not_to_say", label: "응답하지 않음" },
];

const formatRequestTime = (iso: string) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default function SelectTypePage() {
  const [selectedCode, setSelectedCode] = useState<BeautyTypeCode | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showAgePrompt, setShowAgePrompt] = useState(false);
  const [savingAge, setSavingAge] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [ageError, setAgeError] = useState("");
  const [productInput, setProductInput] = useState("");
  const [productError, setProductError] = useState("");
  const [requests, setRequests] = useState<ProductAnalysisRequest[]>([]);

  useEffect(() => { setSessionReady(Boolean(sessionStorage.getItem(SESSION_KEY))); }, []);
  useEffect(() => {
    if (!selectedCode) { setCharacter(null); return; }
    let active = true;
    fetch(`/api/beauty-code-character?code=${encodeURIComponent(selectedCode)}`, { cache: "no-store" })
      .then(r => r.json()).then(result => { if (active) setCharacter(result.character ?? null); }).catch(() => { if (active) setCharacter(null); });
    return () => { active = false; };
  }, [selectedCode]);

  async function saveAgeSession(ageBand: AgeBand | null) {
    if (!selectedCode || savingAge) return;
    setSavingAge(true); setAgeError("");
    try {
      const response = await fetch("/api/anonymous-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ beautyCode: selectedCode, beautyCodeSource: "manual", ageBand, answers: [] }) });
      const result = await response.json() as { ok?: boolean; sessionId?: string; code?: string; missing?: string[] };
      if (!response.ok || !result.ok || !result.sessionId) { setAgeError(result.code === "SUPABASE_NOT_CONFIGURED" ? "Vercel의 Supabase 환경변수를 확인해 주세요." : "연령대 저장에 실패했습니다. 다시 시도해 주세요."); return; }
      sessionStorage.setItem(SESSION_KEY, result.sessionId); sessionStorage.setItem(SAVED_CODE_KEY, selectedCode); sessionStorage.setItem(SAVED_SOURCE_KEY, "manual");
      setSessionReady(true); setShowAgePrompt(false); setProductError("");
    } catch { setAgeError("네트워크 문제로 저장하지 못했습니다. 다시 시도해 주세요."); }
    finally { setSavingAge(false); }
  }

  function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedCode) return;
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId || !sessionReady) { setShowAgePrompt(true); setProductError("상품 분석 전에 연령대 선택과 익명 세션 저장을 완료해 주세요."); return; }
    const validation = validateProductInput(productInput); if (!validation.valid) { setProductError(validation.message ?? "입력값을 확인해 주세요."); return; }
    const normalized = productInput.trim(); if (requests[0]?.inputValue === normalized) { setProductError("같은 상품이 이미 분석 준비 중입니다."); return; }
    setRequests(previous => [createProductAnalysisRequest(normalized, selectedCode), ...previous]); setProductInput(""); setProductError("");
  }

  function choose(code: BeautyTypeCode) {
    setSelectedCode(code); setConfirmed(false); setSessionReady(false); setRequests([]); setProductError("");
    sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SAVED_CODE_KEY); sessionStorage.removeItem(SAVED_SOURCE_KEY);
  }

  return (
    <main className="min-h-screen bg-[#fff8f8] px-4 py-6 text-[#382d2d] sm:px-8 sm:py-8">
      <section className="mx-auto max-w-4xl rounded-[2rem] bg-white px-4 py-8 shadow-[0_24px_70px_rgba(120,70,80,0.12)] sm:px-12 sm:py-10">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#b97b88]">SELECT YOUR BEAUTY CODE</p>
          <h1 className="mt-3 text-[28px] font-semibold sm:text-3xl">내 Beauty Code 선택</h1>
          <p className="mt-2 text-sm leading-7 text-[#766767]">알고 있는 Beauty Code를 선택해 주세요.</p>
        </div>

        <div className="mx-auto mt-6 max-w-xl rounded-[28px] border border-[#eadfe1] bg-[#f8f3ef] px-4 py-7 text-center sm:p-8">
          {selectedCode ? (
            <>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-[#c77f8f]">선택한 BEAUTY CODE</p>
              {character?.image_url ? (
                <div className="mx-auto mt-4 w-[148px] overflow-hidden rounded-[28px] bg-[#fff8f8] sm:w-[180px]">
                  <img src={character.image_url} alt={`${selectedCode} 캐릭터`} className="aspect-[4/5] h-auto w-full object-cover" />
                </div>
              ) : (
                <div className="mx-auto mt-4 flex aspect-[4/5] w-[148px] items-center justify-center rounded-[28px] bg-[#fff8f8] text-xs text-[#a99599] sm:w-[180px]">이미지 준비 중</div>
              )}
              <p className="mt-4 text-[44px] font-semibold tracking-[0.18em] text-[#df8ca0] sm:text-5xl">{selectedCode}</p>
              {character?.nickname ? <p className="mt-2 text-lg font-semibold text-[#382d2d]">{character.nickname}</p> : null}
            </>
          ) : <p className="flex min-h-52 items-center justify-center text-sm text-[#8b7b7e]">Beauty Code를 선택해 주세요.</p>}
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
          {BEAUTY_TYPES.map(code => <button key={code} type="button" onClick={() => choose(code)} className={`rounded-xl border px-2 py-3 text-[11px] font-semibold transition sm:text-xs ${code === selectedCode ? "border-[#d88c9c] bg-[#fff0f2] text-[#a85f6e] shadow-sm" : "border-[#ead7db] bg-white text-[#7f7073] hover:border-[#dca7b1]"}`}>{code}</button>)}
        </div>

        {!confirmed ? <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button type="button" disabled={!selectedCode} onClick={() => { setConfirmed(true); setShowAgePrompt(true); }} className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full bg-[#d88c9c] px-7 text-sm font-semibold text-white disabled:bg-[#d8cccc] sm:w-auto sm:min-w-56">선택한 유형으로 계속하기</button>
          <Link href="/test" className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full border border-[#d88c9c] px-7 text-sm font-semibold text-[#a85f6e] sm:w-auto sm:min-w-56">Beauty Code 테스트하기</Link>
        </div> : null}

        {confirmed && selectedCode ? <section className="mt-10 border-t border-[#f1dfe2] pt-9">
          <div className="text-center"><p className="text-xs font-semibold tracking-[0.2em] text-[#b97b88]">PRODUCT FIT ANALYSIS</p><h2 className="mt-3 text-2xl font-semibold">상품 적합도 분석</h2><p className="mt-3 text-sm leading-7 text-[#766767]">상품명 또는 상품 링크를 등록하면 AI 분석을 시작합니다.</p></div>
          <form onSubmit={submitProduct} className="mx-auto mt-7 max-w-2xl rounded-3xl border border-[#f1dfe2] bg-[#fffafa] p-5 sm:p-6">
            <label htmlFor="manual-product-input" className="text-sm font-semibold">상품명 또는 상품 링크</label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row"><input id="manual-product-input" value={productInput} onChange={e => { setProductInput(e.target.value); if (productError) setProductError(""); }} placeholder="예: 프라이머 상품명 또는 https://..." maxLength={2000} className="min-w-0 flex-1 rounded-2xl border border-[#e8cfd4] bg-white px-4 py-3 text-sm outline-none focus:border-[#d88c9c]" /><button type="submit" disabled={!productInput.trim() || !sessionReady} className="rounded-2xl bg-[#d88c9c] px-6 py-3 text-sm font-semibold text-white disabled:bg-[#d8cccc]">적합도 분석하기</button></div>
            {!sessionReady ? <p className="mt-3 text-sm text-[#806f72]">연령대 선택과 익명 저장 완료 후 분석할 수 있습니다.</p> : null}{productError ? <p className="mt-3 text-sm font-medium text-[#b84f63]">{productError}</p> : null}
          </form>
          <div className="mt-6 space-y-4">{requests.map(request => <article key={request.id} className="rounded-3xl border-2 border-[#d88c9c] bg-[#fff0f2] p-6"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-[#a85f6e]">{request.userBeautyCode}</span><span className="rounded-full border border-[#e6a8b5] bg-white px-3 py-1 text-xs font-semibold text-[#a85f6e]">분석 준비 중</span></div><h3 className="mt-4 text-lg font-semibold">상품 분석 요청이 접수되었습니다.</h3><p className="mt-3 text-sm text-[#806f72]">요청 시각 {formatRequestTime(request.createdAt)}</p></article>)}</div>
        </section> : null}
        <div className="mt-9 text-center"><Link href="/" className="text-sm text-[#7e7070] hover:underline">처음 화면으로</Link></div>
      </section>

      {showAgePrompt && selectedCode ? <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/35 px-4"><section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><p className="text-center text-xs font-semibold tracking-[0.18em] text-[#b97b88]">OPTIONAL</p><h2 className="mt-3 text-center text-xl font-semibold">연령대를 선택해 주세요</h2><p className="mt-3 text-center text-sm leading-6 text-[#766767]">서비스 개선을 위한 선택 항목입니다. 정확한 나이와 생년월일은 저장하지 않습니다.</p><div className="mt-6 grid grid-cols-2 gap-2">{ageOptions.map(option => <button key={option.value} type="button" disabled={savingAge} onClick={() => void saveAgeSession(option.value)} className="rounded-2xl border border-[#ead7db] bg-[#fffafa] px-3 py-3 text-sm font-semibold hover:border-[#d88c9c] disabled:opacity-60">{option.label}</button>)}</div><button type="button" disabled={savingAge} onClick={() => void saveAgeSession(null)} className="mt-4 w-full rounded-full px-4 py-3 text-sm text-[#7e7070] hover:bg-[#fff5f6]">선택하지 않고 저장</button>{ageError ? <p className="mt-4 text-center text-sm font-medium text-[#b84f63]">{ageError}</p> : null}</section></div> : null}
    </main>
  );
}
