"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { LanguageSwitcher, useLanguage } from "@/app/i18n";

const PENDING_KEY = "layad-pending-beauty-code-v1";

type PendingCode = { beautyCode: string; source: string; axisScores?: Record<string, number>; clientRef: string };

const copy = {
  ko: {
    login: "로그인", signup: "회원가입", pending: "방금 만든 Beauty Code는 이 브라우저에 안전하게 보관되어 있습니다. 로그인 후 My Page에 저장됩니다.",
    desc: "로그인하면 Beauty Code와 상품 적합도 결과를 저장하고 언제든 다시 볼 수 있습니다.", email: "이메일", password: "비밀번호", confirm: "비밀번호 확인",
    busy: "처리 중...", signupSave: "회원가입하고 저장", later: "나중에 하기", shortPw: "비밀번호는 8자 이상으로 입력해 주세요.", mismatch: "비밀번호 확인이 일치하지 않습니다.",
    loginFail: "로그인에 실패했습니다.", signupFail: "회원가입에 실패했습니다.", requestFail: "요청 처리 중 문제가 발생했습니다. 다시 시도해 주세요.",
    verify: "인증 메일을 확인한 뒤 로그인해 주세요.", saveFail: "Beauty Code 저장에 실패했습니다.", network: "네트워크 연결이 불안정합니다. 결과는 보관되어 있으니 다시 시도해 주세요.",
    savedLogin: "로그인은 완료되었습니다. My Page에서 다시 저장할 수 있습니다.", benefit: "로그인하면 내 Beauty Code와 분석 기록이 저장됩니다.",
  },
  en: {
    login: "Sign in", signup: "Sign up", pending: "Your Beauty Code is safely kept in this browser. Sign in to save it to My Page.",
    desc: "Sign in to save your Beauty Code and product-fit results and revisit them anytime.", email: "Email", password: "Password", confirm: "Confirm password",
    busy: "Please wait...", signupSave: "Sign up and save", later: "Continue without signing in", shortPw: "Password must be at least 8 characters.", mismatch: "Passwords do not match.",
    loginFail: "Sign-in failed.", signupFail: "Sign-up failed.", requestFail: "Something went wrong. Please try again.",
    verify: "Please verify your email, then sign in.", saveFail: "Could not save your Beauty Code.", network: "The network is unstable. Your result is still stored in this browser.",
    savedLogin: "You are signed in. You can retry saving from My Page.", benefit: "Sign in to keep your Beauty Code and analysis history.",
  },
  ja: {
    login: "ログイン", signup: "会員登録", pending: "作成したBeauty Codeはこのブラウザに安全に保存されています。ログインするとMy Pageに保存できます。",
    desc: "ログインするとBeauty Codeと商品適合度の結果を保存し、いつでも見返せます。", email: "メールアドレス", password: "パスワード", confirm: "パスワード確認",
    busy: "処理中...", signupSave: "会員登録して保存", later: "ログインせずに続ける", shortPw: "パスワードは8文字以上で入力してください。", mismatch: "パスワードが一致しません。",
    loginFail: "ログインに失敗しました。", signupFail: "会員登録に失敗しました。", requestFail: "処理中に問題が発生しました。もう一度お試しください。",
    verify: "認証メールを確認してからログインしてください。", saveFail: "Beauty Codeを保存できませんでした。", network: "ネットワークが不安定です。結果はこのブラウザに保存されています。",
    savedLogin: "ログインは完了しました。My Pageから保存を再試行できます。", benefit: "ログインするとBeauty Codeと分析履歴を保存できます。",
  },
} as const;

