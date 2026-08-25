"use client";

import { useEffect, useState } from "react";

type CharacterRow = { beauty_code: string; nickname: string; image_url: string | null; type_description: string };

const CODES = ["DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE","OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE"];
const EMPTY_ROWS: CharacterRow[] = CODES.map(beauty_code => ({ beauty_code, nickname: "", image_url: null, type_description: "" }));

export default function BeautyCodeCharactersPage() {
  const [rows, setRows] = useState<CharacterRow[]>(EMPTY_ROWS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [savedCodes, setSavedCodes] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/beauty-code-characters", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setRows(EMPTY_ROWS);
        setMessage(result.message ?? "캐릭터 정보를 불러오지 못했습니다.");
      } else {
        setRows(result.characters ?? EMPTY_ROWS);
      }
    } catch {
      setRows(EMPTY_ROWS);
      setMessage("캐릭터 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(row: CharacterRow, file?: File) {
    setSaving(row.beauty_code);
    setMessage("");
    setSavedCodes(current => ({ ...current, [row.beauty_code]: false }));
    const form = new FormData();
    form.set("beautyCode", row.beauty_code);
    form.set("nickname", row.nickname);
    form.set("typeDescription", row.type_description ?? "");
    if (file) form.set("image", file);
    try {
      const response = await fetch("/api/admin/beauty-code-characters", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setMessage(`${row.beauty_code} 저장 실패: ${result.message ?? "저장에 실패했습니다."}`);
      } else {
        setRows(current => current.map(item => item.beauty_code === row.beauty_code ? result.character : item));
        setSavedCodes(current => ({ ...current, [row.beauty_code]: true }));
      }
    } catch {
      setMessage(`${row.beauty_code} 저장 중 네트워크 오류가 발생했습니다.`);
    } finally {
      setSaving(null);
    }
  }

  function changeRow(next: CharacterRow) {
    setRows(current => current.map(item => item.beauty_code === next.beauty_code ? next : item));
    setSavedCodes(current => ({ ...current, [next.beauty_code]: false }));
  }

  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-[.16em] text-[#a94f65]">BEAUTY CODE CHARACTERS</p>
          <h1 className="mt-2 text-2xl font-semibold">유형별 캐릭터 관리</h1>
          <p className="mt-2 text-sm text-[#766767]">Beauty Code는 고정값입니다. 별명, 이미지, 유형 설명을 등록·교체할 수 있습니다.</p>
          <p className="mt-1 text-xs text-[#9b8b8e]">※ 유형 설명은 현재 Admin에서만 관리되며 분석 결과 화면에는 아직 연결되지 않습니다.</p>
        </div>
        {message ? <div className="mb-4 rounded-xl bg-[#fff0f3] px-4 py-3 text-sm text-[#a94f65]">{message}</div> : null}
        {loading ? <p className="text-sm text-[#766767]">불러오는 중...</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map(row => <CharacterCard key={row.beauty_code} row={row} saving={saving === row.beauty_code} saved={!!savedCodes[row.beauty_code]} onChange={changeRow} onSave={save} />)}
          </div>
        )}
      </div>
    </main>
  );
}

function CharacterCard({ row, saving, saved, onChange, onSave }: { row: CharacterRow; saving: boolean; saved: boolean; onChange: (row: CharacterRow) => void; onSave: (row: CharacterRow, file?: File) => Promise<void> }) {
  const [file, setFile] = useState<File | undefined>();
  const preview = file ? URL.createObjectURL(file) : row.image_url;
  return (
    <section className="rounded-2xl border border-[#eadfe1] bg-white p-4 shadow-sm">
      <div className="grid grid-cols-[88px_1fr] gap-4 sm:grid-cols-[120px_1fr]">
        <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-[#fff7f8]">
          {preview ? <img src={preview} alt={`${row.beauty_code} 캐릭터`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center px-2 text-center text-xs text-[#9c8d90]">이미지 미등록</div>}
        </div>
        <div className="min-w-0">
          <label className="text-xs font-semibold text-[#8b7b7e]">Beauty Code</label>
          <div className="mt-1 text-xl font-semibold tracking-[.12em] text-[#d88c9c]">{row.beauty_code}</div>

          <label className="mt-4 block text-xs font-semibold text-[#8b7b7e]">별명</label>
          <input value={row.nickname} onChange={e => onChange({ ...row, nickname: e.target.value })} maxLength={40} className="mt-1 w-full rounded-xl border border-[#e8dadd] px-3 py-2 text-sm outline-none focus:border-[#d88c9c]" placeholder="예: 윤광 에이스" />

          <label className="mt-4 block text-xs font-semibold text-[#8b7b7e]">유형 설명</label>
          <textarea
            value={row.type_description ?? ""}
            onChange={e => onChange({ ...row, type_description: e.target.value })}
            className="mt-1 h-40 w-full resize-none overflow-y-auto rounded-xl border border-[#e8dadd] px-3 py-3 text-sm leading-6 outline-none focus:border-[#d88c9c]"
            placeholder="현재 분석 결과 화면에 표시되는 유형 설명을 문단과 줄바꿈을 유지해 입력하세요."
          />

          <label className="mt-4 block text-xs font-semibold text-[#8b7b7e]">이미지</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { setFile(e.target.files?.[0]); onChange(row); }} className="mt-1 block w-full text-xs text-[#766767] file:mr-3 file:rounded-full file:border-0 file:bg-[#fff0f3] file:px-3 file:py-2 file:font-semibold file:text-[#a94f65]" />
          <button type="button" disabled={saving || !row.nickname.trim()} onClick={() => void onSave(row, file)} className="mt-4 w-full rounded-full bg-[#a94f65] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "저장 중..." : "저장"}</button>
          {saved ? <div className="mt-2 rounded-lg bg-[#fff4f6] px-3 py-2 text-center text-sm font-semibold text-[#a94f65]">✓ {row.beauty_code} 저장 완료</div> : null}
        </div>
      </div>
    </section>
  );
}
