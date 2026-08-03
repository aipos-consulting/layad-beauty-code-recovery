"use client";

import { useEffect, useMemo, useState } from "react";

type Section = "dashboard" | "statistics" | "requests" | "analysis" | "products" | "results" | "settings";
type DashboardData = {
  ok: boolean;
  code?: string;
  message?: string;
  kpis?: {
    totalUsers: number;
    testCompleted: number;
    manualSelected: number;
    productRequests: number;
    requestedProducts: number;
    completedProducts: number;
  };
  typeStats?: Array<{ code: string; count: number }>;
  axes?: Record<"O" | "D" | "G" | "M" | "P" | "C" | "V" | "E", number>;
  sourceRatio?: { test: number; manual: number };
  statusCounts?: Record<string, number>;
  topProducts?: Array<{ name: string; count: number; uniqueSessions: number; topCode: string; status: string }>;
  recentRequests?: Array<{ id: string; value: string; inputType: "name" | "url"; status: string; createdAt: string; beautyCode: string }>;
};

const menu: Array<{ id: Section; label: string }> = [
  { id: "dashboard", label: "대시보드" },
  { id: "statistics", label: "사용자 통계 상세" },
  { id: "requests", label: "상품 신청 정보" },
  { id: "analysis", label: "분석 작업" },
  { id: "products", label: "상품 관리" },
  { id: "results", label: "적합도 결과" },
  { id: "settings", label: "운영 설정" },
];

const statusLabel: Record<string, string> = {
  submitted: "신청 접수",
  collecting_reviews: "상품 확인",
  insufficient_reviews: "분석 불가",
  analyzing: "분석 중",
  completed: "분석 완료",
  failed: "처리 실패",
};

const axisPairs = [
  ["O", "지성형", "D", "건성형"],
  ["G", "글로우 선호", "M", "매트함 추구"],
  ["P", "정교함 추구", "C", "간편함 추구"],
  ["V", "변동형", "E", "일관형"],
] as const;

const codes = [
  "OGPV", "OGPE", "OGCV", "OGCE", "OMPV", "OMPE", "OMCV", "OMCE",
  "DGPV", "DGPE", "DGCV", "DGCE", "DMPV", "DMPE", "DMCV", "DMCE",
];

function percent(a: number, b: number) {
  const total = a + b;
  return total ? Math.round((a / total) * 100) : 0;
}

