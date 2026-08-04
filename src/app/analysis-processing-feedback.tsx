"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LanguageSwitcher, Locale, useLanguage } from "./i18n";

const SESSION_KEY = "layad-supabase-session-id";
type Stage = "saving" | "collecting" | "analyzing" | "completed" | "failed" | "config";
type Fit = { beautyCode: string; fitScore: number; reviewCount: number; confidence: number };
type ResultPayload = {
  ok?: boolean; code?: string; status?: string; errorMessage?: string | null; message?: string;
  product?: { canonical_name?: string; brand?: string; category?: string } | null;
  userBeautyCode?: string | null; fits?: Fit[];
};

const copy: Record<Locale, Record<string, string>> = {
  ko: {
    config: "데이터 저장 설정을 확인해 주세요.", checkFailed: "상태 확인 실패",
    insufficient: "현재 공개된 상품 정보가 충분하지 않아 적합도를 제공하기 어렵습니다.",
    delayed: "분석 시간이 길어지고 있습니다. 운영자가 결과를 준비한 뒤 다시 확인해 주세요.",
    retry: "분석 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    noSession: "회원님의 Beauty Code 세션을 확인하지 못했습니다. 유형을 다시 선택해 주세요.",
    saveFailed: "상품 신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    doneTitle: "회원님의 Beauty Code를 기준으로 확인한 결과입니다",
    stoppedTitle: "적합도 결과를 아직 보여드릴 수 없습니다",
    analyzingTitle: "운영자가 AI 분석을 진행하고 있습니다",
    collectingTitle: "운영자가 상품 정보를 확인하고 있습니다",
    savingTitle: "상품 신청을 접수하고 있습니다",
    analyzingDesc: "회원님의 Beauty Code와 선택하신 상품이 얼마나 잘 맞는지 꼼꼼하게 확인하고 있습니다.",
    collectingDesc: "상품 특성을 확인한 뒤 회원님의 Beauty Code를 기준으로 16유형 적합도 분석을 진행합니다.",
    savingDesc: "신청이 완료되면 운영자가 상품을 확인하고 AI 분석을 시작합니다.",
    selectedProduct: "선택하신 상품", steps: "상품 신청 완료|상품 정보 확인|운영자 AI 적합도 분석|회원님 유형 결과 공개",
    resultLead: "선택하신 상품은 회원님의 Beauty Code", rank: "16유형 중 {rank}위", best: "최고 적합 {code} {score}점",
    gap: "최고점과 {gap}점 차이", heatmap: "이 상품의 16유형 적합도", heatmapHelp: "내 유형은 굵은 테두리로 표시됩니다.",
    mine: "회원님", top: "최고", confirm: "확인", point: "점",
    veryFit: "매우 잘 어울립니다", fit: "잘 어울립니다", average: "무난하게 어울립니다",
    low: "일부 특성이 맞지 않을 수 있습니다", veryLow: "다른 상품과 함께 비교해 보세요",
    adminVeryFit: "매우 적합", adminFit: "적합", adminAverage: "보통", adminLow: "낮음", adminVeryLow: "매우 낮음",
  },
  en: {
    config: "Please check the data storage configuration.", checkFailed: "Unable to check status",
    insufficient: "There is not enough public product information to provide a reliable fit result.",
    delayed: "The analysis is taking longer than expected. Please check again after the result is prepared.",
    retry: "We could not check the analysis status. Please try again shortly.",
    noSession: "Your Beauty Code session could not be found. Please select your type again.",
    saveFailed: "The product request could not be saved. Please try again shortly.",
    doneTitle: "Result based on your Beauty Code",
    stoppedTitle: "The fit result is not available yet",
    analyzingTitle: "The operator is running the AI-assisted analysis",
    collectingTitle: "The operator is reviewing the product information",
    savingTitle: "Your product request is being submitted",
    analyzingDesc: "We are carefully checking how the selected product aligns with your Beauty Code.",
    collectingDesc: "After reviewing the product characteristics, the 16-type fit analysis will be prepared.",
    savingDesc: "After submission, the operator will review the product and begin the analysis.",
    selectedProduct: "Selected product", steps: "Request submitted|Product information review|Operator AI-assisted analysis|Your result published",
    resultLead: "The selected product and your Beauty Code", rank: "Rank {rank} of 16", best: "Best fit {code} {score}",
    gap: "{gap} points from the top score", heatmap: "Fit across all 16 types", heatmapHelp: "Your type is shown with a bold border.",
    mine: "You", top: "Top", confirm: "Close", point: "pts",
    veryFit: "are an excellent match", fit: "are a good match", average: "are a reasonable match",
    low: "may not match in some characteristics", veryLow: "should be compared with other products",
    adminVeryFit: "Excellent", adminFit: "Good", adminAverage: "Average", adminLow: "Low", adminVeryLow: "Very low",
  },
  ja: {
    config: "データ保存設定を確認してください。", checkFailed: "状態を確認できませんでした",
    insufficient: "公開されている商品情報が十分でないため、適合度を提供できません。",
    delayed: "分析に時間がかかっています。結果の準備後にもう一度ご確認ください。",
    retry: "分析状態を確認できませんでした。しばらくしてから再度お試しください。",
    noSession: "Beauty Codeセッションを確認できませんでした。タイプを再選択してください。",
    saveFailed: "商品申請を保存できませんでした。しばらくしてから再度お試しください。",
    doneTitle: "あなたのBeauty Codeを基準に確認した結果です",
    stoppedTitle: "適合度結果はまだ表示できません",
    analyzingTitle: "運営者がAI分析を進めています",
    collectingTitle: "運営者が商品情報を確認しています",
    savingTitle: "商品申請を受け付けています",
    analyzingDesc: "あなたのBeauty Codeと選択した商品がどの程度合うか確認しています。",
    collectingDesc: "商品特性を確認した後、16タイプの適合度分析を進めます。",
    savingDesc: "申請完了後、運営者が商品を確認して分析を開始します。",
    selectedProduct: "選択した商品", steps: "商品申請完了|商品情報確認|運営者AI適合度分析|タイプ結果公開",
    resultLead: "選択した商品とあなたのBeauty Code", rank: "16タイプ中{rank}位", best: "最高適合 {code} {score}点",
    gap: "最高点との差 {gap}点", heatmap: "この商品の16タイプ適合度", heatmapHelp: "あなたのタイプは太い枠で表示されます。",
    mine: "あなた", top: "最高", confirm: "確認", point: "点",
    veryFit: "とてもよく合います", fit: "よく合います", average: "無理なく合います",
    low: "一部の特性が合わない可能性があります", veryLow: "他の商品と比較してください",
    adminVeryFit: "非常に適合", adminFit: "適合", adminAverage: "普通", adminLow: "低い", adminVeryLow: "非常に低い",
  },
};

