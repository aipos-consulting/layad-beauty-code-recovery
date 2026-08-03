"use client";

import { useEffect, useMemo, useState } from "react";

type Section = "dashboard" | "statistics" | "requests" | "analysis" | "products" | "results" | "settings";
type StatRow = { key?: string; code?: string; label: string; count: number; topCode: string };
type DashboardData = {
  ok: boolean;
  code?: string;
  message?: string;
  kpis?: { totalUsers: number; testCompleted: number; manualSelected: number; productRequests: number; requestedProducts: number; completedProducts: number };
  typeStats?: Array<{ code: string; count: number }>;
  axes?: Record<"O" | "D" | "G" | "M" | "P" | "C" | "V" | "E", number>;
  sourceRatio?: { test: number; manual: number };
  ageStats?: StatRow[];
  countryStats?: StatRow[];
  regionStats?: StatRow[];
  statusCounts?: Record<string, number>;
  topProducts?: Array<{ name: string; count: number; uniqueSessions: number; topCode: string; status: string }>;
  recentRequests?: Array<{ id: string; value: string; inputType: "name" | "url"; status: string; createdAt: string; beautyCode: string }>;
};

const menu: Array<{ id: Section; label: string; description: string }> = [
  { id: "dashboard", label: "대시보드", description: "사용자 유형조회와 상품 신청 현황을 한눈에 확인합니다." },
  { id: "statistics", label: "사용자 통계 상세", description: "Beauty Code, 연령대, 국가·지역별 사용자 분포를 확인합니다." },
  { id: "requests", label: "상품 신청 정보", description: "사용자가 신청한 상품명과 상품 링크, 처리 상태를 확인합니다." },
  { id: "analysis", label: "분석 작업", description: "ChatGPT를 활용한 상품 분석 진행 상황을 관리합니다." },
  { id: "products", label: "상품 관리", description: "중복 신청을 정리하고 정식 상품 정보를 관리합니다." },
  { id: "results", label: "적합도 결과", description: "상품별 16유형 적합도 결과를 입력하고 검수합니다." },
  { id: "settings", label: "운영 설정", description: "관리자 접근과 데이터 운영 기준을 설정합니다." },
];

const statusLabel: Record<string, string> = {
  submitted: "신청 접수", collecting_reviews: "상품 확인", insufficient_reviews: "분석 불가",
  analyzing: "분석 중", completed: "분석 완료", failed: "처리 실패",
};

const axisPairs = [
  ["O", "지성형", "D", "건성형"], ["G", "글로우 선호", "M", "매트함 추구"],
  ["P", "정교함 추구", "C", "간편함 추구"], ["V", "변동형", "E", "일관형"],
] as const;

const codes = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"];

