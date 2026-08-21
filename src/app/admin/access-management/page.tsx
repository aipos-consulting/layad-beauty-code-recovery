"use client";

import { useEffect, useState } from "react";

type StaffUser = { id: string; email: string; role: "admin" | "ceo"; createdAt: string; lastSignInAt: string | null };

type Payload = { ok: boolean; users?: StaffUser[]; message?: string; activationUrl?: string; email?: string; expiresAt?: string };

export default function AccessManagementPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [activationUrl, setActivationUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/access-management", { cache: "no-store" });
    const payload = await response.json() as Payload;
    if (response.ok && payload.ok) setUsers(payload.users ?? []);
    else setMessage(payload.message || "접근 권한 조회에 실패했습니다.");
  }
  useEffect(() => { void load(); }, []);

  async function invite(action: "invite-ceo" | "reset-ceo", targetEmail = email) {
    setBusy(true); setMessage(""); setActivationUrl("");
    try {
      const response = await fetch("/api/admin/access-management", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, email: targetEmail }) });
      const payload = await response.json() as Payload;
      if (!response.ok || !payload.ok) throw new Error(payload.message || "CEO 키 생성에 실패했습니다.");
      setActivationUrl(payload.activationUrl ?? "");
      setMessage(`${payload.email} CEO 활성화 키를 생성했습니다. 링크는 24시간 동안 1회만 사용할 수 있습니다.`);
      if (action === "invite-ceo") setEmail("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "CEO 키 생성에 실패했습니다."); }
    finally { setBusy(false); }
  }

  async function revoke(user: StaffUser) {
    if (!confirm(`${user.email}의 CEO 권한을 해제하시겠습니까?`)) return;
    setBusy(true); setMessage(""); setActivationUrl("");
    try {
      const response = await fetch("/api/admin/access-management", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke-ceo", userId: user.id }) });
      const payload = await response.json() as Payload;
      if (!response.ok || !payload.ok) throw new Error(payload.message || "CEO 권한 해제에 실패했습니다.");
      setMessage(`${user.email}의 CEO 권한을 해제했습니다.`); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "CEO 권한 해제에 실패했습니다."); }
    finally { setBusy(false); }
  }

  async function copyLink() {
    if (!activationUrl) return;
    await navigator.clipboard.writeText(activationUrl);
    setMessage("CEO 활성화 링크를 복사했습니다.");
  }

  return <main className="min-h-screen px-5 py-8 sm:px-8"><div className="mx-auto max-w-5xl"><div><p className="text-xs font-semibold tracking-[.16em] text-[#a94f65]">SYSTEM ADMIN</p><h1 className="mt-2 text-3xl font-semibold">접근 권한 관리</h1><p className="mt-2 text-sm leading-6 text-[#78696c]">Master Admin은 CEO 계정을 발급·재설정·회수할 수 있습니다. CEO 비밀번호는 CEO 본인이 1회성 링크에서 직접 설정합니다.</p></div>

  <section className="mt-7 rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">CEO 계정 발급</h2><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="CEO 이메일" className="min-w-0 flex-1 rounded-xl border border-[#dfd2d5] px-4 py-3 outline-none focus:border-[#b97b88]"/><button disabled={busy || !email} onClick={() => void invite("invite-ceo")} className="rounded-xl bg-[#382d2d] px-5 py-3 font-semibold text-white disabled:opacity-50">CEO 키 생성</button></div>{activationUrl ? <div className="mt-4 rounded-2xl bg-[#f8f2f3] p-4"><p className="text-xs font-semibold text-[#a94f65]">1회성 CEO 활성화 링크</p><p className="mt-2 break-all text-sm text-[#65585b]">{activationUrl}</p><button onClick={() => void copyLink()} className="mt-3 rounded-lg border border-[#dfd2d5] bg-white px-4 py-2 text-sm font-semibold">링크 복사</button></div> : null}{message ? <p className="mt-4 rounded-xl bg-[#fff7e6] px-4 py-3 text-sm text-[#8a5a00]">{message}</p> : null}</section>

  <section className="mt-6 rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">운영 계정</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-[#eadfe1] text-[#78696c]"><th className="px-3 py-3">이메일</th><th className="px-3 py-3">권한</th><th className="px-3 py-3">최근 로그인</th><th className="px-3 py-3 text-right">관리</th></tr></thead><tbody>{users.map(user => <tr key={user.id} className="border-b border-[#f0e8ea]"><td className="px-3 py-4 font-medium">{user.email}</td><td className="px-3 py-4"><span className="rounded-full bg-[#f6ecee] px-3 py-1 text-xs font-semibold">{user.role === "admin" ? "Master Admin" : "CEO"}</span></td><td className="px-3 py-4 text-[#78696c]">{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString("ko-KR") : "—"}</td><td className="px-3 py-4 text-right">{user.role === "ceo" ? <div className="flex justify-end gap-2"><button disabled={busy} onClick={() => void invite("reset-ceo", user.email)} className="rounded-lg border border-[#dfd2d5] px-3 py-2 text-xs font-semibold">재설정 키</button><button disabled={busy} onClick={() => void revoke(user)} className="rounded-lg border border-[#e5c7cc] px-3 py-2 text-xs font-semibold text-[#a94f65]">권한 해제</button></div> : <span className="text-xs text-[#9a8d90]">보호됨</span>}</td></tr>)}</tbody></table></div></section></div></main>;
}