function format(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);
}

function heatStyle(score: number, mine: boolean, best: boolean) {
  const alpha = Math.max(0.08, Math.min(0.42, score / 240));
  return { backgroundColor: `rgba(216, 140, 156, ${alpha})`, borderColor: mine ? "#a94f65" : best ? "#d88c9c" : "#ead7db", boxShadow: mine ? "0 0 0 2px rgba(169,79,101,.18)" : undefined };
}

export default function AnalysisProcessingFeedback() {
  const { locale } = useLanguage();
  const t = copy[locale];
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<Stage>("saving");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ResultPayload | null>(null);
  const timerRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);

  const fitMessage = (score: number) => {
    if (score >= 90) return { admin: t.adminVeryFit, user: t.veryFit };
    if (score >= 75) return { admin: t.adminFit, user: t.fit };
    if (score >= 60) return { admin: t.adminAverage, user: t.average };
    if (score >= 40) return { admin: t.adminLow, user: t.low };
    return { admin: t.adminVeryLow, user: t.veryLow };
  };

  useEffect(() => {
    const stopTimer = () => { if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = null; };
    const poll = async () => {
      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) { setVisible(false); return; }
      attemptsRef.current += 1;
      try {
        const response = await fetch(`/api/product-analysis-result?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const payload = (await response.json()) as ResultPayload;
        if (payload.code === "SUPABASE_NOT_CONFIGURED") { setStage("config"); setMessage(t.config); return; }
        if (!response.ok || !payload.ok) throw new Error(t.checkFailed);
        if (payload.status === "completed") { setResult(payload); setStage("completed"); return; }
        if (payload.status === "failed" || payload.status === "insufficient_reviews") { setStage("failed"); setMessage(payload.errorMessage || t.insufficient); return; }
        setStage(payload.status === "analyzing" ? "analyzing" : "collecting");
        if (attemptsRef.current >= 45) { setStage("failed"); setMessage(t.delayed); return; }
        timerRef.current = window.setTimeout(poll, 2000);
      } catch {
        if (attemptsRef.current >= 8) { setStage("failed"); setMessage(t.retry); return; }
        timerRef.current = window.setTimeout(poll, 2000);
      }
    };

    const submitHandler = async (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!(form instanceof HTMLFormElement)) return;
      const button = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      const input = form.querySelector("input") as HTMLInputElement | null;
      const label = button?.textContent ?? "";
      const inputValue = input?.value.trim() ?? "";
      const allowed = ["적합도 분석하기", "잘 맞는지 확인하기", "Analyze product fit", "Check product fit", "適合度を分析", "相性を確認"];
      if (!allowed.some((item) => label.includes(item)) || !inputValue) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) { setMessage(t.noSession); setStage("failed"); setVisible(true); return; }
      const inputType = /^https?:\/\//i.test(inputValue) ? "url" : "name";
      if (button) button.disabled = true;
      stopTimer(); attemptsRef.current = 0; setResult(null); setMessage("");
      try {
        const response = await fetch("/api/product-analysis-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, inputType, inputValue }) });
        const payload = (await response.json()) as ResultPayload & { requestId?: string };
        if (!response.ok || !payload.ok || !payload.requestId) throw new Error(payload.message || (payload.code === "SUPABASE_NOT_CONFIGURED" ? t.config : t.saveFailed));
        if (input) input.value = "";
        setStage("collecting"); setVisible(true); timerRef.current = window.setTimeout(poll, 800);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t.saveFailed); setStage("failed"); setVisible(true);
      } finally { if (button) button.disabled = false; }
    };

    document.addEventListener("submit", submitHandler, true);
    return () => { document.removeEventListener("submit", submitHandler, true); stopTimer(); };
  }, [t]);

  const fits = useMemo(() => [...(result?.fits ?? [])].sort((a, b) => b.fitScore - a.fitScore), [result]);
  if (!visible) return null;
  const done = stage === "completed";
  const stopped = stage === "failed" || stage === "config";
  const stageNumber = stage === "saving" ? 1 : stage === "collecting" ? 2 : stage === "analyzing" ? 3 : done ? 4 : 0;
  const userCode = result?.userBeautyCode ?? null;
  const myFit = fits.find((fit) => fit.beautyCode === userCode);
  const bestFit = fits[0];
  const myRank = myFit ? fits.findIndex((fit) => fit.beautyCode === myFit.beautyCode) + 1 : null;
  const productName = `${result?.product?.brand ?? ""} ${result?.product?.canonical_name ?? t.selectedProduct}`.trim();
  const statusTitle = done ? t.doneTitle : stopped ? t.stoppedTitle : stage === "analyzing" ? t.analyzingTitle : stage === "collecting" ? t.collectingTitle : t.savingTitle;
  const statusDescription = done ? productName : stopped ? message : stage === "analyzing" ? t.analyzingDesc : stage === "collecting" ? t.collectingDesc : t.savingDesc;

  return (
    <div className="fixed inset-0 z-[140] overflow-y-auto bg-black/40 px-4 py-6">
      <section className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-6 text-[#382d2d] shadow-2xl sm:p-8">
        <div className="flex justify-end"><LanguageSwitcher compact /></div>
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f2]">{done ? <span className="text-2xl text-[#d88c9c]">✓</span> : stopped ? <span className="text-2xl text-[#b84f63]">!</span> : <span className="h-7 w-7 animate-spin rounded-full border-4 border-[#f1dfe2] border-t-[#d88c9c]" />}</div>
          <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-[#b97b88]">LAYAD BEAUTY CODE</p>
          <h2 className="mt-3 text-xl font-semibold">{statusTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[#766767]">{statusDescription}</p>
        </div>

        {!done && !stopped ? <div className="mt-6 space-y-3 text-sm">{t.steps.split("|").map((label, index) => { const number = index + 1; const active = number <= stageNumber; return <div key={label} className="flex items-center gap-3 rounded-2xl bg-[#fffafa] px-4 py-3"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-[#d88c9c] text-white" : "bg-[#eadfe1] text-[#9b898c]"}`}>{number}</span><span className={active ? "font-medium" : "text-[#9b898c]"}>{label}</span></div>; })}</div> : null}

        {done && myFit ? <>
          <section className="mt-7 rounded-3xl border border-[#efcbd3] bg-[#fff7f8] p-6 text-center">
            <p className="text-sm text-[#806f72]">{t.resultLead} <b>{userCode}</b></p>
            <p className="mt-3 text-3xl font-semibold text-[#a94f65]">{fitMessage(myFit.fitScore).user}</p>
            <p className="mt-4 text-6xl font-semibold text-[#d07488]">{myFit.fitScore}<span className="ml-1 text-xl">{t.point}</span></p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs">
              <span className="rounded-full bg-white px-3 py-2">{format(t.rank, { rank: myRank ?? "-" })}</span>
              <span className="rounded-full bg-white px-3 py-2">{format(t.best, { code: bestFit?.beautyCode ?? "-", score: bestFit?.fitScore ?? "-" })}</span>
              <span className="rounded-full bg-white px-3 py-2">{format(t.gap, { gap: Math.max(0, (bestFit?.fitScore ?? myFit.fitScore) - myFit.fitScore) })}</span>
            </div>
          </section>
          <section className="mt-7">
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold tracking-[0.16em] text-[#b97b88]">FIT HEATMAP</p><h3 className="mt-1 text-lg font-semibold">{t.heatmap}</h3></div><p className="text-xs text-[#806f72]">{t.heatmapHelp}</p></div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{(result?.fits ?? []).map((fit) => { const mine = fit.beautyCode === userCode; const best = fit.beautyCode === bestFit?.beautyCode; return <article key={fit.beautyCode} style={heatStyle(fit.fitScore, mine, best)} className="rounded-2xl border p-4 text-center"><div className="flex items-center justify-center gap-1"><b>{fit.beautyCode}</b>{mine ? <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px]">{t.mine}</span> : best ? <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px]">{t.top}</span> : null}</div><p className="mt-2 text-2xl font-semibold">{fit.fitScore}</p><p className="mt-1 text-xs">{fitMessage(fit.fitScore).admin}</p></article>; })}</div>
          </section>
        </> : null}

        {(done || stopped) ? <button type="button" onClick={() => setVisible(false)} className="mt-7 w-full rounded-full bg-[#d88c9c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c8798a]">{t.confirm}</button> : null}
      </section>
    </div>
  );
}
