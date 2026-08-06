"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Entity = "requests" | "products" | "sessions" | "audit";
type Row = Record<string, unknown>;

const tabs: Array<{ id: Entity; label: string; help: string }> = [
  { id: "requests", label: "상품 신청", help: "상태 변경, 재처리, 소프트 삭제·복원" },
  { id: "products", label: "상품", help: "상품명·브랜드·카테고리 정정, 비활성화·복원" },
  { id: "sessions", label: "테스트 세션", help: "비정상 세션 통계 제외, 소프트 삭제·복원" },
  { id: "audit", label: "변경 이력", help: "처리 대상·작업·사유·시각 조회" },
];

function value(row: Row, key: string) {
  const item = row[key];
  if (item === null || item === undefined || item === "") return "—";
  if (typeof item === "boolean") return item ? "예" : "아니오";
  return String(item);
}

function when(input: unknown) {
  if (!input) return "—";
  try { return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(String(input))); }
  catch { return String(input); }
}

export default function OperationalDataPage() {
  const [entity, setEntity] = useState<Entity>("requests");
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const query = new URLSearchParams({ entity, search, includeDeleted: String(includeDeleted) });
      const response = await fetch(`/api/admin/operational-data?${query}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "조회 실패");
      setRows(payload.rows ?? []);
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "조회 실패");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [entity, includeDeleted]);

  const columns = useMemo(() => {
    if (entity === "requests") return ["input_value", "status", "input_type", "product_id", "created_at", "deleted_at"];
    if (entity === "products") return ["canonical_name", "brand", "category", "created_at", "deleted_at"];
    if (entity === "sessions") return ["beauty_code", "beauty_code_source", "country_code", "gender", "age_band", "completed", "excluded_from_statistics", "created_at", "deleted_at"];
    return ["entity_type", "entity_id", "action", "reason", "actor_label", "created_at"];
  }, [entity]);

  const action = async (name: string, values?: Record<string, unknown>) => {
    if (!selected || entity === "audit" || !reason.trim()) {
      setMessage("변경할 행을 선택하고 변경 사유를 입력해 주세요.");
      return;
    }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/operational-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, id: selected.id, action: name, reason, values }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "처리 실패");
      setMessage("변경을 저장하고 감사 이력에 기록했습니다.");
      setReason(""); setSelected(null);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "처리 실패"); }
    finally { setBusy(false); }
  };

  const editProduct = async () => {
    if (!selected) return;
    const canonical_name = window.prompt("상품명", value(selected, "canonical_name"));
    if (canonical_name === null) return;
    const brand = window.prompt("브랜드", value(selected, "brand").replace("—", ""));
    if (brand === null) return;
    const category = window.prompt("카테고리", value(selected, "category").replace("—", ""));
    if (category === null) return;
    await action("update-product", { canonical_name, brand, category });
  };

  const deleted = Boolean(selected?.deleted_at);
  const currentTab = tabs.find(tab => tab.id === entity)!;

  return <main className="min-h-screen bg-[#fbf7f7] text-[#382d2d]">
    <header className="border-b border-[#eadfe1] bg-white px-4 py-5 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold tracking-[.18em] text-[#a94f65]">LAYAD ADMIN</p><h1 className="mt-1 text-2xl font-semibold">운영 데이터 관리</h1><p className="mt-2 text-sm text-[#78696c]">원본 DB를 직접 편집하지 않고 업무 단위로 조회·정정·재처리·비활성화·복원합니다.</p></div>
        <Link href="/admin" className="rounded-xl border border-[#d8b6bd] bg-white px-4 py-2 text-sm font-semibold">관리자 홈</Link>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
      <section className="rounded-2xl border border-[#eadfe1] bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{tabs.map(tab => <button key={tab.id} onClick={() => { setEntity(tab.id); setSelected(null); setReason(""); }} className={`rounded-xl border p-4 text-left ${entity === tab.id ? "border-[#d88c9c] bg-[#fff6f7]" : "border-[#eadfe1]"}`}><p className="font-semibold">{tab.label}</p><p className="mt-1 text-xs leading-5 text-[#78696c]">{tab.help}</p></button>)}</div>
      </section>

      <section className="mt-5 rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-lg font-semibold">{currentTab.label}</h2><p className="mt-1 text-sm text-[#78696c]">{currentTab.help}</p></div>
          <div className="flex flex-wrap gap-2">
            <input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void load(); }} placeholder="검색" className="rounded-xl border border-[#dfd1d4] px-3 py-2 text-sm" />
            <button onClick={() => void load()} className="rounded-xl bg-[#382d2d] px-4 py-2 text-sm font-semibold text-white">조회</button>
            {entity !== "audit" && <label className="flex items-center gap-2 rounded-xl border border-[#eadfe1] px-3 py-2 text-sm"><input type="checkbox" checked={includeDeleted} onChange={event => setIncludeDeleted(event.target.checked)} /> 삭제 포함</label>}
          </div>
        </div>

        {message && <p className="mt-4 rounded-xl bg-[#fff3f5] p-3 text-sm text-[#8a4053]">{message}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead><tr><th className="border-b border-[#eadfe1] px-3 py-3 text-left">선택</th>{columns.map(column => <th key={column} className="border-b border-[#eadfe1] px-3 py-3 text-left whitespace-nowrap">{column}</th>)}</tr></thead>
            <tbody>{loading ? <tr><td colSpan={columns.length + 1} className="p-8 text-center">불러오는 중...</td></tr> : rows.length === 0 ? <tr><td colSpan={columns.length + 1} className="p-8 text-center text-[#78696c]">표시할 데이터가 없습니다.</td></tr> : rows.map(row => <tr key={String(row.id)} className={selected?.id === row.id ? "bg-[#fff6f7]" : "hover:bg-[#fcf8f8]"}><td className="border-b border-[#f0e7e9] px-3 py-3"><input type="radio" name="row" checked={selected?.id === row.id} onChange={() => setSelected(row)} /></td>{columns.map(column => <td key={column} className="max-w-xs border-b border-[#f0e7e9] px-3 py-3 whitespace-nowrap overflow-hidden text-ellipsis">{column.endsWith("_at") || column === "created_at" ? when(row[column]) : value(row, column)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>

      {entity !== "audit" && <section className="mt-5 rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm">
        <h2 className="font-semibold">선택 데이터 처리</h2>
        <p className="mt-1 text-sm text-[#78696c]">중요 변경은 사유가 필수이며 모든 작업은 변경 이력에 남습니다.</p>
        <textarea value={reason} onChange={event => setReason(event.target.value)} rows={3} placeholder="변경 사유" className="mt-4 w-full rounded-xl border border-[#dfd1d4] p-3 text-sm" />
        <div className="mt-3 flex flex-wrap gap-2">
          {entity === "requests" && <><button disabled={busy || !selected} onClick={() => void action("status", { status: "submitted" })} className="rounded-xl border border-[#d8b6bd] px-4 py-2 text-sm font-semibold disabled:opacity-40">재접수</button><button disabled={busy || !selected} onClick={() => void action("status", { status: "held" })} className="rounded-xl border border-[#d8b6bd] px-4 py-2 text-sm font-semibold disabled:opacity-40">보류</button></>}
          {entity === "products" && <button disabled={busy || !selected} onClick={() => void editProduct()} className="rounded-xl border border-[#d8b6bd] px-4 py-2 text-sm font-semibold disabled:opacity-40">상품 정보 정정</button>}
          {entity === "sessions" && <button disabled={busy || !selected} onClick={() => void action("exclude-session", { excluded: !Boolean(selected?.excluded_from_statistics) })} className="rounded-xl border border-[#d8b6bd] px-4 py-2 text-sm font-semibold disabled:opacity-40">통계 제외/복원</button>}
          <button disabled={busy || !selected} onClick={() => void action(deleted ? "restore" : "soft-delete")} className="rounded-xl bg-[#382d2d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{deleted ? "복원" : "소프트 삭제"}</button>
        </div>
      </section>}

      <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <strong>검토 브랜치 안내</strong><br />회원 이메일·이름은 이 화면에 표시하지 않습니다. 회원 계정 비활성화와 관리자 권한 관리는 별도 Master 관리자 화면으로 분리하며, 이 화면에서는 최소 개인정보와 운영 데이터만 다룹니다.
      </section>
    </div>
  </main>;
}