function percent(a: number, b: number) { const t = a + b; return t ? Math.round((a / t) * 100) : 0; }
function dateText(value: string) { return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function Card({ title, value, note }: { title: string; value: number | string; note?: string }) { return <article className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm"><p className="text-xs text-[#78696c]">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p>{note ? <p className="mt-1 text-xs text-[#9a888c]">{note}</p> : null}</article>; }

export default function AdminPage() {
  const [section, setSection] = useState<Section>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, number>>(() => Object.fromEntries(codes.map((code) => [code, 0])));

  useEffect(() => {
    fetch("/api/admin/dashboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload: DashboardData) => setData(payload))
      .catch(() => setData({ ok: false, code: "NETWORK_ERROR", message: "관리자 통계 API에 연결할 수 없습니다." }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const current = menu.find((item) => item.id === section) ?? menu[0];
  const typeStats = data?.typeStats ?? [];
  const totalUsers = data?.kpis?.totalUsers ?? 0;
  const maxType = Math.max(1, ...typeStats.map((x) => x.count));
  const products = data?.topProducts ?? [];
  const requests = data?.recentRequests ?? [];
  const workColumns = useMemo(() => [["submitted","신청 접수"],["collecting_reviews","상품 확인"],["analyzing","분석 중"],["completed","완료"]] as const, []);

  const selectSection = (id: Section) => { setSection(id); setMobileOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const renderTypeGrid = () => <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{typeStats.map((item) => <div key={item.code} className="rounded-2xl border border-[#eadfe1] bg-[#fffafa] p-4"><div className="flex justify-between"><b>{item.code}</b><span className="text-xs text-[#8b7b7e]">{item.count}명</span></div><p className="mt-2 text-xs text-[#8b7b7e]">{totalUsers ? ((item.count / totalUsers) * 100).toFixed(1) : "0.0"}%</p><div className="mt-3 h-1.5 rounded-full bg-[#f0e4e6]"><div className="h-full rounded-full bg-[#d88c9c]" style={{ width: `${(item.count / maxType) * 100}%` }} /></div></div>)}</div>;

  const renderDashboard = () => <div className="space-y-7">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Card title="전체 유형조회" value={data?.kpis?.totalUsers ?? 0}/><Card title="20문항 테스트 완료" value={data?.kpis?.testCompleted ?? 0}/><Card title="Beauty Code 직접 선택" value={data?.kpis?.manualSelected ?? 0}/><Card title="상품 신청" value={data?.kpis?.productRequests ?? 0}/><Card title="신청 상품" value={data?.kpis?.requestedProducts ?? 0}/><Card title="분석 완료" value={data?.kpis?.completedProducts ?? 0}/></section>
    <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]"><article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">16유형 신청 현황</h3>{renderTypeGrid()}</article><article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">4축 분포</h3><div className="mt-5 space-y-5">{axisPairs.map(([a,al,b,bl]) => { const p = percent(data?.axes?.[a] ?? 0, data?.axes?.[b] ?? 0); return <div key={a}><div className="flex justify-between text-xs"><span>{a} {al} {p}%</span><span>{b} {bl} {100-p}%</span></div><div className="mt-2 flex h-3 overflow-hidden rounded-full"><div className="bg-[#d88c9c]" style={{ width: `${p}%` }}/><div className="flex-1 bg-[#9f8b8f]"/></div></div>; })}</div></article></section>
    <section className="grid gap-6 xl:grid-cols-2"><ProductList products={products}/><RequestTable requests={requests}/></section>
  </div>;

  const renderStatistics = () => <div className="space-y-7">
    <section className="grid gap-3 sm:grid-cols-3"><Card title="전체 유형조회" value={totalUsers}/><Card title="20문항 테스트" value={`${data?.sourceRatio?.test ?? 0}%`}/><Card title="직접 선택" value={`${data?.sourceRatio?.manual ?? 0}%`}/></section>
    <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">16유형 상세 분포</h3>{renderTypeGrid()}</section>
    <section className="grid gap-6 xl:grid-cols-2"><StatList title="연령대 상세" rows={data?.ageStats ?? []}/><StatList title="국가 상세" rows={data?.countryStats ?? []}/></section>
    <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">대한민국 지역 상세</h3><p className="mt-2 text-sm text-[#78696c]">원 IP는 표시하지 않고 광역 지역 코드만 집계합니다.</p><StatBars rows={data?.regionStats ?? []}/></section>
  </div>;

  const renderRequests = () => <div className="space-y-7"><section className="grid gap-3 sm:grid-cols-3"><Card title="상품 신청" value={data?.kpis?.productRequests ?? 0}/><Card title="신청 상품" value={data?.kpis?.requestedProducts ?? 0}/><Card title="분석 완료" value={data?.kpis?.completedProducts ?? 0}/></section><section className="grid gap-6 xl:grid-cols-2"><ProductList products={products}/><StatusSummary counts={data?.statusCounts ?? {}}/></section><RequestTable requests={requests}/></div>;
  const renderAnalysis = () => <div className="grid gap-5 xl:grid-cols-4">{workColumns.map(([status,label]) => <section key={status} className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm"><div className="flex justify-between"><h3 className="font-semibold">{label}</h3><span className="rounded-full bg-[#f4e8ea] px-2 py-1 text-xs">{data?.statusCounts?.[status] ?? 0}</span></div><div className="mt-4 space-y-3">{requests.filter(r => r.status === status).map(r => <div key={r.id} className="rounded-2xl border border-[#eee5e7] p-4"><p className="font-medium">{r.value}</p><p className="mt-1 text-xs text-[#7d6f72]">{r.beautyCode} · {dateText(r.createdAt)}</p><button className="mt-3 w-full rounded-xl bg-[#382d2d] px-3 py-2 text-xs font-semibold text-white">작업 열기</button></div>)}{!requests.some(r => r.status === status) ? <p className="text-sm text-[#8c7c7f]">대기 작업 없음</p> : null}</div></section>)}</div>;
  const renderProducts = () => <div className="space-y-6"><section className="grid gap-3 sm:grid-cols-3"><Card title="등록 상품" value={data?.kpis?.requestedProducts ?? 0}/><Card title="분석 완료" value={data?.kpis?.completedProducts ?? 0}/><Card title="중복 확인 필요" value={0}/></section><ProductList products={products} detailed/></div>;
  const renderResults = () => <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">16유형 적합도 입력</h3><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{codes.map(code => <label key={code} className="rounded-2xl border border-[#eadfe1] bg-[#fffafa] p-4"><span className="text-sm font-semibold">{code}</span><input type="number" min={0} max={100} value={scores[code]} onChange={e => setScores({...scores,[code]:Math.max(0,Math.min(100,Number(e.target.value)))})} className="mt-2 w-full rounded-xl border border-[#dfd1d4] bg-white px-3 py-2"/></label>)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><textarea placeholder="분석 요약" className="min-h-28 rounded-2xl border border-[#dfd1d4] p-4"/><textarea placeholder="분석 근거 및 주의사항" className="min-h-28 rounded-2xl border border-[#dfd1d4] p-4"/></div><button className="mt-5 rounded-xl bg-[#382d2d] px-5 py-3 font-semibold text-white">임시 저장</button></section>;
  const renderSettings = () => <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-3xl border border-[#eadfe1] bg-white p-6"><h3 className="font-semibold">운영 방식</h3><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-[#8a797d]">AI 분석</dt><dd className="font-medium">ChatGPT Plus 수동 분석</dd></div><div><dt className="text-[#8a797d]">OpenAI API</dt><dd className="font-medium">사용하지 않음</dd></div><div><dt className="text-[#8a797d]">데이터베이스</dt><dd className="font-medium">Supabase</dd></div></dl></section><section className="rounded-3xl border border-[#eadfe1] bg-white p-6"><h3 className="font-semibold">보안 상태</h3><p className="mt-4 text-sm leading-6 text-[#78696c]">현재는 관리자 인증이 없는 프로토타입입니다. 지인 공개 전에 관리자 로그인을 추가해야 합니다.</p></section></div>;

  const body = section === "dashboard" ? renderDashboard() : section === "statistics" ? renderStatistics() : section === "requests" ? renderRequests() : section === "analysis" ? renderAnalysis() : section === "products" ? renderProducts() : section === "results" ? renderResults() : renderSettings();

  return <main className="min-h-screen bg-[#f7f4f4] text-[#382d2d]"><div className="mx-auto flex min-h-screen max-w-[1600px]">
    <aside className="hidden w-64 shrink-0 bg-[#2f2829] px-5 py-7 text-white lg:block"><button onClick={() => selectSection("dashboard")} className="text-left"><div className="text-2xl font-bold tracking-[0.2em] text-white">LAYAD</div><p className="mt-2 text-sm text-[#e6b8c2]">관리자 화면</p></button><nav className="mt-8 space-y-2">{menu.map(item => <button key={item.id} onClick={() => selectSection(item.id)} className={`block w-full rounded-xl px-4 py-3 text-left text-sm ${section === item.id ? "bg-[#d88c9c] font-semibold" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>{item.label}</button>)}</nav></aside>
    <section className="min-w-0 flex-1"><header className="sticky top-0 z-30 border-b border-[#eadfe1] bg-white/95 px-5 py-4 backdrop-blur sm:px-8"><div className="flex items-center justify-between"><button onClick={() => selectSection("dashboard")} className="lg:hidden"><div className="text-xl font-bold tracking-[0.16em]">LAYAD</div><p className="text-xs text-[#b97b88]">관리자 화면</p></button><div className="hidden lg:block"><h1 className="text-xl font-semibold">{current.label}</h1><p className="mt-1 text-sm text-[#7b6d70]">{current.description}</p></div><button onClick={() => setMobileOpen(true)} aria-label="관리자 메뉴 열기" className="rounded-xl border border-[#dfd1d4] px-3 py-2 text-xl lg:hidden">☰</button></div><div className="mt-3 lg:hidden"><h1 className="text-lg font-semibold">{current.label}</h1><p className="mt-1 text-sm text-[#7b6d70]">{current.description}</p></div></header>
      {!loading && !data?.ok ? <div className="m-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{data?.message ?? "관리자 통계를 불러오지 못했습니다."}</div> : null}
      <div className="p-5 sm:p-8">{body}</div>
    </section>
  </div>
  {mobileOpen ? <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true"><button aria-label="메뉴 닫기" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)}/><aside className="absolute right-0 top-0 h-full w-[82%] max-w-sm overflow-y-auto bg-[#2f2829] p-5 text-white shadow-2xl"><div className="flex items-start justify-between"><div><div className="text-2xl font-bold tracking-[0.2em]">LAYAD</div><p className="mt-2 text-sm text-[#e6b8c2]">관리자 화면</p></div><button onClick={() => setMobileOpen(false)} className="rounded-xl border border-white/20 px-3 py-2 text-xl">×</button></div><nav className="mt-8 space-y-2">{menu.map(item => <button key={item.id} onClick={() => selectSection(item.id)} className={`block w-full rounded-xl px-4 py-4 text-left text-sm ${section === item.id ? "bg-[#d88c9c] font-semibold" : "text-white/80 hover:bg-white/10"}`}>{item.label}</button>)}</nav></aside></div> : null}
  </main>;
}

function StatList({ title, rows }: { title: string; rows: StatRow[] }) { return <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">{title}</h3><StatBars rows={rows}/></section>; }
function StatBars({ rows }: { rows: StatRow[] }) { const max = Math.max(1, ...rows.map(r => r.count)); return <div className="mt-5 space-y-3">{rows.map(r => <div key={`${r.code ?? r.key}-${r.label}`}><div className="flex justify-between text-sm"><span>{r.label}</span><span>{r.count}명 · 상위 {r.topCode}</span></div><div className="mt-2 h-2 rounded-full bg-[#f0e4e6]"><div className="h-full rounded-full bg-[#d88c9c]" style={{ width: `${(r.count / max) * 100}%` }}/></div></div>)}{!rows.length ? <p className="text-sm text-[#8c7c7f]">집계 데이터가 없습니다.</p> : null}</div>; }
function ProductList({ products, detailed=false }: { products: NonNullable<DashboardData["topProducts"]>; detailed?: boolean }) { return <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">{detailed ? "상품 관리 목록" : "신청 많은 상품"}</h3><div className="mt-5 space-y-3">{products.map(p => <div key={p.name} className="rounded-2xl border border-[#eee5e7] p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{p.name}</p><p className="mt-1 text-xs text-[#7d6f72]">신청 {p.count}건 · 고유 세션 {p.uniqueSessions} · 대표 {p.topCode}</p></div><span className="rounded-full bg-[#f4e8ea] px-3 py-1 text-xs">{statusLabel[p.status] ?? p.status}</span></div>{detailed ? <div className="mt-3 flex gap-2"><button className="rounded-xl border border-[#dfd1d4] px-3 py-2 text-xs">상품 정보</button><button className="rounded-xl bg-[#382d2d] px-3 py-2 text-xs text-white">분석 시작</button></div> : null}</div>)}{!products.length ? <p className="text-sm text-[#8c7c7f]">상품 신청 데이터가 없습니다.</p> : null}</div></section>; }
function RequestTable({ requests }: { requests: NonNullable<DashboardData["recentRequests"]> }) { return <section className="overflow-hidden rounded-3xl border border-[#eadfe1] bg-white shadow-sm"><div className="px-6 py-5"><h3 className="text-lg font-semibold">최근 상품 신청</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#faf7f7] text-xs"><tr><th className="px-6 py-3">상품</th><th className="px-6 py-3">입력</th><th className="px-6 py-3">유형</th><th className="px-6 py-3">상태</th><th className="px-6 py-3">신청일</th></tr></thead><tbody className="divide-y divide-[#eee5e7]">{requests.map(r => <tr key={r.id}><td className="px-6 py-4 font-medium">{r.value}</td><td className="px-6 py-4">{r.inputType === "url" ? "링크" : "상품명"}</td><td className="px-6 py-4">{r.beautyCode}</td><td className="px-6 py-4">{statusLabel[r.status] ?? r.status}</td><td className="px-6 py-4">{dateText(r.createdAt)}</td></tr>)}</tbody></table></div></section>; }
function StatusSummary({ counts }: { counts: Record<string, number> }) { return <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">처리 상태</h3><div className="mt-5 grid grid-cols-2 gap-3">{Object.entries(statusLabel).map(([key,label]) => <Card key={key} title={label} value={counts[key] ?? 0}/>)}</div></section>; }
