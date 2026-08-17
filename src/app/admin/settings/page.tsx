"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "pilot" | "standard" | "growth" | "custom";
type CostPoint = { date: string; cost: number };
type OpsData = {
  ok: boolean;
  message?: string;
  setting?: {
    mode: Mode;
    monthly_budget_usd: number;
    warning_low_percent: number;
    warning_high_percent: number;
    hard_stop_enabled: boolean;
    updated_at: string;
  };
  connection?: {
    apiKeyConfigured: boolean;
    adminKeyConfigured: boolean;
    projectIdConfigured: boolean;
    model: string;
    costGuardReady: boolean;
  };
  costs?: {
    points: CostPoint[];
    todayCost: number;
    recent7: number;
    monthCost: number;
    remaining: number;
    usagePercent: number;
    forecast: number;
    message: string;
  };
};

type Trend = "daily" | "weekly" | "monthly";

const modes: Array<{ id: Mode; label: string; budget?: number; description: string }> = [
  { id: "pilot", label: "Pilot", budget: 20, description: "초기 운영 · 최소 비용" },
  { id: "standard", label: "Standard", budget: 50, description: "사용 증가 단계" },
  { id: "growth", label: "Growth", budget: 100, description: "확장 운영 단계" },
  { id: "custom", label: "Custom", description: "직접 한도 입력" },
];

const money = (value = 0) => `$${value.toFixed(2)}`;

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return <article className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm"><p className="text-xs text-[#78696c]">{title}</p><p className="mt-2 text-2xl font-semibold text-[#382d2d]">{value}</p>{sub ? <p className="mt-1 text-xs text-[#8d7f82]">{sub}</p> : null}</article>;
}

function aggregate(points: CostPoint[], trend: Trend) {
  if (trend === "daily") return points.slice(-30).map(point => ({ label: point.date.slice(5), value: point.cost }));
  const groups = new Map<string, number>();
  if (trend === "weekly") {
    for (const point of points.slice(-84)) {
      const date = new Date(`${point.date}T00:00:00Z`);
      const day = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() - day + 1);
      const key = date.toISOString().slice(5, 10);
      groups.set(key, (groups.get(key) ?? 0) + point.cost);
    }
    return [...groups.entries()].map(([label, value]) => ({ label, value }));
  }
  for (const point of points) {
    const key = point.date.slice(0, 7);
    groups.set(key, (groups.get(key) ?? 0) + point.cost);
  }
  return [...groups.entries()].slice(-6).map(([label, value]) => ({ label, value }));
}

function TrendChart({ points, trend }: { points: CostPoint[]; trend: Trend }) {
  const values = useMemo(() => aggregate(points, trend), [points, trend]);
  const max = Math.max(...values.map(item => item.value), 0.01);
  if (!values.length) return <div className="flex h-64 items-center justify-center rounded-2xl bg-[#fbf7f7] text-sm text-[#8d7f82]">비용 데이터 연결 후 추세가 표시됩니다.</div>;

  const width = 900;
  const height = 260;
  const padX = 36;
  const padY = 28;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const step = values.length > 1 ? innerW / (values.length - 1) : innerW;
  const coords = values.map((item, index) => ({
    ...item,
    x: padX + index * step,
    y: padY + innerH - (item.value / max) * innerH,
  }));
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  return <div className="overflow-x-auto rounded-2xl bg-[#fbf7f7] p-3">
    <svg viewBox={`0 0 ${width} ${height}`} className="h-64 min-w-[700px] w-full" role="img" aria-label="OpenAI 비용 사용 추세">
      {[0, .25, .5, .75, 1].map(ratio => <line key={ratio} x1={padX} x2={width - padX} y1={padY + innerH * ratio} y2={padY + innerH * ratio} stroke="#eadfe1" strokeWidth="1" />)}
      <path d={path} fill="none" stroke="#a94f65" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((point, index) => <g key={`${point.label}-${index}`}>
        <circle cx={point.x} cy={point.y} r="5" fill="#a94f65" />
        {(values.length <= 12 || index % Math.ceil(values.length / 8) === 0 || index === values.length - 1) ? <text x={point.x} y={height - 7} textAnchor="middle" fontSize="11" fill="#8d7f82">{point.label}</text> : null}
      </g>)}
    </svg>
  </div>;
}

