"use client";

import { useEffect, useState } from "react";

type Metric = { key: string; label: string; value: number; unit: string; limit: number; percent: number; basis: string };
type Capacity = {
  ok: boolean;
  metrics?: Metric[];
  upgradeNotice?: { level: string; title: string; message: string };
  refreshedAt?: string;
};

export default function SupabaseCapacity() {
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    const load = async () => {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      try {
        const response = await fetch("/api/admin/capacity", { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as Capacity;
        if (!response.ok || !payload.ok || !payload.upgradeNotice) throw new Error("Capacity unavailable");
        if (!controller.signal.aborted) { setCapacity(payload); setFailed(false); }
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally { inFlight = false; }
    };
    void load();
    const timer = window.setInterval(() => void load(), 300000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);

  const notice = capacity?.upgradeNotice;
  const theme = failed ? "border-amber-300 bg-amber-50 text-amber-900"
    : notice?.level === "limit" || notice?.level === "urgent" ? "border-red-300 bg-red-50 text-red-900"
    : notice?.level === "warning" ? "border-amber-300 bg-amber-50 text-amber-900"
    : "border-emerald-200 bg-emerald-50 text-emerald-900";
  const metrics = (capacity?.metrics ?? []).filter(metric => metric.key.startsWith("supabase_"));

  return <section className="mt-6 rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="supabase-capacity-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="supabase-capacity-heading" className="text-lg font-semibold">Supabase 무료 한도 · 유료 전환 알림</h2><p className="mt-1 text-xs text-[#7b6d70]">80% 전환 검토 · 90% 전환 준비 · 100% 한도 도달</p></div>
      <a href="https://supabase.com/dashboard/project/mbunlzldwpjgichedzfa" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[#dfd2d5] px-4 py-2 text-sm font-semibold">Supabase 사용량 확인 ↗</a>
    </div>
    <div role="status" aria-live="polite" className={`mt-4 rounded-2xl border p-4 ${theme}`}>
      <p className="font-semibold">{failed ? "Supabase 사용량 확인 필요" : notice?.title ?? "Supabase 사용량 확인 중"}</p>
      <p className="mt-2 text-sm leading-6">{failed ? "최신 사용량을 불러오지 못했습니다. 아래 값이 있으면 마지막 조회 결과입니다. Supabase 대시보드에서 현재 사용량을 확인하세요." : notice?.message ?? "현재 DB와 파일 저장량을 확인하고 있습니다."}</p>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      {metrics.map(metric => {
        const projected = metric.basis === "projection";
        const warning = metric.percent >= 80;
        return <article key={metric.key} className={`rounded-2xl border p-4 ${warning ? "border-amber-300 bg-amber-50" : "border-[#eadfe1] bg-[#fcfbfb]"}`}>
          <p className="text-sm font-semibold">{metric.key === "supabase_db" ? "데이터베이스" : metric.key === "supabase_storage" ? "파일 저장소" : "월간 전송량 예상"}</p>
          <p className="mt-1 text-xs text-[#7b6d70]">{projected ? "방문 추세 기반 추정 · 실측 아님" : "현재 실측값"}</p>
          <p className="mt-3 text-2xl font-semibold">{metric.percent.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-[#7b6d70]">{metric.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })} / {metric.limit.toLocaleString("ko-KR")} {metric.unit}</p>
          <div role="progressbar" aria-label={metric.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, metric.percent)} aria-valuetext={`${metric.percent}%${projected ? " 예상" : ""}`} className="mt-3 h-2 overflow-hidden rounded-full bg-[#eee7e8]"><div className={`h-full rounded-full ${warning ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, metric.percent)}%` }} /></div>
          {projected && warning ? <p className="mt-3 text-xs font-semibold text-amber-900">전송량 예상이 무료 한도의 80% 이상입니다. 실제 월간 사용량을 확인한 뒤 유료 전환을 검토하세요.</p> : null}
        </article>;
      })}
    </div>
    <p className="mt-4 text-xs leading-5 text-[#7b6d70]">전송량은 최근 5일 방문 기록과 방문당 100KB 가정으로 계산합니다. 정확한 월간 전송량·인증·Realtime 등 다른 한도는 Supabase 대시보드에서 확인하세요. 알림만 제공하며 요금제를 자동 변경하지 않습니다.</p>
    <p className="mt-2 text-xs text-[#8d7f82]">5분 자동 갱신{capacity?.refreshedAt ? ` · 마지막 조회 ${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(capacity.refreshedAt))} KST` : ""}</p>
  </section>;
}
