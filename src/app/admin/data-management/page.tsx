"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Entity = "requests" | "products" | "sessions" | "audit";
type Row = Record<string, unknown>;

const tabs: Array<{ id: Entity; label: string }> = [
  { id: "requests", label: "상품 신청" },
  { id: "products", label: "상품" },
  { id: "sessions", label: "테스트 세션" },
  { id: "audit", label: "변경 이력" },
];

const adminMenu = [
  ["대시보드", "/admin"],
  ["사용자 통계 상세", "/admin"],
  ["상품 신청 정보", "/admin"],
  ["분석 작업", "/admin"],
  ["상품 관리", "/admin"],
  ["적합도 결과", "/admin"],
  ["운영 설정", "/admin"],
  ["운영 데이터 관리", "/admin/data-management"],
] as const;

const editable: Record<Exclude<Entity, "audit">, string[]> = {
  requests: ["input_type", "input_value", "status", "product_id"],
  products: ["canonical_name", "brand", "category"],
  sessions: ["beauty_code", "beauty_code_source", "country_code", "gender", "age_band", "completed", "excluded_from_statistics"],
};

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function OperationalDataPage() {
  const [entity, setEntity] = useState<Entity>("requests");
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true); setMessage("");
    try {
      const query = new URLSearchParams({ entity, search });
      const response = await fetch(`/api/admin/operational-data?${query}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "조회 실패");
      setRows(payload.rows ?? []);
      setSelected(null); setDetail(null);
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "조회 실패");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [entity]);

  const columns = useMemo(() => {
    if (entity === "requests") return ["input_value", "status", "input_type", "product_id", "created_at"];
    if (entity === "products") return ["canonical_name", "brand", "category", "created_at"];
    if (entity === "sessions") return ["beauty_code", "country_code", "gender", "age_band", "completed", "created_at"];
    return ["entity_type", "entity_id", "action", "reason", "created_at"];
  }, [entity]);

  const deleteRow = async () => {
    if (!selected || entity === "audit") return;
    if (!window.confirm("선택한 행을 DB에서 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/operational-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, id: selected.id, action: "hard-delete" }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "삭제 실패");
      setMessage("선택한 행을 삭제했습니다.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "삭제 실패"); }
    finally { setBusy(false); }
  };

  const saveDetail = async () => {
    if (!detail || entity === "audit") return;
    const values = Object.fromEntries(editable[entity].map(key => [key, detail[key] ?? null]));
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/operational-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, id: detail.id, action: "update-row", values }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "수정 실패");
      setMessage("수정한 내용을 저장했습니다.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "수정 실패"); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-[#fbf7f7] text-[#382d2d] lg:flex">
    <aside className="hidden w-64 shrink-0 bg-[#382d2d] px-4 py-6 text-white lg:block">
      <p className="px-4 text-xs font-semibold tracking-[.2em] text-[#e8a9b6]">LAYAD ADMIN</p>
      <nav className="mt-7 space-y-1">{adminMenu.map(([label, href]) => <Link key={label} href={href} className={`block rounded-xl px-4 py-3 text-sm ${label === "운영 데이터 관리" ? "bg-[#d88c9c] font-semibold" : "text-white/75 hover:bg-white/10"}`}>{label}</Link>)}</nav>
    </aside>

    <div className="min-w-0 flex-1">
      <header className="border-b border-[#eadfe1] bg-white px-4 py-5 sm:px-8">
        <h1 className="text-2xl font-semibold">운영 데이터 관리</h1>
        <p className="mt-2 text-sm text-[#78696c]">행을 선택해 삭제하거나, 조회 후 수정할 수 있습니다.</p>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        <section className="rounded-2xl border border-[#eadfe1] bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{tabs.map(tab => <button key={tab.id} onClick={() => setEntity(tab.id)} className={`rounded-xl border p-4 text-left ${entity === tab.id ? "border-[#d88c9c] bg-[#fff6f7]" : "border-[#eadfe1]"}`}><p className="font-semibold">{tab.label}</p></button>)}</div>
        </section>

        <section className="mt-5 rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색어" className="rounded-xl border border-[#dfd1d4] px-3 py-2 text-sm" />
              <button onClick={() => void load()} className="rounded-xl bg-[#382d2d] px-4 py-2 text-sm font-semibold text-white">목록 조회</button>
            </div>
            {entity !== "audit" && <div className="flex gap-2">
              <button disabled={!selected} onClick={() => setDetail(selected)} className="rounded-xl border border-[#d8b6bd] px-4 py-2 text-sm font-semibold disabled:opacity-40">조회</button>
              <button disabled={!selected || busy} onClick={() => void deleteRow()} className="rounded-xl bg-[#9f334d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">삭제</button>
            </div>}
          </div>

          {message && <p className="mt-4 rounded-xl bg-[#fff3f5] p-3 text-sm text-[#8a4053]">{message}</p>}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr><th className="border-b px-3 py-3 text-left">선택</th>{columns.map(column => <th key={column} className="border-b px-3 py-3 text-left">{column}</th>)}</tr></thead>
              <tbody>{loading ? <tr><td colSpan={columns.length + 1} className="p-8 text-center">불러오는 중...</td></tr> : rows.map(row => <tr key={String(row.id)} className={selected?.id === row.id ? "bg-[#fff6f7]" : "hover:bg-[#fcf8f8]"}><td className="border-b px-3 py-3"><input type="radio" checked={selected?.id === row.id} onChange={() => setSelected(row)} /></td>{columns.map(column => <td key={column} className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap border-b px-3 py-3">{text(row[column]) || "—"}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </section>

        {detail && entity !== "audit" && <section className="mt-5 rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">상세 조회 및 수정</h2><p className="mt-1 text-sm text-[#78696c]">수정 가능한 항목만 편집할 수 있습니다.</p></div><button onClick={() => setDetail(null)} className="rounded-xl border px-4 py-2 text-sm">닫기</button></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">{editable[entity].map(key => <label key={key} className="text-sm"><span className="mb-2 block font-semibold">{key}</span><input value={text(detail[key])} onChange={e => setDetail({ ...detail, [key]: e.target.value })} className="w-full rounded-xl border border-[#dfd1d4] px-3 py-2" /></label>)}</div>
          <div className="mt-5 flex justify-end"><button disabled={busy} onClick={() => void saveDetail()} className="rounded-xl bg-[#382d2d] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">수정 저장</button></div>
        </section>}
      </div>
    </div>
  </main>;
}
