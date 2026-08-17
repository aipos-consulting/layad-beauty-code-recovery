"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "pilot" | "standard" | "growth" | "custom";
type Trend = "daily" | "weekly" | "monthly";
type CostPoint = { date: string; cost: number };
type OpsData = {
  ok: boolean;
  message?: string;
  setting?: { mode: Mode; monthly_budget_usd: number; warning_low_percent: number; warning_high_percent: number; updated_at: string };
  connection?: { apiKeyConfigured: boolean; adminKeyConfigured: boolean; projectIdConfigured: boolean; model: string; costGuardReady: boolean };
  costs?: { points: CostPoint[]; todayCost: number; recent7: number; monthCost: number; remaining: number; usagePercent: number; forecast: number; blocked?: boolean; message: string };
};

const modes = [
  { id: "pilot" as Mode, label: "Pilot", budget: 20, description: "초기 운영 · 최소 비용" },
  { id: "standard" as Mode, label: "Standard", budget: 50, description: "사용 증가 단계" },
  { id: "growth" as Mode, label: "Growth", budget: 100, description: "확장 운영 단계" },
  { id: "custom" as Mode, label: "Custom", budget: 0, description: "직접 한도 입력" },
];

const money = (value = 0) => `$${value.toFixed(2)}`;

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return <article className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm"><p className="text-xs text-[#78696c]">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p>{sub ? <p className="mt-1 text-xs text-[#8d7f82]">{sub}</p> : null}</article>;
}

function aggregate(points: CostPoint[], trend: Trend) {
  if (trend === "daily") return points.slice(-30).map(p => ({ label: p.date.slice(5), value: p.cost }));
  const groups = new Map<string, number>();
  if (trend === "weekly") {
    for (const p of points.slice(-84)) {
      const d = new Date(`${p.date}T00:00:00Z`); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() - day + 1);
      const key = d.toISOString().slice(5, 10); groups.set(key, (groups.get(key) ?? 0) + p.cost);
    }
  } else {
    for (const p of points) { const key = p.date.slice(0, 7); groups.set(key, (groups.get(key) ?? 0) + p.cost); }
  }
  return [...groups.entries()].slice(trend === "monthly" ? -12 : -12).map(([label, value]) => ({ label, value }));
}

function TrendChart({ points, trend }: { points: CostPoint[]; trend: Trend }) {
  const values = useMemo(() => aggregate(points, trend), [points, trend]);
  if (!values.length) return <div className="flex h-64 items-center justify-center rounded-2xl bg-[#fbf7f7] text-sm text-[#8d7f82]">비용 데이터 연결 후 추세가 표시됩니다.</div>;
  const max = Math.max(...values.map(v => v.value), .01); const w = 900; const h = 250; const px = 34; const py = 26; const iw = w - px * 2; const ih = h - py * 2;
  const coords = values.map((v, i) => ({ ...v, x: px + (values.length === 1 ? iw / 2 : i * iw / (values.length - 1)), y: py + ih - v.value / max * ih }));
  const path = coords.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  return <div className="overflow-x-auto rounded-2xl bg-[#fbf7f7] p-3"><svg viewBox={`0 0 ${w} ${h}`} className="h-64 min-w-[700px] w-full">{[0,.25,.5,.75,1].map(r => <line key={r} x1={px} x2={w-px} y1={py+ih*r} y2={py+ih*r} stroke="#eadfe1" />)}<path d={path} fill="none" stroke="#a94f65" strokeWidth="4" strokeLinecap="round"/>{coords.map((p,i)=><g key={`${p.label}-${i}`}><circle cx={p.x} cy={p.y} r="5" fill="#a94f65"/><text x={p.x} y={h-6} textAnchor="middle" fontSize="11" fill="#8d7f82">{p.label}</text></g>)}</svg></div>;
}