async function savePendingCode(fallback: { saveFail: string; network: string }) {
  const raw = localStorage.getItem(PENDING_KEY);
  if (!raw) return { ok: true, saved: false };
  let pending: PendingCode;
  try { pending = JSON.parse(raw) as PendingCode; } catch { localStorage.removeItem(PENDING_KEY); return { ok: true, saved: false }; }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("/api/mypage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-code", ...pending }) });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean };
      if (response.ok && payload.ok) { localStorage.removeItem(PENDING_KEY); return { ok: true, saved: true }; }
      if (response.status < 500 || attempt === 1) return { ok: false, message: fallback.saveFail };
    } catch { if (attempt === 1) return { ok: false, message: fallback.network }; }
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return { ok: false, message: fallback.saveFail };
}

export default function AccountPage() {
  const { locale } = useLanguage();
  const t = copy[locale];
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => { setHasPending(Boolean(localStorage.getItem(PENDING_KEY))); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) { setMessage(t.shortPw); return; }
    if (mode === "signup" && password !== confirm) { setMessage(t.mismatch); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/user-auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, locale }) });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; requiresEmailConfirmation?: boolean };
      if (!response.ok || !payload.ok) {
        if (response.status === 403) throw new Error(t.verify);
        throw new Error(mode === "login" ? t.loginFail : t.signupFail);
      }
      if (payload.requiresEmailConfirmation) { setMessage(t.verify); setMode("login"); return; }
      const saved = await savePendingCode({ saveFail: t.saveFail, network: t.network });
      if (!saved.ok) { setMessage(`${saved.message} ${t.savedLogin}`); window.setTimeout(() => { window.location.href = "/mypage"; }, 1400); return; }
      window.location.href = "/mypage";
    } catch (error) { setMessage(error instanceof Error ? error.message : t.requestFail); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#fff8f8] px-5 py-10 text-[#382d2d]">
      <section className="mx-auto max-w-md rounded-[2rem] bg-white p-7 shadow-[0_24px_70px_rgba(120,70,80,0.12)] sm:p-9">
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">LAYAD ACCOUNT</p><LanguageSwitcher compact /></div>
        <h1 className="mt-4 text-3xl font-semibold">{mode === "login" ? t.login : t.signup}</h1>
        <p className="mt-3 text-sm leading-7 text-[#766767]">{hasPending ? t.pending : t.desc}</p>
        <p className="mt-3 rounded-2xl bg-[#fff3f5] px-4 py-3 text-sm font-semibold text-[#a85f6e]">{t.benefit}</p>

        <div className="mt-6 grid grid-cols-2 rounded-2xl bg-[#fff2f4] p-1">
          <button type="button" onClick={() => { setMode("login"); setMessage(""); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "login" ? "bg-white text-[#a85f6e] shadow-sm" : "text-[#806f72]"}`}>{t.login}</button>
          <button type="button" onClick={() => { setMode("signup"); setMessage(""); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "signup" ? "bg-white text-[#a85f6e] shadow-sm" : "text-[#806f72]"}`}>{t.signup}</button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm"><span className="mb-2 block font-medium">{t.email}</span><input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border border-[#ead7db] px-4 py-3 outline-none focus:border-[#d88c9c]" required /></label>
          <label className="block text-sm"><span className="mb-2 block font-medium">{t.password}</span><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-2xl border border-[#ead7db] px-4 py-3 outline-none focus:border-[#d88c9c]" required /></label>
          {mode === "signup" ? <label className="block text-sm"><span className="mb-2 block font-medium">{t.confirm}</span><input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full rounded-2xl border border-[#ead7db] px-4 py-3 outline-none focus:border-[#d88c9c]" required /></label> : null}
          {message ? <p className="rounded-2xl bg-[#fff3df] p-4 text-sm leading-6 text-[#9a5a18]">{message}</p> : null}
          <button disabled={busy} className="w-full rounded-2xl bg-[#d88c9c] px-5 py-3.5 font-semibold text-white disabled:opacity-60">{busy ? t.busy : mode === "login" ? t.login : t.signupSave}</button>
        </form>
        <Link href="/" className="mt-6 block text-center text-sm text-[#806f72] hover:underline">{t.later}</Link>
      </section>
    </main>
  );
}
