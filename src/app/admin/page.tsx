"use client";

import { useEffect, useMemo, useState } from "react";

type Section = "dashboard" | "statistics" | "requests" | "analysis" | "products" | "results" | "settings";
type Fit = { beautyCode: string; fitScore: number; reviewCount: number; confidence: number; rank?: number };
type RequestRow = { id: string; sessionId: string; value: string; inputType: "name" | "url"; status: string; createdAt: string; beautyCode: string; productId: string | null; personalFit: Fit | null; bestFit: Fit | null; fits: Fit[] };
type ProductRow = { name: string; count: number; uniqueSessions: number; topCode: string; status: string; productId: string | null; bestFit: Fit | null; fits: Fit[] };
type StatRow = { key?: string; code?: string; label: string; count: number; topCode: string };
type Data = { ok: boolean; message?: string; kpis?: { totalUsers: number; testCompleted: number; manualSelected: number; productRequests: number; requestedProducts: number; completedProducts: number }; sourceRatio?: { test: number; manual: number }; ageStats?: StatRow[]; countryStats?: StatRow[]; regionStats?: StatRow[]; topProducts?: ProductRow[]; recentRequests?: RequestRow[] };

const codes = ["OGPV", "OGPE", "OGCV", "OGCE", "OMPV", "OMPE", "OMCV", "OMCE", "DGPV", "DGPE", "DGCV", "DGCE", "DMPV", "DMPE", "DMCV", "DMCE"] as const;
const emptyScores = () => Object.fromEntries(codes.map(code => [code, ""])) as Record<string, string>;
const menu: Array<{ id: Section; label: string; description: string }> = [
  { id: "dashboard", label: "대시보드", description: "사용자 유형조회와 상품별 맞춤 적합도 현황을 한눈에 확인합니다." },
  { id: "statistics", label: "사용자 통계 상세", description: "Beauty Code, 연령대, 국가·지역별 사용자 분포를 확인합니다." },
  { id: "requests", label: "상품 신청 정보", description: "신청자 유형과 선택 상품의 맞춤 적합도 점수·등급·순위를 확인합니다." },
  { id: "analysis", label: "분석 작업", description: "신청 상품의 운영자 분석을 시작하고 대기 상품을 순차적으로 처리합니다." },
  { id: "products", label: "상품 관리", description: "상품별 16유형 점수분포와 적합도 히트맵을 비교합니다." },
  { id: "results", label: "적합도 결과", description: "ChatGPT 분석 지시문을 복사하고 16유형 점수를 입력해 결과를 공개합니다." },
  { id: "settings", label: "운영 설정", description: "관리자 접근과 데이터 운영 기준을 확인합니다." },
];
const statusLabel: Record<string, string> = { submitted: "신청 접수", collecting_reviews: "상품 확인", insufficient_reviews: "분석 불가", analyzing: "운영자 분석 중", completed: "분석 완료", failed: "처리 실패" };