export default function Page() {
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<Mode>("pilot");
  const [customBudget, setCustomBudget] = useState("20");
  const [hardStop, setHardStop] = useState(true);
  const [trend, setTrend] = useState<Trend>("daily");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/openai-ops", { cache: "no-store" });
      const payload = await response.json() as OpsData;
      setData(payload);
      if (payload.setting) {
        setMode(payload.setting.mode);
        setCustomBudget(String(payload.setting.monthly_budget_usd));
        setHardStop(payload.setting.hard_stop_enabled);
      }
    } catch {
      setData({ ok: false, message: "OpenAI 운영정보 API 연결 실패" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/openai-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", mode, monthlyBudgetUsd: Number(customBudget), hardStopEnabled: hardStop }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "저장 실패");
      setMessage("AI 운영 한도를 저장했습니다.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "저장 실패"); }
    finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true); setMessage("");
    try {
      const response = await fetch("/api/admin/openai-ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "연결 테스트 실패");
      setMessage(payload.message);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "연결 테스트 실패"); }
    finally { setTesting(false); }
  };

  const setting = data?.setting;
  const connection = data?.connection;
  const costs = data?.costs;
  const budget = Number(setting?.monthly_budget_usd ?? 20);
  const percent = Number(costs?.usagePercent ?? 0);
  const status = percent >= 100 ? "한도 도달" : percent >= Number(setting?.warning_high_percent ?? 80) ? "주의" : percent >= Number(setting?.warning_low_percent ?? 50) ? "관찰" : "정상";

  return <main className="min-h-screen bg-[#f7f4f4] p-5 text-[#382d2d] sm:p-8">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold tracking-[.18em] text-[#b97b88]">LAYAD ADMIN · AI OPERATIONS</p><h1 className="mt-2 text-3xl font-semibold">OpenAI 운영 · 비용 Control Tower</h1><p className="mt-3 text-sm text-[#7b6d70]">작게 시작하고 사용량을 확인하며 단계적으로 확장합니다. API Key는 화면에 표시하거나 저장하지 않습니다.</p></div>
        <button onClick={test} disabled={testing} className="rounded-full bg-[#382d2d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{testing ? "테스트 중" : "OpenAI 연결 테스트"}</button>
      </div>

      {message ? <div className="mt-5 rounded-2xl border border-[#e4cfd4] bg-white px-5 py-4 text-sm font-semibold text-[#8d5260]">{message}</div> : null}
      {!data?.ok && !loading ? <div className="mt-5 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">{data?.message ?? "운영 정보를 불러오지 못했습니다."}</div> : null}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card title="오늘" value={money(costs?.todayCost)} />
        <Card title="최근 7일" value={money(costs?.recent7)} />
        <Card title="이번 달 누적" value={money(costs?.monthCost)} />
        <Card title="월 운영 한도" value={money(budget)} sub={setting?.mode?.toUpperCase()} />
        <Card title="잔여 예산" value={money(costs?.remaining ?? budget)} />
        <Card title="월말 예상" value={money(costs?.forecast)} sub={`상태 · ${status}`} />
      </section>

      <section className="mt-6 rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">예산 사용률</h2><p className="mt-1 text-sm text-[#7b6d70]">50% 관찰 · 80% 주의 · 100% LAYAD 자동 분석 차단</p></div><div className="text-right"><p className="text-3xl font-semibold text-[#a94f65]">{percent.toFixed(1)}%</p><p className="text-xs text-[#8d7f82]">{money(costs?.monthCost)} / {money(budget)}</p></div></div>
        <div className="mt-5 h-4 overflow-hidden rounded-full bg-[#f4e8ea]"><div className="h-full rounded-full bg-[#a94f65] transition-all" style={{ width: `${Math.min(100, percent)}%` }} /></div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">OpenAI Usage Trend</h2><p className="mt-1 text-sm text-[#7b6d70]">실제 프로젝트 비용을 일간·주간·월간으로 비교합니다.</p></div><div className="flex rounded-xl bg-[#f5ecee] p-1">{(["daily", "weekly", "monthly"] as Trend[]).map(item => <button key={item} onClick={() => setTrend(item)} className={`rounded-lg px-4 py-2 text-xs font-semibold ${trend === item ? "bg-white text-[#a94f65] shadow-sm" : "text-[#7b6d70]"}`}>{item === "daily" ? "일간" : item === "weekly" ? "주간" : "월간"}</button>)}</div></div>
          <div className="mt-5"><TrendChart points={costs?.points ?? []} trend={trend} /></div>
          <p className="mt-3 text-xs leading-5 text-[#8d7f82]">{costs?.message}</p>
        </article>

        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">OpenAI 연결 상태</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-[#7b6d70]">분석 API Key</dt><dd className={`font-semibold ${connection?.apiKeyConfigured ? "text-emerald-700" : "text-amber-700"}`}>{connection?.apiKeyConfigured ? "설정됨" : "미설정"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#7b6d70]">Admin Key</dt><dd className={`font-semibold ${connection?.adminKeyConfigured ? "text-emerald-700" : "text-amber-700"}`}>{connection?.adminKeyConfigured ? "설정됨" : "미설정"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#7b6d70]">Project ID</dt><dd className={`font-semibold ${connection?.projectIdConfigured ? "text-emerald-700" : "text-amber-700"}`}>{connection?.projectIdConfigured ? "설정됨" : "미설정"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#7b6d70]">사용 모델</dt><dd className="font-semibold">{connection?.model ?? "-"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#7b6d70]">Cost Guard</dt><dd className={`font-semibold ${connection?.costGuardReady ? "text-emerald-700" : "text-amber-700"}`}>{connection?.costGuardReady ? "준비됨" : "설정 필요"}</dd></div>
          </dl>
        </article>
      </section>

      <section className="mt-6 rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
        <div><h2 className="text-lg font-semibold">AI 운영 한도</h2><p className="mt-1 text-sm text-[#7b6d70]">오너가 서비스 성장 단계에 따라 월 한도를 선택합니다.</p></div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">{modes.map(item => <button key={item.id} onClick={() => { setMode(item.id); if (item.budget) setCustomBudget(String(item.budget)); }} className={`rounded-2xl border p-4 text-left ${mode === item.id ? "border-[#a94f65] bg-[#fff0f3] ring-2 ring-[#a94f65]/10" : "border-[#eadfe1] bg-white"}`}><p className="font-semibold">{item.label}{item.budget ? ` · $${item.budget}` : ""}</p><p className="mt-1 text-xs text-[#7b6d70]">{item.description}</p></button>)}</div>
        {mode === "custom" ? <label className="mt-5 block max-w-xs text-sm"><span className="font-semibold">월 한도 USD</span><input value={customBudget} onChange={event => setCustomBudget(event.target.value)} type="number" min="1" max="10000" step="1" className="mt-2 w-full rounded-xl border border-[#d9cfd1] bg-white px-4 py-3 outline-none focus:border-[#a94f65]" /></label> : null}
        <label className="mt-5 flex items-start gap-3 rounded-2xl bg-[#fbf7f7] p-4"><input type="checkbox" checked={hardStop} onChange={event => setHardStop(event.target.checked)} className="mt-1 h-4 w-4" /><span><b className="text-sm">100% 도달 시 AI 자동 분석 차단</b><span className="mt-1 block text-xs leading-5 text-[#7b6d70]">OpenAI 프로젝트 예산은 경고용이므로 LAYAD가 자체적으로 자동 분석 요청을 차단하고 수동 운영으로 전환합니다.</span></span></label>
        <div className="mt-5 flex flex-wrap items-center gap-3"><button onClick={save} disabled={saving} className="rounded-xl bg-[#a94f65] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "저장 중" : "운영 한도 저장"}</button><span className="text-xs text-[#8d7f82]">기본 시작값: Pilot · 월 $20</span></div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">분석 운영 방식</h2><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">분석 방식</dt><dd className="font-semibold">OpenAI 초안 + 운영자 검수</dd></div><div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">Web Search</dt><dd className="font-semibold">사용</dd></div><div className="flex justify-between gap-4"><dt className="text-[#7b6d70]">결과 공개</dt><dd className="font-semibold">운영자 승인 후 공개</dd></div></dl></article>
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">관리자 보안</h2><p className="mt-4 text-sm leading-6 text-[#7b6d70]">현재 관리자 인증은 아직 적용되지 않았습니다. 외부 공개 전에 Supabase Auth와 관리자 허용 목록을 적용해야 합니다.</p><span className="mt-5 inline-block rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">추가 개발 필요</span></article>
      </section>
    </div>
  </main>;
}