function dateText(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function Card({ title, value, note }: { title: string; value: number | string; note?: string }) {
  return <article className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm"><p className="text-xs text-[#78696c]">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p>{note ? <p className="mt-1 text-xs text-[#9a888c]">{note}</p> : null}</article>;
}

export default function AdminPage() {
  const [section, setSection] = useState<Section>("dashboard");
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

  const typeStats = data?.typeStats ?? [];
  const totalUsers = data?.kpis?.totalUsers ?? 0;
  const maxType = Math.max(1, ...typeStats.map((x) => x.count));
  const title = menu.find((item) => item.id === section)?.label ?? "대시보드";
  const products = data?.topProducts ?? [];
  const requests = data?.recentRequests ?? [];

  const workColumns = useMemo(() => [
    ["submitted", "신청 접수"], ["collecting_reviews", "상품 확인"], ["analyzing", "분석 중"], ["completed", "완료"]
  ] as const, []);

  const renderDashboard = () => (
    <div className="space-y-7">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card title="전체 유형조회" value={data?.kpis?.totalUsers ?? 0} />
        <Card title="20문항 테스트 완료" value={data?.kpis?.testCompleted ?? 0} />
        <Card title="Beauty Code 직접 선택" value={data?.kpis?.manualSelected ?? 0} />
        <Card title="상품 신청" value={data?.kpis?.productRequests ?? 0} />
        <Card title="신청 상품" value={data?.kpis?.requestedProducts ?? 0} />
        <Card title="분석 완료" value={data?.kpis?.completedProducts ?? 0} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">16유형 신청 현황</h3>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {typeStats.map((item) => <div key={item.code} className="rounded-2xl border border-[#eadfe1] bg-[#fffafa] p-4"><div className="flex justify-between"><b>{item.code}</b><span className="text-xs text-[#8b7b7e]">{item.count}명</span></div><p className="mt-2 text-xs text-[#8b7b7e]">{totalUsers ? ((item.count / totalUsers) * 100).toFixed(1) : "0.0"}%</p><div className="mt-3 h-1.5 rounded-full bg-[#f0e4e6]"><div className="h-full rounded-full bg-[#d88c9c]" style={{ width: `${(item.count / maxType) * 100}%` }} /></div></div>)}
          </div>
        </article>
        <article className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">4축 분포</h3>
          <div className="mt-5 space-y-5">{axisPairs.map(([a, al, b, bl]) => { const p = percent(data?.axes?.[a] ?? 0, data?.axes?.[b] ?? 0); return <div key={a}><div className="flex justify-between text-xs"><span>{a} {al} {p}%</span><span>{b} {bl} {100-p}%</span></div><div className="mt-2 flex h-3 overflow-hidden rounded-full"><div className="bg-[#d88c9c]" style={{ width: `${p}%` }} /><div className="flex-1 bg-[#9f8b8f]" /></div></div>; })}</div>
        </article>
      </section>
      <section className="grid gap-6 xl:grid-cols-2"><ProductList products={products} /><RequestTable requests={requests} /></section>
    </div>
  );

  const renderStatistics = () => (
    <div className="space-y-7">
      <section className="grid gap-3 sm:grid-cols-3"><Card title="전체 유형조회" value={totalUsers} /><Card title="20문항 테스트" value={`${data?.sourceRatio?.test ?? 0}%`} /><Card title="직접 선택" value={`${data?.sourceRatio?.manual ?? 0}%`} /></section>
      <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">16유형 상세 분포</h3><div className="mt-5 space-y-3">{[...typeStats].sort((a,b)=>b.count-a.count).map((item, i)=><div key={item.code} className="grid grid-cols-[45px_70px_1fr_55px] items-center gap-3"><b>{i+1}위</b><span>{item.code}</span><div className="h-3 rounded-full bg-[#f0e4e6]"><div className="h-full rounded-full bg-[#d88c9c]" style={{width:`${(item.count/maxType)*100}%`}} /></div><span className="text-right">{item.count}</span></div>)}</div></section>
      <section className="grid gap-6 xl:grid-cols-2"><article className="rounded-3xl border border-[#eadfe1] bg-white p-6"><h3 className="font-semibold">연령대 상세</h3><p className="mt-3 text-sm text-[#78696c]">연령대별 유형 통계는 다음 DB 집계 API 확장에서 연결합니다.</p></article><article className="rounded-3xl border border-[#eadfe1] bg-white p-6"><h3 className="font-semibold">국가·지역 상세</h3><p className="mt-3 text-sm text-[#78696c]">IP에서 파생한 국가·지역 데이터만 사용하며 원 IP는 표시하지 않습니다.</p></article></section>
    </div>
  );

  const renderRequests = () => <div className="space-y-7"><section className="grid gap-3 sm:grid-cols-3"><Card title="상품 신청" value={data?.kpis?.productRequests ?? 0} /><Card title="신청 상품" value={data?.kpis?.requestedProducts ?? 0} /><Card title="분석 완료" value={data?.kpis?.completedProducts ?? 0} /></section><section className="grid gap-6 xl:grid-cols-2"><ProductList products={products} /><StatusSummary counts={data?.statusCounts ?? {}} /></section><RequestTable requests={requests} /></div>;

  const renderAnalysis = () => <div className="grid gap-5 xl:grid-cols-4">{workColumns.map(([status,label])=><section key={status} className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm"><div className="flex justify-between"><h3 className="font-semibold">{label}</h3><span className="rounded-full bg-[#f4e8ea] px-2 py-1 text-xs">{data?.statusCounts?.[status] ?? 0}</span></div><div className="mt-4 space-y-3">{requests.filter(r=>r.status===status).map(r=><div key={r.id} className="rounded-2xl border border-[#eee5e7] p-4"><p className="font-medium">{r.value}</p><p className="mt-1 text-xs text-[#7d6f72]">{r.beautyCode} · {dateText(r.createdAt)}</p><button className="mt-3 w-full rounded-xl bg-[#382d2d] px-3 py-2 text-xs font-semibold text-white">작업 열기</button></div>)}{!requests.some(r=>r.status===status)?<p className="text-sm text-[#8c7c7f]">대기 작업 없음</p>:null}</div></section>)}</div>;

  const renderProducts = () => <div className="space-y-6"><section className="grid gap-3 sm:grid-cols-3"><Card title="등록 상품" value={data?.kpis?.requestedProducts ?? 0} /><Card title="분석 완료" value={data?.kpis?.completedProducts ?? 0} /><Card title="중복 확인 필요" value={0} /></section><ProductList products={products} detailed /></div>;

  const renderResults = () => <div className="space-y-6"><section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">16유형 적합도 입력</h3><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{codes.map(code=><label key={code} className="rounded-2xl border border-[#eadfe1] bg-[#fffafa] p-4"><span className="text-sm font-semibold">{code}</span><input type="number" min={0} max={100} value={scores[code]} onChange={e=>setScores({...scores,[code]:Math.max(0,Math.min(100,Number(e.target.value)))})} className="mt-2 w-full rounded-xl border border-[#dfd1d4] bg-white px-3 py-2" /></label>)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><textarea placeholder="분석 요약" className="min-h-28 rounded-2xl border border-[#dfd1d4] p-4"/><textarea placeholder="분석 근거 및 주의사항" className="min-h-28 rounded-2xl border border-[#dfd1d4] p-4"/></div><button className="mt-5 rounded-xl bg-[#382d2d] px-5 py-3 font-semibold text-white">임시 저장</button></section></div>;

  const renderSettings = () => <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-3xl border border-[#eadfe1] bg-white p-6"><h3 className="font-semibold">운영 방식</h3><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-[#8a797d]">AI 분석</dt><dd className="font-medium">ChatGPT Plus 수동 분석</dd></div><div><dt className="text-[#8a797d]">OpenAI API</dt><dd className="font-medium">사용하지 않음</dd></div><div><dt className="text-[#8a797d]">데이터베이스</dt><dd className="font-medium">Supabase</dd></div></dl></section><section className="rounded-3xl border border-[#eadfe1] bg-white p-6"><h3 className="font-semibold">보안 상태</h3><p className="mt-4 text-sm leading-6 text-[#78696c]">현재는 관리자 인증이 없는 프로토타입입니다. 지인 공개 전에 Supabase Auth 기반 관리자 로그인을 추가해야 합니다.</p></section></div>;

  return <main className="min-h-screen bg-[#f7f4f4] text-[#382d2d]"><div className="mx-auto flex min-h-screen max-w-[1600px]">
    <aside className="hidden w-64 shrink-0 bg-[#2f2829] px-5 py-7 text-white lg:block"><p className="text-[11px] tracking-[0.28em] text-[#e6b8c2]">LAYAD</p><h1 className="mt-2 text-xl font-semibold">ADMIN</h1><nav className="mt-8 space-y-2">{menu.map(item=><button key={item.id} onClick={()=>setSection(item.id)} className={`block w-full rounded-xl px-4 py-3 text-left text-sm ${section===item.id?"bg-[#d88c9c] font-semibold":"text-white/75 hover:bg-white/10"}`}>{item.label}</button>)}</nav></aside>
    <section className="min-w-0 flex-1"><header className="sticky top-0 z-20 border-b border-[#eadfe1] bg-white/95 px-5 py-4 backdrop-blur sm:px-8"><div className="flex items-center justify-between"><div><p className="text-[11px] tracking-[0.18em] text-[#b97b88]">LAYAD ADMIN</p><h2 className="mt-1 text-xl font-semibold">{title}</h2></div><span className="rounded-full bg-[#382d2d] px-4 py-2 text-sm font-semibold text-white">통합 화면</span></div><div className="mt-4 flex gap-2 overflow-x-auto lg:hidden">{menu.map(item=><button key={item.id} onClick={()=>setSection(item.id)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs ${section===item.id?"bg-[#382d2d] text-white":"bg-[#f2e8ea]"}`}>{item.label}</button>)}</div></header>
    <div className="p-5 sm:p-8"><div className="mb-6"><p className="text-xs tracking-[0.18em] text-[#b97b88]">ADMIN WORKSPACE</p><p className="mt-2 text-sm text-[#78696c]">주소는 항상 /admin이며 메뉴를 눌러 같은 화면 안에서 전환됩니다.</p></div>{!loading && data && !data.ok?<div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{data.message ?? "관리자 데이터를 불러오지 못했습니다."}</div>:null}{section==="dashboard"&&renderDashboard()}{section==="statistics"&&renderStatistics()}{section==="requests"&&renderRequests()}{section==="analysis"&&renderAnalysis()}{section==="products"&&renderProducts()}{section==="results"&&renderResults()}{section==="settings"&&renderSettings()}</div></section>
  </div></main>;
}

function ProductList({ products, detailed=false }: { products: NonNullable<DashboardData["topProducts"]>; detailed?: boolean }) { return <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">{detailed?"상품 관리 목록":"신청 많은 상품"}</h3><div className="mt-5 space-y-3">{products.map(p=><div key={p.name} className="flex items-center gap-3 rounded-2xl border border-[#eee5e7] p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0f2] text-xs font-semibold text-[#b76778]">{p.topCode}</div><div className="min-w-0 flex-1"><p className="truncate font-medium">{p.name}</p><p className="mt-1 text-xs text-[#8a7a7d]">신청 {p.count}건 · 고유 세션 {p.uniqueSessions}</p></div><span className="text-xs font-semibold">{statusLabel[p.status] ?? p.status}</span></div>)}{!products.length?<p className="text-sm text-[#8a7a7d]">상품 데이터가 없습니다.</p>:null}</div></section>; }

function RequestTable({ requests }: { requests: NonNullable<DashboardData["recentRequests"]> }) { return <section className="overflow-hidden rounded-3xl border border-[#eadfe1] bg-white shadow-sm"><div className="px-6 py-5"><h3 className="text-lg font-semibold">최근 상품 신청</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#faf7f7] text-xs"><tr><th className="px-6 py-3">상품</th><th className="px-6 py-3">입력</th><th className="px-6 py-3">유형</th><th className="px-6 py-3">상태</th><th className="px-6 py-3">신청일</th></tr></thead><tbody className="divide-y divide-[#eee5e7]">{requests.map(r=><tr key={r.id}><td className="px-6 py-4 font-medium">{r.value}</td><td className="px-6 py-4">{r.inputType==="url"?"링크":"상품명"}</td><td className="px-6 py-4">{r.beautyCode}</td><td className="px-6 py-4">{statusLabel[r.status]??r.status}</td><td className="px-6 py-4">{dateText(r.createdAt)}</td></tr>)}</tbody></table></div></section>; }

function StatusSummary({ counts }: { counts: Record<string, number> }) { return <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">처리 상태</h3><div className="mt-5 grid grid-cols-2 gap-3">{Object.entries(statusLabel).map(([key,label])=><Card key={key} title={label} value={counts[key]??0} />)}</div></section>; }
