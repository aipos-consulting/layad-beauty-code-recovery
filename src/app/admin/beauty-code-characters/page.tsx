"use client";

import { useEffect, useState } from "react";

type CharacterRow = {
  beauty_code: string;
  nickname: string;
  image_url: string | null;
  image_url_en: string | null;
  image_url_ja: string | null;
  type_description: string;
};

const CODES = ["DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE","OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE"];
const EMPTY_ROWS: CharacterRow[] = CODES.map(beauty_code => ({ beauty_code, nickname: "", image_url: null, image_url_en: null, image_url_ja: null, type_description: "" }));

async function prepareUploadImage(file?: File) {
  if (!file || file.size <= 0) return undefined;
  const safeTypes = ["image/png", "image/jpeg", "image/webp"];
  if (safeTypes.includes(file.type) && file.size <= 3 * 1024 * 1024) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("선택한 이미지를 모바일 브라우저에서 읽지 못했습니다."));
      img.src = objectUrl;
    });

    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지 변환을 시작할 수 없습니다.");
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) throw new Error("이미지 변환에 실패했습니다.");
    const baseName = file.name.replace(/\.[^.]+$/, "") || "beauty-code";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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

  async function save(row: CharacterRow, files: { ko?: File; en?: File; ja?: File }) {
    setSaving(row.beauty_code);
    setMessage("");
    setSavedCodes(current => ({ ...current, [row.beauty_code]: false }));
    const form = new FormData();
    form.set("beautyCode", row.beauty_code);
    form.set("nickname", row.nickname);
    form.set("typeDescription", row.type_description ?? "");
    try {
      const [imageKo, imageEn, imageJa] = await Promise.all([
        prepareUploadImage(files.ko),
        prepareUploadImage(files.en),
        prepareUploadImage(files.ja),
      ]);
      if (imageKo) form.set("image", imageKo);
      if (imageEn) form.set("imageEn", imageEn);
      if (imageJa) form.set("imageJa", imageJa);

      const response = await fetch("/api/admin/beauty-code-characters", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setMessage(`${row.beauty_code} 저장 실패: ${result.message ?? "저장에 실패했습니다."}`);
      } else {
        setRows(current => current.map(item => item.beauty_code === row.beauty_code ? result.character : item));
        setSavedCodes(current => ({ ...current, [row.beauty_code]: true }));
      }
    } catch (error) {
      setMessage(`${row.beauty_code} 저장 실패: ${error instanceof Error ? error.message : "네트워크 오류가 발생했습니다."}`);
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
          <p className="mt-2 text-sm text-[#766767]">한국어 이미지를 기본값으로 사용합니다. 영어·일본어 이미지가 등록되면 해당 언어 화면에서 자동으로 교체됩니다.</p>
          <p className="mt-1 text-xs text-[#9b8b8e]">※ 영어·일본어 이미지 미등록 시 한국어 이미지가 자동 표시됩니다.</p>
          <p className="mt-1 text-xs text-[#9b8b8e]">※ 세로형 이미지 권장 · 모바일 사진(HEIC 포함)은 저장 시 JPG로 자동 변환·최적화됩니다.</p>
          <p className="mt-1 text-xs text-[#9b8b8e]">※ 이미지·별명·유형 설명은 저장 즉시 결과 화면에서 동적으로 조회됩니다. 설명을 비우면 결과 화면에서도 표시되지 않습니다.</p>
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

function CharacterCard({ row, saving, saved, onChange, onSave }: {
  row: CharacterRow;
  saving: boolean;
  saved: boolean;
  onChange: (row: CharacterRow) => void;
  onSave: (row: CharacterRow, files: { ko?: File; en?: File; ja?: File }) => Promise<void>;
}) {
  const [fileKo, setFileKo] = useState<File | undefined>();
  const [fileEn, setFileEn] = useState<File | undefined>();
  const [fileJa, setFileJa] = useState<File | undefined>();
  const previewKo = fileKo ? URL.createObjectURL(fileKo) : row.image_url;
  const previewEn = fileEn ? URL.createObjectURL(fileEn) : (row.image_url_en || row.image_url);
  const previewJa = fileJa ? URL.createObjectURL(fileJa) : (row.image_url_ja || row.image_url);

  return (
    <section className="rounded-2xl border border-[#eadfe1] bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <label className="text-xs font-semibold text-[#8b7b7e]">Beauty Code</label>
        <div className="mt-1 text-xl font-semibold tracking-[.12em] text-[#d88c9c]">{row.beauty_code}</div>

        <label className="mt-4 block text-xs font-semibold text-[#8b7b7e]">별명</label>
        <input value={row.nickname} onChange={e => onChange({ ...row, nickname: e.target.value })} maxLength={40} className="mt-1 w-full rounded-xl border border-[#e8dadd] px-3 py-2 text-sm outline-none focus:border-[#d88c9c]" placeholder="예: 윤광 에이스" />

        <label className="mt-4 block text-xs font-semibold text-[#8b7b7e]">유형 설명</label>
        <textarea value={row.type_description ?? ""} onChange={e => onChange({ ...row, type_description: e.target.value })} className="mt-1 h-40 w-full resize-none overflow-y-auto rounded-xl border border-[#e8dadd] px-3 py-3 text-sm leading-6 outline-none focus:border-[#d88c9c]" placeholder="현재 분석 결과 화면에 표시되는 유형 설명을 문단과 줄바꿈을 유지해 입력하세요." />

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <ImageUpload label="한국어 · 기본" preview={previewKo} code={row.beauty_code} file={fileKo} setFile={setFileKo} />
          <ImageUpload label="English" preview={previewEn} code={row.beauty_code} file={fileEn} setFile={setFileEn} fallback={!row.image_url_en && !fileEn} />
          <ImageUpload label="日本語" preview={previewJa} code={row.beauty_code} file={fileJa} setFile={setFileJa} fallback={!row.image_url_ja && !fileJa} />
        </div>

        <button type="button" disabled={saving} onClick={() => void onSave(row, { ko: fileKo, en: fileEn, ja: fileJa })} className="mt-5 w-full rounded-full bg-[#a94f65] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "저장 중..." : "저장"}</button>
        {saved ? <div className="mt-2 rounded-lg bg-[#fff4f6] px-3 py-2 text-center text-sm font-semibold text-[#a94f65]">✓ {row.beauty_code} 저장 완료</div> : null}
      </div>
    </section>
  );
}

function ImageUpload({ label, preview, code, file, setFile, fallback = false }: {
  label: string;
  preview: string | null;
  code: string;
  file?: File;
  setFile: (file?: File) => void;
  fallback?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-[#8b7b7e]">{label}</label>
        {fallback ? <span className="text-[10px] font-semibold text-[#a94f65]">한국어 사용 중</span> : null}
      </div>
      <div className="mt-2 aspect-[9/16] w-full overflow-hidden rounded-2xl border border-[#f0e4e6] bg-[#fff7f8]">
        {preview ? <img src={preview} alt={`${code} ${label} 캐릭터`} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center px-2 text-center text-xs text-[#9c8d90]">이미지 미등록</div>}
      </div>
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0])} className="mt-2 block w-full text-[11px] text-[#766767] file:mr-2 file:rounded-full file:border-0 file:bg-[#fff0f3] file:px-2.5 file:py-1.5 file:font-semibold file:text-[#a94f65]" />
      {file ? <p className="mt-1 truncate text-[10px] text-[#8b7b7e]">{file.name}</p> : null}
    </div>
  );
}
