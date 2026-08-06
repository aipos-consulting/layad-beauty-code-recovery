"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = { id: string; canonical_name: string | null; brand: string | null; category: string | null };
type ProductRow = { name: string; count: number; uniqueSessions: number; topCode: string; status: string; productId: string | null };
type Data = { ok: boolean; topProducts?: ProductRow[]; products?: Product[]; message?: string };
type EditState = { productId: string; canonicalName: string; brand: string; category: string };

export default function Page() {
  const [data, setData] = useState<Data | null>(null);
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      setData(await response.json());
    } catch {
      setData({ ok: false, message: "네트워크 오류" });
    }
  }

  useEffect(() => { void load(); }, []);

  const productsById = useMemo(() => new Map((data?.products ?? []).map(product => [product.id, product])), [data?.products]);
  const rows = useMemo(() => (data?.topProducts ?? []).filter(row => row.name.toLowerCase().includes(query.trim().toLowerCase())), [data?.topProducts, query]);

  function openEdit(row: ProductRow) {
    if (!row.productId) {
      setMessage("정식 상품으로 연결되지 않은 신청 데이터입니다. 먼저 상품 통합이 필요합니다.");
      return;
    }
    const product = productsById.get(row.productId);
    setMessage("");
    setEdit({
      productId: row.productId,
      canonicalName: product?.canonical_name ?? row.name,
      brand: product?.brand ?? "",
      category: product?.category ?? "",
    });
  }

  async function save() {
    if (!edit || !edit.canonicalName.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      const result = await response.json() as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "수정에 실패했습니다.");
      setEdit(null);
      setMessage("상품 기본정보를 수정했습니다. 기존 분석 점수와 적합도 결과는 변경되지 않았습니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4f4] p-5 text-[#382d2d] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div><p className="text-xs font-semibold tracking-[.18em] text-[#b97b88]">LAYAD ADMIN</p><h1 className="mt-2 text-3xl font-semibold">상품 관리</h1></div>
          <Link href="/admin" className="rounded-full bg-[#382d2d] px-5 py-3 text-sm font-semibold text-white">대시보드</Link>
        </div>
        <p className="mt-3 text-sm text-[#7b6d70]">상품명·브랜드·카테고리를 수정할 수 있습니다. 분석 점수와 적합도 결과는 편집할 수 없습니다.</p>
        {message ? <div className="mt-5 rounded-2xl border border-[#ead4d9] bg-white p-4 text-sm text-[#7b4d58]">{message}</div> : null}
        {!data?.ok && data ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{data.message ?? "데이터를 불러오지 못했습니다."}</div> : null}

        <section className="mt-7 rounded-3xl border border-[#eadfe1] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#eee5e7] p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">통합 상품 목록</h2>
            <input value={query} onChange={event => setQuery(event.target.value)} className="rounded-xl border border-[#dfd1d4] px-4 py-2 text-sm" placeholder="상품명 검색" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#faf7f7] text-xs text-[#75676a]"><tr><th className="px-6 py-3">상품명</th><th className="px-6 py-3">신청 건수</th><th className="px-6 py-3">고유 세션</th><th className="px-6 py-3">대표 유형</th><th className="px-6 py-3">상태</th><th className="px-6 py-3">작업</th></tr></thead>
              <tbody className="divide-y divide-[#eee5e7]">
                {rows.map(row => <tr key={`${row.productId ?? "request"}-${row.name}`}>
                  <td className="px-6 py-4 font-semibold">{row.name}</td><td className="px-6 py-4">{row.count}</td><td className="px-6 py-4">{row.uniqueSessions}</td><td className="px-6 py-4 font-semibold text-[#b76778]">{row.topCode}</td><td className="px-6 py-4">{row.status}</td>
                  <td className="px-6 py-4"><button onClick={() => openEdit(row)} className="rounded-lg border border-[#d88c9c] px-3 py-2 text-xs font-semibold text-[#b76778] hover:bg-[#fff0f3]">편집</button></td>
                </tr>)}
                {!rows.length ? <tr><td colSpan={6} className="px-6 py-10 text-center text-[#8a7a7d]">등록된 상품이 없습니다.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {edit ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
          <h2 className="text-xl font-semibold">상품 기본정보 편집</h2>
          <p className="mt-2 text-sm text-[#7b6d70]">분석 점수와 16유형 적합도는 수정되지 않습니다.</p>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">상품명<input value={edit.canonicalName} onChange={e => setEdit({ ...edit, canonicalName: e.target.value })} className="mt-2 w-full rounded-xl border border-[#dfd1d4] px-4 py-3 font-normal" /></label>
            <label className="block text-sm font-semibold">브랜드<input value={edit.brand} onChange={e => setEdit({ ...edit, brand: e.target.value })} className="mt-2 w-full rounded-xl border border-[#dfd1d4] px-4 py-3 font-normal" /></label>
            <label className="block text-sm font-semibold">카테고리<input value={edit.category} onChange={e => setEdit({ ...edit, category: e.target.value })} className="mt-2 w-full rounded-xl border border-[#dfd1d4] px-4 py-3 font-normal" /></label>
            <div className="rounded-xl bg-[#fff6f7] p-4 text-sm text-[#8b5864]">분석 점수, 유형별 적합도, 리뷰 수, 신뢰도는 읽기 전용입니다.</div>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button onClick={() => setEdit(null)} disabled={saving} className="rounded-xl border border-[#dfd1d4] px-5 py-3 text-sm font-semibold">취소</button><button onClick={() => void save()} disabled={saving || !edit.canonicalName.trim()} className="rounded-xl bg-[#d88c9c] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "저장 중" : "저장"}</button></div>
        </div>
      </div> : null}
    </main>
  );
}
