"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Member = {
  id: string;
  email: string;
  nickname: string | null;
  emailVerified: boolean;
  locale: string | null;
  beautyCode: string | null;
  savedProducts: number;
  createdAt: string;
  recentActivityAt: string;
};

type Payload = {
  ok: boolean;
  members: Member[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  locales: string[];
  message?: string;
};

function formatDate(v: string | null | undefined) {
  if (!v) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(v));
}

export default function MembersPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [verified, setVerified] = useState("all");
  const [locale, setLocale] = useState("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      const sp = new URLSearchParams({ page: String(page), q: query, verified, locale });
      try {
        const r = await fetch(`/api/admin/members?${sp.toString()}`, { cache: "no-store" });
        const json = (await r.json()) as Payload;
        if (!r.ok || !json.ok) throw new Error(json.message || "회원 조회에 실패했습니다.");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "회원 조회에 실패했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [page, query, verified, locale]);

  const rangeText = useMemo(() => {
    if (!data || data.total === 0) return "0명";
    const start = (data.page - 1) * data.pageSize + 1;
    const end = Math.min(data.total, start + data.pageSize - 1);
    return `${start}-${end} / ${data.total.toLocaleString()}명`;
  }, [data]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(q.trim());
  }

  return (
    <main className="min-h-screen bg-[#fbf7f7] px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        <section>
          <p className="text-xs font-semibold tracking-[.18em] text-[#a94f65]">USER MANAGEMENT</p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#382d2d]">회원 조회</h1>
              <p className="mt-1 text-sm text-[#7c6d70]">가입 회원과 Beauty Code, 인증 여부, 저장상품 활동을 조회합니다.</p>
            </div>
            <div className="text-sm font-semibold text-[#65585b]">{loading ? "조회 중..." : rangeText}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#eadfe1] bg-white p-4 shadow-sm">
          <form onSubmit={submitSearch} className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="이메일 검색" className="rounded-xl border border-[#e3d8da] bg-white px-4 py-3 text-sm outline-none focus:border-[#c88494]" />
            <select value={verified} onChange={e => { setPage(1); setVerified(e.target.value); }} className="rounded-xl border border-[#e3d8da] bg-white px-3 py-3 text-sm">
              <option value="all">인증 전체</option><option value="yes">인증 완료</option><option value="no">미인증</option>
            </select>
            <select value={locale} onChange={e => { setPage(1); setLocale(e.target.value); }} className="rounded-xl border border-[#e3d8da] bg-white px-3 py-3 text-sm">
              <option value="all">Locale 전체</option>{(data?.locales ?? []).map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <button className="rounded-xl bg-[#a94f65] px-5 py-3 text-sm font-semibold text-white hover:bg-[#984459]">조회</button>
          </form>
        </section>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="overflow-hidden rounded-2xl border border-[#eadfe1] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="bg-[#faf4f5] text-[#65585b]">
                <tr><th className="px-4 py-3 font-semibold">이메일</th><th className="px-4 py-3 font-semibold">닉네임</th><th className="px-4 py-3 font-semibold">인증</th><th className="px-4 py-3 font-semibold">Locale</th><th className="px-4 py-3 font-semibold">Beauty Code</th><th className="px-4 py-3 text-right font-semibold">저장상품</th><th className="px-4 py-3 font-semibold">가입일</th><th className="px-4 py-3 font-semibold">최근 활동</th></tr>
              </thead>
              <tbody>
                {loading && !data ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-[#8a7a7d]">회원 데이터를 불러오는 중입니다.</td></tr>
                ) : data?.members.length ? data.members.map(m => (
                  <tr key={m.id} className="border-t border-[#f0e7e9] hover:bg-[#fffafb]">
                    <td className="px-4 py-3 font-medium text-[#403538]">{m.email}</td>
                    <td className="px-4 py-3 text-[#65585b]">{m.nickname || "-"}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.emailVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{m.emailVerified ? "완료" : "미인증"}</span></td>
                    <td className="px-4 py-3 text-[#65585b]">{m.locale || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-[#a94f65]">{m.beautyCode || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      {m.savedProducts > 0 ? <Link href={`/admin/members/${m.id}/saved-products`} className="inline-block rounded-lg border border-[#e3d8da] px-3 py-1.5 font-semibold text-[#a94f65] hover:bg-[#fff0f3]">{m.savedProducts.toLocaleString()}개 보기</Link> : <span className="text-[#9d9193]">0</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#65585b]">{formatDate(m.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#65585b]">{formatDate(m.recentActivityAt)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-[#8a7a7d]">조건에 맞는 회원이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#eadfe1] px-4 py-4">
            <button disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg border border-[#e3d8da] px-4 py-2 text-sm font-semibold disabled:opacity-40">이전</button>
            <span className="text-sm text-[#65585b]">{data ? `${data.page} / ${data.totalPages}` : "-"}</span>
            <button disabled={!data || page >= data.totalPages || loading} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-[#e3d8da] px-4 py-2 text-sm font-semibold disabled:opacity-40">다음</button>
          </div>
        </section>
      </div>
    </main>
  );
}
