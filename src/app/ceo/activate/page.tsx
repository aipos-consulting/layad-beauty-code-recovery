"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function CeoActivateForm() {
  const params = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) return setMessage("비밀번호는 8자 이상으로 설정해 주세요.");
    if (password !== confirm) return setMessage("비밀번호가 일치하지 않습니다.");
    setBusy(true);
    try {
      const response = await fetch("/api/ceo-activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "CEO 계정 활성화에 실패했습니다.");
      window.location.href = "/ceo/login";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CEO 계정 활성화에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mx-auto max-w-md rounded-3xl border border-[#eadfe1] bg-white p-7 shadow-sm sm:p-9"><p className="text-xs font-semibold tracking-[.2em] text-[#b97b88]">LAYAD</p><h1 className="mt-2 text-2xl font-semibold">CEO 계정 활성화</h1><p className="mt-2 text-sm leading-6 text-[#7b6d70]">Master Admin이 발급한 1회성 링크입니다. 본인이 사용할 비밀번호를 직접 설정해 주세요.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm"><span className="mb-2 block font-medium">새 비밀번호</span><input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-[#dfd2d5] px-4 py-3 outline-none focus:border-[#b97b88]" required /></label><label className="block text-sm"><span className="mb-2 block font-medium">비밀번호 확인</span><input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full rounded-xl border border-[#dfd2d5] px-4 py-3 outline-none focus:border-[#b97b88]" required /></label>{message ? <p className="rounded-xl bg-[#fff7e6] px-4 py-3 text-sm text-[#a94f00]">{message}</p> : null}<button disabled={busy || !token} className="w-full rounded-xl bg-[#382d2d] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "활성화 중..." : "CEO 계정 활성화"}</button></form></div>;
}

export default function CeoActivatePage() {
  return <main className="min-h-screen bg-[#f7f4f4] px-5 py-16 text-[#382d2d]"><Suspense fallback={<div className="mx-auto max-w-md rounded-3xl border border-[#eadfe1] bg-white p-7 text-sm text-[#78696c] shadow-sm">활성화 화면을 준비하고 있습니다.</div>}><CeoActivateForm /></Suspense></main>;
}
