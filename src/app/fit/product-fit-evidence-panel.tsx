"use client";

import { useState } from "react";

type EvidenceItem = {
  sourceName: string;
  sourceUrl: string;
  excerpt: string;
  keywords: string[];
  relatedAxes: string[];
};

type EvidenceResponse = {
  ok?: boolean;
  evidence?: EvidenceItem[];
  message?: string;
};

export default function ProductFitEvidencePanel({
  productName,
  beautyCode,
  requestId,
}: {
  productName: string;
  beautyCode: string;
  requestId: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [message, setMessage] = useState("");

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (loaded || busy) return;

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/product-fit-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, beautyCode, requestId }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as EvidenceResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.message || "주요 분석 근거를 불러오지 못했습니다.");
      setEvidence(payload.evidence ?? []);
      setLoaded(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주요 분석 근거를 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 border-t border-[#f1e4e6] pt-5">
      <button
        type="button"
        onClick={toggle}
        className="w-full rounded-2xl border border-[#e8cfd4] bg-[#fffafa] px-4 py-3 text-sm font-bold text-[#a85f6e]"
        aria-expanded={open}
      >
        {open ? "주요 분석 근거 3건 접기" : "주요 분석 근거 3건 보기"}
      </button>

      {open ? (
        <div className="mt-4 space-y-3">
          {busy ? <p className="rounded-2xl bg-[#fff7f8] p-4 text-sm text-[#806f72]">주요 분석 근거를 확인하고 있습니다.</p> : null}
          {message ? <p className="rounded-2xl bg-[#fff3df] p-4 text-sm leading-6 text-[#8d5a23]">{message}</p> : null}
          {!busy && loaded && evidence.length === 0 ? (
            <p className="rounded-2xl bg-[#fff7f8] p-4 text-sm text-[#806f72]">확인 가능한 공개 근거를 찾지 못했습니다.</p>
          ) : null}
          {evidence.map((item, index) => (
            <article key={`${item.sourceUrl}-${index}`} className="rounded-2xl border border-[#f0dde1] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#b97b88]">근거 {index + 1}{item.relatedAxes?.length ? ` · ${item.relatedAxes.join(" · ")}` : ""}</p>
                  <p className="mt-1 truncate text-sm font-bold text-[#493a3d]">{item.sourceName || "공개 웹 출처"}</p>
                </div>
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full border border-[#e8cfd4] px-3 py-1.5 text-[11px] font-bold text-[#a85f6e]">원문 보기</a>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-[#6f6063]">{item.excerpt}</p>
              {item.keywords?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.keywords.map((keyword) => <span key={keyword} className="rounded-full bg-[#fff0f2] px-2.5 py-1 text-[11px] font-semibold text-[#a85f6e]">{keyword}</span>)}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
