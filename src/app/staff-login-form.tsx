"use client";

import { FormEvent, useState } from "react";

export default function StaffLoginForm({ target }: { target: "ceo" | "admin" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const title = target === "ceo" ? "CEO Dashboard" : "System Admin";

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/staff-auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, target }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "로그인에 실패했습니다.");
      window.location.href = payload.redirectTo;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#f7f4f4] px-5 py-16 text-[#382d2d]">
    <div className="mx-auto max-w-md rounded-3xl border border-[#eadfe1] bg-white p-7 shadow-sm sm:p-9">
      <p className="text-xs font-semibold tracking-[.2em] text-[#b97b88]">LAYAD</p>
      <h1 className="mt-2 text-2xl font-semibold">{title} 로그인</h1>
      <p className="mt-2 text-sm leading-6 text-[#7b6d70]">등록된 운영 계정만 접근할 수 있습니다.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-sm"><span className="mb-2 block font-medium">이메일</span><input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-[#dfd2d5] px-4 py-3 outline-none focus:border-[#b97b88]" required /></label>
        <label className="block text-sm"><span className="mb-2 block font-medium">비밀번호</span><input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-[#dfd2d5] px-4 py-3 outline-none focus:border-[#b97b88]" required /></label>
        {message ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p> : null}
        <button disabled={busy} className="w-full rounded-xl bg-[#382d2d] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "확인 중..." : "로그인"}</button>
      </form>
    </div>
  </main>;
}
