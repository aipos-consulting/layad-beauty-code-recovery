"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "@/app/i18n";

const PENDING_KEY = "layad-pending-beauty-code-v1";

type PendingCode = {
  beautyCode: string;
  source: string;
  axisScores?: Record<string, number>;
  clientRef: string;
};

async function savePendingCode() {
  const raw = localStorage.getItem(PENDING_KEY);
  if (!raw) return { ok: true, saved: false };
  let pending: PendingCode;
  try { pending = JSON.parse(raw) as PendingCode; } catch { localStorage.removeItem(PENDING_KEY); return { ok: true, saved: false }; }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("/api/mypage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-code", ...pending }),
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
      if (response.ok && payload.ok) {
        localStorage.removeItem(PENDING_KEY);
        return { ok: true, saved: true };
      }
      if (response.status < 500 || attempt === 1) return { ok: false, message: payload.message || "Beauty Code 저장에 실패했습니다." };
    } catch {
      if (attempt === 1) return { ok: false, message: "네트워크 연결이 불안정합니다. 결과는 보관되어 있으니 다시 시도해 주세요." };
    }
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return { ok: false, message: "Beauty Code 저장에 실패했습니다." };
}

export default function AccountPage() {
  const { locale } = useLanguage();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    setHasPending(Boolean(localStorage.getItem(PENDING_KEY)));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) { setMessage("비밀번호는 8자 이상으로 입력해 주세요."); return; }
    if (mode === "signup" && password !== confirm) { setMessage("비밀번호 확인이 일치하지 않습니다."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/user-auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ...(mode === "signup" ? { locale } : {}) }),
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; message?: string; requiresEmailConfirmation?: boolean };
      if (!response.ok || !payload.ok) throw new Error(payload.message || (mode === "login" ? "로그인에 실패했습니다." : "회원가입에 실패했습니다."));

      if (payload.requiresEmailConfirmation) {
        setMessage(payload.message || "인증 메일을 확인한 뒤 로그인해 주세요.");
        setMode("login");
        return;
      }

      const saved = await savePendingCode();
      if (!saved.ok) {
        setMessage(`${saved.message} 로그인은 완료되었습니다. My Page에서 다시 저장할 수 있습니다.`);
        window.setTimeout(() => { window.location.href = "/mypage"; }, 1400);
        return;
      }
      window.location.href = "/mypage";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "요청 처리 중 문제가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8f8] px-5 py-12 text-[#382d2d]">
      <section className="mx-auto max-w-md rounded-[2rem] bg-white p-7 shadow-[0_24px_70px_rgba(120,70,80,0.12)] sm:p-9">
        <p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">LAYAD ACCOUNT</p>
        <h1 className="mt-3 text-3xl font-semibold">{mode === "login" ? "로그인" : "회원가입"}</h1>
        <p className="mt-3 text-sm leading-7 text-[#766767]">
          {hasPending ? "방금 만든 Beauty Code는 이 브라우저에 안전하게 보관되어 있습니다. 로그인 후 My Page에 저장됩니다." : "My Page에서 Beauty Code와 저장한 상품을 관리할 수 있습니다."}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-2xl bg-[#fff2f4] p-1">
          <button type="button" onClick={() => { setMode("login"); setMessage(""); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "login" ? "bg-white text-[#a85f6e] shadow-sm" : "text-[#806f72]"}`}>로그인</button>
          <button type="button" onClick={() => { setMode("signup"); setMessage(""); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "signup" ? "bg-white text-[#a85f6e] shadow-sm" : "text-[#806f72]"}`}>회원가입</button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm"><span className="mb-2 block font-medium">이메일</span><input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border border-[#ead7db] px-4 py-3 outline-none focus:border-[#d88c9c]" required /></label>
          <label className="block text-sm"><span className="mb-2 block font-medium">비밀번호</span><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-2xl border border-[#ead7db] px-4 py-3 outline-none focus:border-[#d88c9c]" required /></label>
          {mode === "signup" ? <label className="block text-sm"><span className="mb-2 block font-medium">비밀번호 확인</span><input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full rounded-2xl border border-[#ead7db] px-4 py-3 outline-none focus:border-[#d88c9c]" required /></label> : null}
          {message ? <p className="rounded-2xl bg-[#fff3df] p-4 text-sm leading-6 text-[#9a5a18]">{message}</p> : null}
          <button disabled={busy} className="w-full rounded-2xl bg-[#d88c9c] px-5 py-3.5 font-semibold text-white disabled:opacity-60">{busy ? "처리 중..." : mode === "login" ? "로그인" : "회원가입하고 저장"}</button>
        </form>
        <Link href="/" className="mt-6 block text-center text-sm text-[#806f72] hover:underline">나중에 하기</Link>
      </section>
    </main>
  );
}
