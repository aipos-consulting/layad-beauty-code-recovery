"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type SavedProduct = {
  id: string;
  product_ref: string;
  product_name: string;
  beauty_code: string;
  fit_score: number;
  created_at: string;
};

type Payload = {
  ok: boolean;
  items: SavedProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  beautyCodes: string[];
  message?: string;
};

function formatDate(v: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(v));
}

export default function SavedProductsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [code, setCode] = useState("all");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      const sp = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        q: query,
        code,
        minScore,
        maxScore,
      });
      try {
        const r = await fetch(`/api/admin/members/${id}/saved-products?${sp.toString()}`, { cache: "no-store" });
        const json = (await r.json()) as Payload;
        if (!r.ok || !json.ok) throw new Error(json.message || "저장상품 조회에 실패했습니다.");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "저장상품 조회에 실패했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id, page, query, code, minScore, maxScore]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(q.trim());
  }

  return (
    <main className="min-h-screen bg-[#fbf7f7] px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[.18em] text-[#a94f65]">USER MANAGEMENT · SAVED PRODUCTS</p>
            <h1 className="mt-2 text-2xl font-bold text-[#382d2d]">저장상품 상세</h1>
            <p className="mt-1 text-sm text-[#7c6d70]">20개씩 페이지로 나누어 조회합니다.</p>
          </div>
          <Link href="/admin/members" className="rounded-lg border border-[#e3d8da] bg-white px-4 py-2 text-sm font-semibold text-[#65585b]">회원 조회로 돌아가기</Link>
        </div>

        <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-[#eadfe1] bg-white p-4 md:grid-cols-[minmax(260px,1fr)_160px_120px_120px_auto]">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="상품명 검색" className="rounded-xl border border-[#e3d8da] px-4 py-3 text-sm" />
          <select value={code} onChange={e => { setPage(1); setCode(e.target.value); }} className="rounded-xl border border-[#e3d8da] px-3 py-3 text-sm">
            <option value="all">Beauty Code 전체</option>
            {(data?.beautyCodes ?? []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" min="0" max="100" value={minScore} onChange={e => { setPage(1); setMinScore(e.target.value); }} placeholder="최소 점수" className="rounded-xl border border-[#e3d8da] px-3 py-3 text-sm" />
          <input type="number" min="0" max="100" value={maxScore} onChange={e => { setPage(1); setMaxScore(e.target.value); }} placeholder="최대 점수" className="rounded-xl border border-[#e3d8da] px-3 py-3 text-sm" />
          <button className="rounded-xl bg-[#a94f65] px-5 py-3 text-sm font-semibold text-white">검색</button>
        </form>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="overflow-hidden rounded-2xl border border-[#eadfe1] bg-white shadow-sm">
          <div className="border-b border-[#eadfe1] px-4 py-3 text-sm font-semibold text-[#65585b]">
            {loading ? "조회 중..." : `총 ${(data?.total ?? 0).toLocaleString()}개`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[#faf4f5] text-[#65585b]"><tr><th className="px-4 py-3 text-left">상품명</th><th className="px-4 py-3 text-left">Beauty Code</th><th className="px-4 py-3 text-right">적합도</th><th className="px-4 py-3 text-left">저장일</th></tr></thead>
              <tbody>
                {loading && !data ? <tr><td colSpan={4} className="px-4 py-10 text-center text-[#8a7a7d]">저장상품을 불러오는 중입니다.</td></tr> : data?.items.length ? data.items.map(x => (
                  <tr key={x.id} className="border-t border-[#f0e7e9]">
                    <td className="max-w-[650px] px-4 py-3 font-medium text-[#403538]">{x.product_name}</td>
                    <td className="px-4 py-3 font-semibold text-[#a94f65]">{x.beauty_code}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{x.fit_score}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#65585b]">{formatDate(x.created_at)}</td>
                  </tr>
                )) : <tr><td colSpan={4} className="px-4 py-10 text-center text-[#8a7a7d]">조건에 맞는 저장상품이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#eadfe1] px-4 py-4">
            <button disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg border border-[#e3d8da] px-4 py-2 text-sm font-semibold disabled:opacity-40">이전 20개</button>
            <span className="text-sm text-[#65585b]">{data ? `${data.page} / ${data.totalPages}` : "-"}</span>
            <button disabled={!data || page >= data.totalPages || loading} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-[#e3d8da] px-4 py-2 text-sm font-semibold disabled:opacity-40">다음 20개</button>
          </div>
        </section>
      </div>
    </main>
  );
}