function grade(score: number) { if (score >= 90) return "매우 적합"; if (score >= 75) return "적합"; if (score >= 60) return "보통"; if (score >= 40) return "낮음"; return "매우 낮음"; }
function heat(score: number) { return { backgroundColor: `rgba(216,140,156,${Math.max(.08, Math.min(.44, score / 230))})` }; }
function dateText(value: string) { return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function Card({ title, value }: { title: string; value: number | string }) { return <article className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm"><p className="text-xs text-[#78696c]">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p></article>; }
function Heatmap({ fits, mine }: { fits: Fit[]; mine?: string }) {
  const best = fits.length ? [...fits].sort((a, b) => b.fitScore - a.fitScore)[0] : null;
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{codes.map(code => {
    const fit = fits.find(item => item.beautyCode === code);
    return <div key={code} style={fit ? heat(fit.fitScore) : undefined} className={`rounded-xl border p-3 text-center ${code === mine ? "border-[#a94f65] ring-2 ring-[#a94f65]/20" : "border-[#eadfe1]"}`}>
      <div className="flex justify-center gap-1 text-xs font-semibold"><span>{code}</span>{code === mine ? <span>회원</span> : code === best?.beautyCode ? <span>최고</span> : null}</div>
      <p className="mt-1 text-xl font-semibold">{fit ? fit.fitScore : "—"}</p>
      <p className="text-[11px] text-[#78696c]">{fit ? grade(fit.fitScore) : "미입력"}</p>
    </div>;
  })}</div>;
}

function analysisPrompt(row: RequestRow) {
  return `당신은 LAYAD BEAUTY CODE의 화장품 적합도 분석 운영자입니다.\n\n분석 대상 상품: ${row.value}\n입력 유형: ${row.inputType === "url" ? "상품 링크" : "상품명"}\n신청자 Beauty Code: ${row.beautyCode}\n\n아래 기준으로 공개적으로 확인 가능한 상품 정보와 리뷰 맥락을 검토해 주세요. 확인되지 않은 사실을 추정하지 말고, 근거가 부족한 경우 그 한계를 명시하세요.\n\nBeauty Code 축\n- O/D: 유분 관리 성향 / 건조 관리 성향\n- G/M: 글로우 표현 / 매트 표현\n- P/C: 정교한 사용 방식 / 간편한 사용 방식\n- V/E: 컨디션 변화 민감 / 결과 안정성 중시\n\n요청 결과\n1. 상품의 핵심 특성과 사용 조건을 요약합니다.\n2. 16개 유형 각각에 0~100점 적합도 점수를 부여합니다.\n3. 점수 차이가 발생한 이유를 축별로 설명합니다.\n4. 신청자 유형 ${row.beautyCode}의 점수와 장점, 주의점을 별도로 설명합니다.\n5. 아래 코드 순서로 복사 가능한 JSON만 마지막에 출력합니다.\n\n${JSON.stringify(Object.fromEntries(codes.map(code => [code, 0])), null, 2)}\n\n점수는 반드시 모든 유형에 입력하고, 동일 상품에 대한 상대 비교가 가능하도록 일관된 기준을 적용하세요.`;
}

export default function AdminPage() {
  const [section, setSection] = useState<Section>("dashboard");
  const [mobile, setMobile] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [scores, setScores] = useState<Record<string, string>>(emptyScores);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      setData(await response.json());
    } catch {
      setData({ ok: false, message: "관리자 API 연결 실패" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const requests = data?.recentRequests ?? [];
  const products = data?.topProducts ?? [];
  const pendingRequests = requests.filter(row => row.status === "submitted" || row.status === "collecting_reviews");
  const selected = requests.find(row => row.id === selectedId) ?? requests.find(row => row.status === "analyzing") ?? pendingRequests[0] ?? requests[0];
  useEffect(() => { if (selected && !selectedId) setSelectedId(selected.id); }, [selected, selectedId]);
  useEffect(() => {
    setCopied(false);
    if (!selected) { setScores(emptyScores()); return; }
    if (selected.fits?.length) setScores(Object.fromEntries(codes.map(code => [code, String(selected.fits.find(fit => fit.beautyCode === code)?.fitScore ?? "")])));
    else setScores(emptyScores());
  }, [selected?.id]);

  const enteredFits = useMemo<Fit[]>(() => codes.flatMap(code => {
    const value = scores[code]?.trim();
    if (value === "") return [];
    const number = Number(value);
    if (!Number.isFinite(number)) return [];
    return [{ beautyCode: code, fitScore: number, reviewCount: 0, confidence: .7 }];
  }), [scores]);
  const allScoresEntered = codes.every(code => scores[code]?.trim() !== "" && Number.isFinite(Number(scores[code])) && Number(scores[code]) >= 0 && Number(scores[code]) <= 100);

  const fitBuckets = useMemo(() => {
    const bucket = { very: 0, low: 0, pending: 0 };
    for (const row of requests) {
      if (!row.personalFit) bucket.pending++;
      else if (row.personalFit.fitScore >= 90) bucket.very++;
      else if (row.personalFit.fitScore < 60) bucket.low++;
    }
    return bucket;
  }, [requests]);

  const startAnalysis = async (requestId: string) => {
    setWorkflowBusy(true); setSaveMessage("");
    try {
      const response = await fetch("/api/admin/analysis-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, action: "start" }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.detail || payload.message || "분석 시작 실패");
      setSelectedId(requestId); setSection("results");
      setSaveMessage("운영자 분석 상태로 전환했습니다. 분석 지시문을 ChatGPT에 붙여넣은 뒤 16유형 점수를 입력해 주세요.");
      await load();
    } catch (error) { setSaveMessage(error instanceof Error ? error.message : "분석 시작 실패"); }
    finally { setWorkflowBusy(false); }
  };

  const prepareNext = async () => {
    setWorkflowBusy(true); setSaveMessage("");
    try {
      const response = await fetch("/api/admin/analysis-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prepare-next" }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.detail || payload.message || "대기 상품 준비 실패");
      if (!payload.requestId) { setSaveMessage(payload.message || "분석 대기 상품이 없습니다."); return; }
      setSelectedId(payload.requestId); setSection("results");
      setSaveMessage("가장 오래된 대기 상품을 운영자 분석 중으로 전환했습니다.");
      await load();
    } catch (error) { setSaveMessage(error instanceof Error ? error.message : "대기 상품 준비 실패"); }
    finally { setWorkflowBusy(false); }
  };

  const copyPrompt = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(analysisPrompt(selected));
      setCopied(true); setSaveMessage("ChatGPT 분석 지시문을 복사했습니다.");
    } catch { setSaveMessage("클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요."); }
  };

  const save = async () => {
    if (!selected || !allScoresEntered) { setSaveMessage("16유형 점수를 모두 0~100으로 입력해 주세요."); return; }
    setSaving(true); setSaveMessage("");
    try {
      const numericScores = Object.fromEntries(codes.map(code => [code, Number(scores[code])]));
      const response = await fetch("/api/admin/fit-result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: selected.id, scores: numericScores }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.detail || payload.message || payload.code || "저장 실패");
      await load(); setSaveMessage("16유형 점수를 저장하고 사용자 결과를 공개했습니다.");
    } catch (error) { setSaveMessage(error instanceof Error ? error.message : "저장 실패"); }
    finally { setSaving(false); }
  };

  const current = menu.find(item => item.id === section) ?? menu[0];
  const nav = <>{menu.map(item => <button key={item.id} onClick={() => { setSection(item.id); setMobile(false); }} className={`w-full rounded-xl px-4 py-3 text-left text-sm ${section === item.id ? "bg-[#d88c9c] font-semibold text-white" : "text-white/75 hover:bg-white/10"}`}>{item.label}</button>)}</>;
  const requestCards = <div className="space-y-3">{requests.map(row => <article key={row.id} className="rounded-2xl border border-[#eadfe1] bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{row.value}</p><p className="mt-1 text-xs text-[#78696c]">신청자 {row.beautyCode} · {dateText(row.createdAt)}</p></div>{row.personalFit ? <div className="text-right"><p className="text-2xl font-semibold text-[#a94f65]">{row.personalFit.fitScore}점</p><p className="text-xs">{grade(row.personalFit.fitScore)} · 16유형 중 {row.personalFit.rank}위</p></div> : <span className="rounded-full bg-[#f4e8ea] px-3 py-1 text-xs">{statusLabel[row.status] ?? row.status}</span>}</div>{row.personalFit && row.bestFit ? <p className="mt-3 rounded-xl bg-[#fff7f8] px-3 py-2 text-xs">최고 적합 {row.bestFit.beautyCode} {row.bestFit.fitScore}점 · 신청자 유형과 {Math.max(0, row.bestFit.fitScore - row.personalFit.fitScore)}점 차이</p> : null}</article>)}</div>;

  let body: React.ReactNode;
  if (section === "dashboard") body = <div className="space-y-7"><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Card title="전체 유형조회" value={data?.kpis?.totalUsers ?? 0} /><Card title="상품 신청" value={data?.kpis?.productRequests ?? 0} /><Card title="매우 적합 신청" value={fitBuckets.very} /><Card title="낮은 적합도 신청" value={fitBuckets.low} /><Card title="분석 대기" value={fitBuckets.pending} /></section><section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]"><article className="rounded-3xl border border-[#eadfe1] bg-white p-6"><h3 className="text-lg font-semibold">최근 신청자의 상품 적합도</h3><p className="mt-2 text-sm text-[#78696c]">신청 건수보다 사용자 Beauty Code와 상품의 적합도를 우선 표시합니다.</p><div className="mt-5">{requestCards}</div></article><article className="rounded-3xl border border-[#eadfe1] bg-white p-6"><h3 className="text-lg font-semibold">상품별 최고 적합 유형</h3><div className="mt-5 space-y-3">{products.map(product => <div key={product.name} className="rounded-2xl border border-[#eadfe1] p-4"><p className="font-semibold">{product.name}</p><p className="mt-2 text-sm">신청 관심 1위 {product.topCode}</p><p className="mt-1 text-sm text-[#a94f65]">{product.bestFit ? `적합도 최고 ${product.bestFit.beautyCode} ${product.bestFit.fitScore}점` : "16유형 점수 미등록"}</p></div>)}</div></article></section></div>;
  else if (section === "statistics") body = <div className="space-y-6"><section className="grid gap-3 sm:grid-cols-3"><Card title="전체 사용자" value={data?.kpis?.totalUsers ?? 0} /><Card title="20문항 테스트" value={`${data?.sourceRatio?.test ?? 0}%`} /><Card title="직접 선택" value={`${data?.sourceRatio?.manual ?? 0}%`} /></section>{[["연령대 상세", data?.ageStats ?? []], ["국가 상세", data?.countryStats ?? []], ["대한민국 지역 상세", data?.regionStats ?? []]].map(([title, rows]) => <section key={title as string} className="rounded-3xl border border-[#eadfe1] bg-white p-6"><h3 className="text-lg font-semibold">{title as string}</h3><div className="mt-4 space-y-3">{(rows as StatRow[]).map(row => <div key={row.label} className="grid grid-cols-[110px_1fr_60px] items-center gap-3 text-sm"><span>{row.label}</span><div className="h-3 rounded-full bg-[#f0e4e6]"><div className="h-full rounded-full bg-[#d88c9c]" style={{ width: `${Math.min(100, row.count * 4)}%` }} /></div><span className="text-right">{row.count} · {row.topCode}</span></div>)}</div></section>)}</div>;
  else if (section === "requests") body = <section className="rounded-3xl border border-[#eadfe1] bg-white p-6"><h3 className="text-lg font-semibold">상품 신청별 맞춤 적합도</h3><p className="mt-2 text-sm text-[#78696c]">신청자 유형, 해당 유형 점수, 등급, 16유형 순위를 함께 확인합니다.</p><div className="mt-5">{requestCards}</div></section>;
  else if (section === "analysis") body = <div className="space-y-6"><section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#eadfe1] bg-white p-6"><div><h3 className="text-lg font-semibold">대기 상품 순차 분석 작업함</h3><p className="mt-2 text-sm text-[#78696c]">가장 오래된 대기 상품부터 운영자 분석 중 상태로 전환하고 결과 입력 화면으로 이동합니다.</p></div><button disabled={workflowBusy || pendingRequests.length === 0} onClick={prepareNext} className="rounded-xl bg-[#382d2d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{workflowBusy ? "준비 중" : `대기 상품 분석 준비 (${pendingRequests.length})`}</button></section><div className="grid gap-5 lg:grid-cols-3">{["submitted", "analyzing", "completed"].map(status => <section key={status} className="rounded-3xl border border-[#eadfe1] bg-white p-5"><h3 className="font-semibold">{statusLabel[status]}</h3><div className="mt-4 space-y-3">{requests.filter(row => status === "submitted" ? row.status === "submitted" || row.status === "collecting_reviews" : row.status === status).map(row => <article key={row.id} className="rounded-2xl border border-[#eadfe1] p-4"><p className="font-medium">{row.value}</p><p className="mt-1 text-xs">{row.beautyCode} · {row.personalFit ? `${row.personalFit.fitScore}점` : "점수 미입력"}</p><div className="mt-3 flex gap-2">{row.status === "submitted" || row.status === "collecting_reviews" ? <button disabled={workflowBusy} onClick={() => startAnalysis(row.id)} className="rounded-lg bg-[#d88c9c] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">운영자 분석 시작</button> : <button onClick={() => { setSelectedId(row.id); setSection("results"); }} className="rounded-lg border border-[#d8b6bd] px-3 py-2 text-xs font-semibold">{row.status === "completed" ? "결과 보기" : "분석 화면 열기"}</button>}</div></article>)}</div></section>)}</div>{saveMessage ? <p className="rounded-2xl bg-[#fff7f8] p-4 text-sm text-[#a94f65]">{saveMessage}</p> : null}</div>;
  else if (section === "products") body = <div className="space-y-6">{products.map(product => <section key={product.name} className="rounded-3xl border border-[#eadfe1] bg-white p-6"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-semibold">{product.name}</h3><p className="mt-1 text-sm text-[#78696c]">신청 {product.count}건 · 신청 관심 1위 {product.topCode}</p></div><p className="text-sm font-semibold text-[#a94f65]">{product.bestFit ? `최고 ${product.bestFit.beautyCode} ${product.bestFit.fitScore}점` : "미분석"}</p></div><div className="mt-5"><Heatmap fits={product.fits} /></div></section>)}</div>;
  else if (section === "results") body = <div className="space-y-6"><section className="rounded-3xl border border-[#eadfe1] bg-white p-6"><label className="text-sm font-semibold">분석할 상품 신청</label><select value={selected?.id ?? ""} onChange={event => setSelectedId(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfd1d4] px-3 py-3">{requests.map(row => <option key={row.id} value={row.id}>{row.value} · 신청자 {row.beautyCode} · {statusLabel[row.status] ?? row.status}</option>)}</select>{selected ? <><div className="mt-4 rounded-2xl bg-[#fff7f8] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">핵심 검수 대상: {selected.beautyCode} 사용자와 {selected.value}의 적합도</p><p className="mt-1 text-sm text-[#78696c]">ChatGPT Plus에 분석 지시문을 붙여넣고 받은 16개 점수를 아래에 입력합니다.</p></div><span className="rounded-full bg-white px-3 py-2 text-xs font-semibold">{statusLabel[selected.status] ?? selected.status}</span></div></div><section className="mt-5 rounded-2xl border border-[#eadfe1] bg-[#fffdfd] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">ChatGPT Plus 분석 지시문</h3><p className="mt-1 text-xs text-[#78696c]">OpenAI API 비용 없이 운영자가 ChatGPT에서 분석하는 MVP 방식입니다.</p></div><button type="button" onClick={copyPrompt} className="rounded-xl bg-[#d88c9c] px-4 py-3 text-sm font-semibold text-white">{copied ? "복사 완료" : "분석 지시문 복사"}</button></div><pre className="mt-4 max-h-44 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f7f1f2] p-4 text-xs leading-6 text-[#66575a]">{analysisPrompt(selected)}</pre></section></> : null}<div className="mt-5"><Heatmap fits={enteredFits} mine={selected?.beautyCode} /></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{codes.map(code => <label key={code} className={`rounded-2xl border p-4 ${code === selected?.beautyCode ? "border-[#a94f65] bg-[#fff7f8]" : "border-[#eadfe1]"}`}><span className="text-sm font-semibold">{code}</span><input type="number" min={0} max={100} placeholder="미입력" value={scores[code] ?? ""} onChange={event => { const value = event.target.value; if (value === "" || (/^\d{1,3}$/.test(value) && Number(value) <= 100)) setScores(previous => ({ ...previous, [code]: value })); }} className="mt-2 w-full rounded-xl border border-[#dfd1d4] px-3 py-2" /></label>)}</div><p className="mt-3 text-xs text-[#78696c]">입력 완료 {codes.filter(code => scores[code]?.trim() !== "").length}/16 · 미입력 점수는 결과로 저장되지 않습니다.</p><button disabled={!selected || saving || selected.status !== "analyzing" || !allScoresEntered} onClick={save} className="mt-5 rounded-xl bg-[#382d2d] px-5 py-3 font-semibold text-white disabled:opacity-40">{saving ? "저장 중" : "16유형 결과 저장 및 공개"}</button>{selected?.status !== "analyzing" ? <p className="mt-3 text-xs text-[#78696c]">결과 저장 전 분석 작업 메뉴에서 운영자 분석을 시작해 주세요.</p> : !allScoresEntered ? <p className="mt-3 text-xs text-[#78696c]">16개 점수를 모두 입력하면 결과 공개 버튼이 활성화됩니다.</p> : null}{saveMessage ? <p className="mt-3 text-sm text-[#a94f65]">{saveMessage}</p> : null}</section></div>;
  else body = <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-3xl border border-[#eadfe1] bg-white p-6"><h3 className="font-semibold">운영 방식</h3><p className="mt-4 text-sm leading-7">운영자가 ChatGPT Plus에서 상품을 분석하고 관리자 화면에서 16유형 점수를 등록합니다. OpenAI API 비용은 사용하지 않습니다.</p></section><section className="rounded-3xl border border-[#eadfe1] bg-white p-6"><h3 className="font-semibold">보안 상태</h3><p className="mt-4 text-sm leading-7">현재 관리자 인증은 미적용 상태입니다. 외부 공개 전 관리자 로그인을 추가해야 합니다.</p></section></div>;

  return <main className="min-h-screen bg-[#f7f4f4] text-[#382d2d]"><div className="mx-auto flex min-h-screen max-w-[1600px]"><aside className="hidden w-64 shrink-0 bg-[#2f2829] px-5 py-7 text-white lg:block"><button onClick={() => setSection("dashboard")} className="text-left"><p className="text-2xl font-semibold tracking-[.18em] text-[#f4d4da]">LAYAD</p><p className="mt-2 text-sm text-white/70">관리자 화면</p></button><nav className="mt-8 space-y-2">{nav}</nav></aside><section className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#eadfe1] bg-white/95 px-5 py-4 sm:px-8"><div><p className="text-lg font-semibold tracking-[.16em] text-[#b97b88]">LAYAD</p><h1 className="mt-1 text-xl font-semibold">{current.label}</h1><p className="mt-1 hidden text-sm text-[#78696c] sm:block">{current.description}</p></div><button onClick={() => setMobile(true)} className="rounded-xl border border-[#eadfe1] px-4 py-3 text-lg lg:hidden" aria-label="관리자 메뉴 열기">☰</button></header>{mobile ? <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobile(false)}><aside className="h-full w-[82%] max-w-sm bg-[#2f2829] p-5 text-white" onClick={event => event.stopPropagation()}><div className="flex justify-between"><div><p className="text-xl font-semibold tracking-[.16em] text-[#f4d4da]">LAYAD</p><p className="mt-1 text-sm text-white/70">관리자 화면</p></div><button onClick={() => setMobile(false)} className="text-2xl">×</button></div><nav className="mt-7 space-y-2">{nav}</nav></aside></div> : null}<div className="p-5 sm:p-8">{loading ? <p>데이터를 불러오는 중입니다.</p> : !data?.ok ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{data?.message ?? "관리자 데이터를 불러오지 못했습니다."}</div> : body}</div></section></div></main>;
}
