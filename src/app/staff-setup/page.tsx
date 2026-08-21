"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function StaffSetupPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) { setMessage("비밀번호는 8자 이상으로 설정해 주세요."); return; }
    if (password !== confirm) { setMessage("비밀번호 확인이 일치하지 않습니다."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/staff-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.message || "초기설정에 실패했습니다.");
      setDone(true);
      setPassword("");
      setConfirm("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "초기설정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4f4] px-5 py-16 text-[#382d2d]">
      <div className="mx-auto max-w-md rounded-3xl border border-[#eadfe1] bg-white p-7 shadow-sm sm:p-9">
        <p className="text-xs font-semibold tracking-[.2em] text-[#b97b88]">LAYAD</p>
        <h1 className="mt-2 text-2xl font-semibold">운영 계정 초기설정</h1>
        <p className="mt-2 text-sm leading-6 text-[#7b6d70]">테스트 운영 계정 <b>herriskim@gmail.com</b>에 사용할 비밀번호를 직접 설정합니다.</p>

        {done ? (
          <div className="mt-7 space-y-4">
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              초기설정이 완료되었습니다. 같은 계정으로 CEO Dashboard와 System Admin에 모두 로그인할 수 있습니다.
            </div>
            <Link href="/ceo/login" className="block rounded-xl bg-[#382d2d] px-4 py-3 text-center font-semibold text-white">CEO Dashboard 로그인</Link>
            <Link href="/admin/login" className="block rounded-xl border border-[#dfd2d5] px-4 py-3 text-center font-semibold">System Admin 로그인</Link>
          </div>
        ) : (
          <form className="mt-7 space-y-4" onSubmit={submit}>
            <label className="block text-sm"><span className="mb-2 block font-medium">새 비밀번호</span><input type="password" autoComplete="new-password" className="w-full rounded-xl border border-[#dfd2d5] px-4 py-3 outline-none focus:border-[#b97b88]" value={password} onChange={e => setPassword(e.target.value)} required /></label>
            <label className="block text-sm"><span className="mb-2 block font-medium">비밀번호 확인</span><input type="password" autoComplete="new-password" className="w-full rounded-xl border border-[#dfd2d5] px-4 py-3 outline-none focus:border-[#b97b88]" value={confirm} onChange={e => setConfirm(e.target.value)} required /></label>
            {message ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p> : null}
            <button disabled={busy || !token} className="w-full rounded-xl bg-[#382d2d] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "설정 중..." : "운영 계정 설정"}</button>
            {!token ? <p className="text-xs text-red-700">초기설정 토큰이 없습니다. 발급된 링크를 사용해 주세요.</p> : null}
          </form>
        )}
      </div>
    </main>
  );
}