export default function Page() {
  const [data, setData] = useState<OpsData | null>(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [testing, setTesting] = useState(false); const [message, setMessage] = useState(""); const [mode, setMode] = useState<Mode>("pilot"); const [customBudget, setCustomBudget] = useState("20"); const [trend, setTrend] = useState<Trend>("daily");
  const load = async () => { setLoading(true); try { const r = await fetch("/api/admin/openai-ops", { cache: "no-store" }); const p = await r.json() as OpsData; setData(p); if (p.setting) { setMode(p.setting.mode); setCustomBudget(String(p.setting.monthly_budget_usd)); } } catch { setData({ ok:false, message:"OpenAI 운영정보 API 연결 실패" }); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const save = async () => { setSaving(true); setMessage(""); try { const r = await fetch("/api/admin/openai-ops", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"save", mode, monthlyBudgetUsd:Number(customBudget) }) }); const p=await r.json(); if(!r.ok||!p.ok) throw new Error(p.message||"저장 실패"); setMessage("AI 운영 한도를 저장했습니다. 한도 도달 시 자동 차단 정책은 항상 적용됩니다."); await load(); } catch(e){ setMessage(e instanceof Error?e.message:"저장 실패"); } finally { setSaving(false); } };
  const test = async () => { setTesting(true); setMessage(""); try { const r=await fetch("/api/admin/openai-ops",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"test"})}); const p=await r.json(); if(!r.ok||!p.ok) throw new Error(p.message||"연결 테스트 실패"); setMessage(p.message); await load(); } catch(e){ setMessage(e instanceof Error?e.message:"연결 테스트 실패"); } finally { setTesting(false); } };

  const s=data?.setting; const c=data?.connection; const costs=data?.costs; const budget=Number(s?.monthly_budget_usd??20); const percent=Number(costs?.usagePercent??0); const status=costs?.blocked?"자동 차단":percent>=80?"주의":percent>=50?"관찰":"정상";
  return <main className="min-h-screen bg-[#f7f4f4] p-5 text-[#382d2d] sm:p-8"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[.18em] text-[#b97b88]">LAYAD ADMIN · AI OPERATIONS</p><h1 className="mt-2 text-3xl font-semibold">OpenAI 운영 · 비용 Control Tower</h1><p className="mt-3 text-sm text-[#7b6d70]">월 한도를 초과하지 않도록 자동 차단하며, 오너가 한도를 상향하면 자동 분석이 다시 실행됩니다.</p></div><button onClick={test} disabled={testing} className="rounded-full bg-[#382d2d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{testing?"테스트 중":"OpenAI 연결 테스트"}</button></div>
    {message?<div className="mt-5 rounded-2xl border border-[#e4cfd4] bg-white px-5 py-4 text-sm font-semibold text-[#8d5260]">{message}</div>:null}
    {!data?.ok&&!loading?<div className="mt-5 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">{data?.message}</div>:null}

    <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><Card title="오늘" value={money(costs?.todayCost)}/><Card title="최근 7일" value={money(costs?.recent7)}/><Card title="이번 달 누적" value={money(costs?.monthCost)}/><Card title="월 운영 한도" value={money(budget)} sub={s?.mode?.toUpperCase()}/><Card title="잔여 예산" value={money(costs?.remaining??budget)}/><Card title="월말 예상" value={money(costs?.forecast)} sub={`상태 · ${status}`}/></section>

    <section className={`mt-6 rounded-3xl border p-6 shadow-sm ${costs?.blocked?"border-red-300 bg-red-50":"border-[#eadfe1] bg-white"}`}><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">예산 사용률 · 자동 차단</h2><p className="mt-1 text-sm text-[#7b6d70]">50% 관찰 · 80% 주의 · 100% 도달 즉시 AI 자동 분석 차단</p></div><div className="text-right"><p className="text-3xl font-semibold text-[#a94f65]">{percent.toFixed(1)}%</p><p className="text-xs text-[#8d7f82]">{money(costs?.monthCost)} / {money(budget)}</p></div></div><div className="mt-5 h-4 overflow-hidden rounded-full bg-[#f4e8ea]"><div className="h-full rounded-full bg-[#a94f65]" style={{width:`${Math.min(100,percent)}%`}}/></div>{costs?.blocked?<p className="mt-4 text-sm font-semibold text-red-700">현재 자동 차단 상태입니다. 월 한도를 상향하면 별도 해제 버튼 없이 자동으로 재개됩니다.</p>:null}</section>

    <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">OpenAI Usage Trend</h2><p className="mt-1 text-sm text-[#7b6d70]">일간 · 주간 · 월간 비용 추세</p></div><div className="flex rounded-xl bg-[#f5ecee] p-1">{(["daily","weekly","monthly"] as Trend[]).map(t=><button key={t} onClick={()=>setTrend(t)} className={`rounded-lg px-4 py-2 text-xs font-semibold ${trend===t?"bg-white text-[#a94f65] shadow-sm":"text-[#7b6d70]"}`}>{t==="daily"?"일간":t==="weekly"?"주간":"월간"}</button>)}</div></div><div className="mt-5"><TrendChart points={costs?.points??[]} trend={trend}/></div><p className="mt-3 text-xs text-[#8d7f82]">{costs?.message}</p></article>
    <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">OpenAI 연결 상태</h2><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-[#7b6d70]">분석 API Key</dt><dd className="font-semibold">{c?.apiKeyConfigured?"설정됨":"미설정"}</dd></div><div className="flex justify-between"><dt className="text-[#7b6d70]">Admin Key</dt><dd className="font-semibold">{c?.adminKeyConfigured?"설정됨":"미설정"}</dd></div><div className="flex justify-between"><dt className="text-[#7b6d70]">Project ID</dt><dd className="font-semibold">{c?.projectIdConfigured?"설정됨":"미설정"}</dd></div><div className="flex justify-between"><dt className="text-[#7b6d70]">모델</dt><dd className="font-semibold">{c?.model??"-"}</dd></div><div className="flex justify-between"><dt className="text-[#7b6d70]">자동 Cost Guard</dt><dd className="font-semibold">{c?.costGuardReady?"준비됨":"설정 필요"}</dd></div></dl></article></section>

    <section className="mt-6 rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><div><h2 className="text-lg font-semibold">AI 월 운영 한도</h2><p className="mt-1 text-sm text-[#7b6d70]">자동 차단은 필수 정책이며 오너는 한도 금액만 조정합니다.</p></div><div className="mt-5 grid gap-3 md:grid-cols-4">{modes.map(item=><button key={item.id} onClick={()=>{setMode(item.id);if(item.budget)setCustomBudget(String(item.budget));}} className={`rounded-2xl border p-4 text-left ${mode===item.id?"border-[#a94f65] bg-[#fff0f3]":"border-[#eadfe1]"}`}><p className="font-semibold">{item.label}{item.budget?` · $${item.budget}`:""}</p><p className="mt-1 text-xs text-[#7b6d70]">{item.description}</p></button>)}</div>{mode==="custom"?<label className="mt-5 block max-w-xs text-sm"><span className="font-semibold">월 한도 USD</span><input value={customBudget} onChange={e=>setCustomBudget(e.target.value)} type="number" min="1" max="10000" className="mt-2 w-full rounded-xl border border-[#d9cfd1] px-4 py-3"/></label>:null}<div className="mt-5 rounded-2xl border border-[#e6cbd1] bg-[#fff5f6] p-4"><p className="text-sm font-semibold text-[#9c5363]">자동 차단 정책 · 고정</p><p className="mt-1 text-xs leading-5 text-[#7b6d70]">월 사용액이 설정 한도에 도달하면 새 OpenAI 분석 요청을 서버에서 차단합니다. 해제 스위치는 제공하지 않습니다. 오너가 월 한도를 상향하면 다음 요청부터 자동으로 재개됩니다.</p></div><button onClick={save} disabled={saving} className="mt-5 rounded-xl bg-[#a94f65] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?"저장 중":"운영 한도 저장"}</button></section>

    <section className="mt-6 grid gap-5 md:grid-cols-2"><article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">분석 운영 방식</h2><p className="mt-4 text-sm leading-6 text-[#7b6d70]">OpenAI 초안 + Web Search + 운영자 검수 후 공개</p></article><article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">관리자 보안</h2><p className="mt-4 text-sm leading-6 text-[#7b6d70]">관리자 인증은 별도 추가 개발 항목입니다. 외부 공개 전에 Supabase Auth와 관리자 허용 목록을 적용해야 합니다.</p></article></section>
  </div></main>;
}
