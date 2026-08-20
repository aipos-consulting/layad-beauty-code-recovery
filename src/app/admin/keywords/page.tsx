"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  canonical_name: string;
  brand: string | null;
  category: string | null;
};

type Candidate = {
  id: number;
  candidate_keyword: string;
  language_code: string | null;
  suggested_axis: string | null;
  suggested_code: string | null;
  suggested_weight: number | string | null;
  ai_confidence: number | string | null;
  occurrence_count: number | null;
  status: string | null;
  first_product_id: string | null;
  last_product_id: string | null;
  sample_context: string | null;
};

type Master = {
  id: number;
  canonical_keyword: string;
  language_code: string | null;
  axis: string | null;
  code: string | null;
  default_weight: number | string | null;
  active: boolean | null;
  synonyms: unknown;
};

type ApiData = {
  ok: boolean;
  products?: Product[];
  candidates?: Candidate[];
  masters?: Master[];
  message?: string;
};

type Row = {
  key: string;
  kind: "후보" | "확정";
  category: string;
  product: string;
  keyword: string;
  axis: string;
  code: string;
  weight: string;
  confidence: string;
  occurrences: string;
  status: string;
  context: string;
};

const pct = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${Math.round(n * 100)}%`;
};

export default function KeywordTablePage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [kind, setKind] = useState("전체");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/analysis-data", { cache: "no-store" });
        const json = (await res.json()) as ApiData;
        if (!res.ok || !json.ok) throw new Error(json.message || "키워드 데이터를 불러오지 못했습니다.");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "조회 중 오류가 발생했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo<Row[]>(() => {
    const products = data?.products ?? [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const candidateRows: Row[] = (data?.candidates ?? []).map((c) => {
      const pid = c.last_product_id || c.first_product_id || "";
      const p = pid ? productMap.get(pid) : undefined;
      return {
        key: `candidate-${c.id}`,
        kind: "후보",
        category: p?.category?.trim() || "미분류",
        product: p ? `${p.brand ? `${p.brand} · ` : ""}${p.canonical_name}` : "-",
        keyword: c.candidate_keyword,
        axis: c.suggested_axis || "-",
        code: c.suggested_code || "-",
        weight: pct(c.suggested_weight),
        confidence: pct(c.ai_confidence),
        occurrences: String(c.occurrence_count ?? 0),
        status: c.status || "pending",
        context: c.sample_context || "-",
      };
    });

    const masterRows: Row[] = (data?.masters ?? []).map((m) => ({
      key: `master-${m.id}`,
      kind: "확정",
      category: "공통",
      product: "전체 제품 공통",
      keyword: m.canonical_keyword,
      axis: m.axis || "-",
      code: m.code || "-",
      weight: pct(m.default_weight),
      confidence: "-",
      occurrences: "-",
      status: m.active === false ? "inactive" : "active",
      context: Array.isArray(m.synonyms) && m.synonyms.length ? `동의어: ${m.synonyms.join(", ")}` : "-",
    }));

    return [...candidateRows, ...masterRows];
  }, [data]);

  const categories = useMemo(() => {
    const values = Array.from(new Set(rows.map((r) => r.category))).sort((a, b) => a.localeCompare(b, "ko"));
    return ["전체", ...values];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== "전체" && r.category !== category) return false;
      if (kind !== "전체" && r.kind !== kind) return false;
      if (!q) return true;
      return [r.keyword, r.product, r.category, r.axis, r.code, r.context].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, query, category, kind]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of filtered) map.set(row.category, [...(map.get(row.category) ?? []), row]);
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "공통") return -1;
      if (b === "공통") return 1;
      return a.localeCompare(b, "ko");
    });
  }, [filtered]);

  return (
    <main className="min-h-screen bg-[#fbf7f7] px-4 py-6 text-[#382d2d] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6">
          <p className="text-xs font-semibold tracking-[.14em] text-[#a94f65]">KEYWORD DATA</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">키워드 테이블 조회</h1>
          <p className="mt-2 text-sm leading-6 text-[#716568]">제품 카테고리별로 분석 키워드를 조회합니다. 현재 상품과 연결된 후보 키워드는 실제 제품 카테고리로 분류하고, Master 키워드는 공통으로 표시합니다.</p>
        </header>

        <section className="mb-5 grid gap-3 rounded-2xl border border-[#eadfe1] bg-white p-4 sm:grid-cols-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="키워드·상품명 검색" className="min-h-11 rounded-xl border border-[#dfd2d5] bg-white px-4 text-sm outline-none focus:border-[#a94f65]" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-11 rounded-xl border border-[#dfd2d5] bg-white px-4 text-sm outline-none focus:border-[#a94f65]">
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="min-h-11 rounded-xl border border-[#dfd2d5] bg-white px-4 text-sm outline-none focus:border-[#a94f65]">
            <option>전체</option><option>확정</option><option>후보</option>
          </select>
        </section>

        <div className="mb-5 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[#382d2d] px-3 py-2 font-semibold text-white">전체 {rows.length}</span>
          <span className="rounded-full bg-[#fff0f3] px-3 py-2 font-semibold text-[#a94f65]">후보 {rows.filter((r) => r.kind === "후보").length}</span>
          <span className="rounded-full bg-[#f3eee9] px-3 py-2 font-semibold text-[#65585b]">확정 {rows.filter((r) => r.kind === "확정").length}</span>
          <span className="rounded-full bg-white px-3 py-2 font-semibold text-[#65585b] ring-1 ring-[#eadfe1]">카테고리 {Math.max(0, categories.length - 1)}</span>
        </div>

        {loading && <div className="rounded-2xl border border-[#eadfe1] bg-white p-8 text-center text-sm text-[#716568]">키워드 데이터를 불러오는 중입니다.</div>}
        {error && <div className="rounded-2xl border border-[#e9b7c2] bg-[#fff2f4] p-5 text-sm text-[#9e4258]">{error}</div>}

        {!loading && !error && grouped.length === 0 && <div className="rounded-2xl border border-[#eadfe1] bg-white p-8 text-center text-sm text-[#716568]">조건에 맞는 키워드가 없습니다.</div>}

        <div className="space-y-5">
          {grouped.map(([group, items]) => (
            <section key={group} className="overflow-hidden rounded-2xl border border-[#eadfe1] bg-white">
              <div className="flex items-center justify-between border-b border-[#eadfe1] bg-[#fffafa] px-4 py-4 sm:px-5">
                <div>
                  <h2 className="text-lg font-bold">{group}</h2>
                  <p className="mt-1 text-xs text-[#8a7d80]">{items.length}개 키워드</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                  <thead className="bg-[#fbf7f7] text-xs text-[#7a6c70]">
                    <tr>
                      <th className="px-4 py-3">구분</th><th className="px-4 py-3">키워드</th><th className="px-4 py-3">연결 상품</th><th className="px-4 py-3">축</th><th className="px-4 py-3">코드</th><th className="px-4 py-3">가중치</th><th className="px-4 py-3">AI 신뢰도</th><th className="px-4 py-3">출현</th><th className="px-4 py-3">상태</th><th className="px-4 py-3">근거/설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.key} className="border-t border-[#f0e7e9] align-top">
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.kind === "후보" ? "bg-[#fff0f3] text-[#a94f65]" : "bg-[#eee9e4] text-[#65585b]"}`}>{r.kind}</span></td>
                        <td className="px-4 py-3 font-semibold text-[#403436]">{r.keyword}</td>
                        <td className="max-w-[260px] px-4 py-3 text-[#65585b]">{r.product}</td>
                        <td className="px-4 py-3 font-mono">{r.axis}</td>
                        <td className="px-4 py-3 font-mono font-bold">{r.code}</td>
                        <td className="px-4 py-3">{r.weight}</td>
                        <td className="px-4 py-3">{r.confidence}</td>
                        <td className="px-4 py-3">{r.occurrences}</td>
                        <td className="px-4 py-3">{r.status}</td>
                        <td className="max-w-[340px] px-4 py-3 leading-5 text-[#716568]">{r.context}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
