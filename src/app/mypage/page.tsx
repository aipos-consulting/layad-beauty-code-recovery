"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PENDING_KEY = "layad-pending-beauty-code-v1";
const PENDING_PRODUCT_KEY = "layad-pending-saved-product-v1";

type CodeRow = { id: string; beauty_code: string; source: string; axis_scores: Record<string, number>; is_current: boolean; created_at: string };
type ProductRow = { id: string; product_ref: string; product_name: string | null; beauty_code: string | null; fit_score: number | null; created_at: string };
type PageData = { user: { email: string; nickname: string | null }; codes: CodeRow[]; products: ProductRow[] };

const axisPairs = [["O","D"],["G","M"],["P","C"],["V","E"]] as const;

export default function MyPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/mypage", { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; code?: string } & Partial<PageData>;
      if (response.status === 401 || payload.code === "AUTH_REQUIRED") { setAuthRequired(true); setData(null); return; }
      if (!response.ok || !payload.ok) throw new Error();
      setData({ user: payload.user!, codes: payload.codes ?? [], products: payload.products ?? [] });
      setAuthRequired(false);
    } catch {
      setMessage("My Page를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    setPending(Boolean(localStorage.getItem(PENDING_KEY)));
    setPendingProduct(Boolean(localStorage.getItem(PENDING_PRODUCT_KEY)));
    void load();
  }, []);

  async function savePending() {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) { setPending(false); return; }
    setBusy(true); setMessage("");
    try {
      const body = JSON.parse(raw) as Record<string, unknown>;
      let lastMessage = "Beauty Code 저장에 실패했습니다.";
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await fetch("/api/mypage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-code", ...body }) });
          const payload = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
          if (response.ok && payload.ok) {
            localStorage.removeItem(PENDING_KEY); setPending(false); setMessage("Beauty Code가 저장되었습니다."); await load(); return;
          }
          lastMessage = payload.message || lastMessage;
          if (response.status < 500) break;
        } catch { lastMessage = "네트워크 연결이 불안정합니다."; }
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      setMessage(`${lastMessage} 결과는 이 브라우저에 계속 보관되어 있습니다.`);
    } catch { setMessage("저장 대기 데이터를 확인하지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function savePendingProduct() {
    const raw = localStorage.getItem(PENDING_PRODUCT_KEY);
    if (!raw) { setPendingProduct(false); return; }
    setBusy(true); setMessage("");
    try {
      const body = JSON.parse(raw) as Record<string, unknown>;
      let lastMessage = "상품 저장에 실패했습니다.";
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await fetch("/api/mypage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-product", ...body }) });
          const payload = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
          if (response.ok && payload.ok) {
            localStorage.removeItem(PENDING_PRODUCT_KEY); setPendingProduct(false); setMessage("상품이 My Page에 저장되었습니다."); await load(); return;
          }
          lastMessage = payload.message || lastMessage;
          if (response.status < 500) break;
        } catch { lastMessage = "네트워크 연결이 불안정합니다."; }
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      setMessage(`${lastMessage} 상품 정보는 이 브라우저에 계속 보관되어 있습니다.`);
    } catch { setMessage("저장 대기 상품 정보를 확인하지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/user-auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/";
  }

  if (loading) return <main className="min-h-screen bg-[#fff8f8] px-5 py-16 text-center text-[#806f72]">My Page를 불러오는 중입니다.</main>;
  if (authRequired) return (
    <main className="min-h-screen bg-[#fff8f8] px-5 py-14 text-[#382d2d]">
      <section className="mx-auto max-w-md rounded-[2rem] bg-white p-8 text-center shadow-[0_24px_70px_rgba(120,70,80,0.12)]">
        <p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">MY PAGE</p>
        <h1 className="mt-4 text-3xl font-semibold">내 Beauty Code를 저장하세요</h1>
        <p className="mt-4 text-sm leading-7 text-[#766767]">비회원으로도 테스트와 상품 조회는 계속 이용할 수 있습니다. 저장과 이력 관리를 원할 때만 로그인하면 됩니다.</p>
        <Link href="/account" className="mt-7 block rounded-2xl bg-[#d88c9c] px-5 py-3.5 font-semibold text-white">로그인 · 회원가입</Link>
        <Link href="/test" className="mt-3 block rounded-2xl border border-[#ead7db] px-5 py-3.5 font-semibold text-[#806f72]">Beauty Code 테스트하기</Link>
      </section>
    </main>
  );

  const current = data?.codes.find(code => code.is_current) ?? data?.codes[0] ?? null;
  return (
    <main className="min-h-screen bg-[#fff8f8] px-5 py-10 text-[#382d2d] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold tracking-[.22em] text-[#b97b88]">MY PAGE</p><h1 className="mt-2 text-3xl font-semibold">나의 LAYAD</h1><p className="mt-2 text-sm text-[#806f72]">{data?.user.nickname || data?.user.email}</p></div>
          <button onClick={logout} className="rounded-full border border-[#ead7db] px-5 py-2.5 text-sm font-semibold text-[#806f72]">로그아웃</button>
        </header>

        {message ? <p className="mt-6 rounded-2xl bg-[#fff3df] p-4 text-sm leading-6 text-[#9a5a18]">{message}</p> : null}
        {pending ? <section className="mt-6 rounded-3xl border border-[#f0cdd4] bg-white p-6"><h2 className="text-lg font-semibold">저장 대기 중인 Beauty Code가 있습니다.</h2><p className="mt-2 text-sm leading-6 text-[#806f72]">이전 저장 중 오류가 있었더라도 결과는 브라우저에 남아 있습니다.</p><button onClick={savePending} disabled={busy} className="mt-4 rounded-2xl bg-[#d88c9c] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "저장 중..." : "다시 저장하기"}</button></section> : null}
        {pendingProduct ? <section className="mt-4 rounded-3xl border border-[#f0cdd4] bg-white p-6"><h2 className="text-lg font-semibold">저장 대기 중인 상품이 있습니다.</h2><p className="mt-2 text-sm leading-6 text-[#806f72]">로그인 전 또는 네트워크 오류 시 보관한 상품 적합도 결과입니다.</p><button onClick={savePendingProduct} disabled={busy} className="mt-4 rounded-2xl bg-[#d88c9c] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "저장 중..." : "상품 저장하기"}</button></section> : null}

        <section className="mt-7 rounded-[2rem] bg-white p-7 shadow-[0_18px_50px_rgba(120,70,80,0.09)]">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold tracking-[.18em] text-[#b97b88]">MY BEAUTY CODE</p><h2 className="mt-2 text-2xl font-semibold">현재 Beauty Code</h2></div><Link href="/test" className="text-sm font-semibold text-[#a85f6e]">다시 테스트</Link></div>
          {current ? <div className="mt-6 rounded-3xl bg-[#fff3f5] p-7 text-center"><p className="text-5xl font-semibold tracking-[.18em] text-[#d88c9c]">{current.beauty_code}</p><p className="mt-3 text-sm text-[#806f72]">{new Date(current.created_at).toLocaleDateString("ko-KR")} 저장</p>{current.axis_scores && Object.keys(current.axis_scores).length ? <div className="mt-6 grid gap-2 sm:grid-cols-4">{axisPairs.map(([first,second]) => <div key={`${first}${second}`} className="rounded-2xl bg-white/80 px-3 py-3 text-sm"><p className="font-semibold text-[#a85f6e]">{first} / {second}</p><p className="mt-1 text-xs text-[#806f72]">{first} {current.axis_scores[first] ?? 0} · {second} {current.axis_scores[second] ?? 0}</p></div>)}</div> : null}</div> : <div className="mt-6 rounded-3xl border border-dashed border-[#e6cfd4] p-7 text-center"><p className="text-sm text-[#806f72]">아직 저장된 Beauty Code가 없습니다.</p><Link href="/test" className="mt-4 inline-block rounded-full bg-[#d88c9c] px-5 py-2.5 text-sm font-semibold text-white">테스트 시작</Link></div>}
        </section>

        <div className="mt-7 grid gap-7 md:grid-cols-2">
          <section className="rounded-[2rem] bg-white p-7 shadow-[0_18px_50px_rgba(120,70,80,0.09)]"><h2 className="text-xl font-semibold">Beauty Code 이력</h2><div className="mt-5 space-y-3">{data?.codes.length ? data.codes.map(code => <div key={code.id} className="flex items-center justify-between rounded-2xl bg-[#fffafa] px-4 py-3"><span className="font-semibold text-[#a85f6e]">{code.beauty_code}</span><span className="text-xs text-[#8a7a7d]">{new Date(code.created_at).toLocaleDateString("ko-KR")}</span></div>) : <p className="text-sm text-[#806f72]">저장 이력이 없습니다.</p>}</div></section>
          <section className="rounded-[2rem] bg-white p-7 shadow-[0_18px_50px_rgba(120,70,80,0.09)]"><h2 className="text-xl font-semibold">저장한 상품</h2><div className="mt-5 space-y-3">{data?.products.length ? data.products.map(product => <div key={product.id} className="rounded-2xl bg-[#fffafa] px-4 py-3"><div className="flex items-start justify-between gap-3"><p className="font-semibold">{product.product_name || product.product_ref}</p>{typeof product.fit_score === "number" ? <span className="shrink-0 rounded-full bg-[#fff0f2] px-3 py-1 text-sm font-bold text-[#a85f6e]">{product.fit_score}</span> : null}</div><p className="mt-1 text-xs text-[#8a7a7d]">{product.beauty_code ? `${product.beauty_code} 기준` : ""} · {new Date(product.created_at).toLocaleDateString("ko-KR")}</p></div>) : <p className="text-sm text-[#806f72]">아직 저장한 상품이 없습니다.</p>}</div></section>
        </div>
      </div>
    </main>
  );
}
