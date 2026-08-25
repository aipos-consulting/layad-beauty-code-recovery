"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

type MenuItem = { label: string; href: string };
type MenuGroup = { label: string; items: MenuItem[] };

const menuGroups: MenuGroup[] = [
  { label: "대시보드", items: [{ label: "대시보드", href: "/admin" }, { label: "사용자 통계 상세", href: "/admin/statistics" }] },
  { label: "상품 운영", items: [{ label: "상품 신청 정보", href: "/admin/requests" }, { label: "분석 작업", href: "/admin/analysis" }, { label: "상품 일괄 분석", href: "/admin/batch-import" }, { label: "분석 데이터 조회", href: "/admin/analysis-data" }, { label: "키워드 테이블 조회", href: "/admin/keywords" }, { label: "스마트스토어 연결", href: "/admin/smartstore" }, { label: "상품 관리", href: "/admin/products" }, { label: "적합도 결과", href: "/admin/results" }] },
  { label: "Beauty Code", items: [{ label: "유형별 캐릭터 관리", href: "/admin/beauty-code-characters" }] },
  { label: "커뮤니티", items: [{ label: "커뮤니티 관리", href: "/admin/community" }] },
  { label: "데이터 관리", items: [{ label: "운영 데이터 관리", href: "/admin/data-management" }] },
  { label: "시스템", items: [{ label: "접근 권한 관리", href: "/admin/access-management" }, { label: "운영 설정 · Cost Control", href: "/admin/settings" }] },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const isLogin = pathname === "/admin/login";
  const isHomeDashboard = pathname === "/admin";
  if (isLogin) return <>{children}</>;

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/staff-auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      window.location.replace("/admin/login");
    }
  }

  return (
    <div className="min-h-screen bg-[#fbf7f7] text-[#382d2d] lg:flex">
      <aside className="hidden min-h-screen w-64 shrink-0 border-r border-[#eadfe1] bg-white px-4 py-6 lg:flex lg:flex-col" style={{ minWidth: 256, maxWidth: 256 }}>
        <div className="px-3"><p className="text-lg font-semibold tracking-[.12em] text-[#a94f65]">LAYAD SYSTEM ADMIN</p></div>
        <nav className="mt-7 flex-1 space-y-6">
          {menuGroups.map(group => <section key={group.label}><p className="px-3 text-[11px] font-semibold tracking-[.12em] text-[#a39598]">{group.label}</p><div className="mt-2 space-y-1">{group.items.map(item => <Link key={item.href} href={item.href} className={`block rounded-xl px-3 py-3 text-sm transition ${isActive(pathname, item.href) ? "bg-[#fff0f3] font-semibold text-[#a94f65]" : "text-[#65585b] hover:bg-[#fbf3f5]"}`}>{item.label}</Link>)}</div></section>)}
        </nav>
        <div className="mt-6 space-y-2">
          <Link href="/ceo" className="block rounded-xl border border-[#eadfe1] px-3 py-3 text-center text-sm font-semibold text-[#65585b] hover:bg-[#fbf3f5]">CEO Dashboard</Link>
          <Link href="/" className="block rounded-xl border border-[#eadfe1] px-3 py-3 text-center text-sm font-semibold text-[#65585b] hover:bg-[#fbf3f5]">사용자 화면</Link>
          <button type="button" onClick={() => void logout()} disabled={loggingOut} className="block w-full rounded-xl border border-[#e5c7cc] px-3 py-3 text-center text-sm font-semibold text-[#a94f65] hover:bg-[#fff0f3] disabled:opacity-50">{loggingOut ? "로그아웃 중..." : "로그아웃"}</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="border-b border-[#eadfe1] bg-white px-3 py-3 lg:hidden">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {menuGroups.map(group => group.items.map(item => <Link key={item.href} href={item.href} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm ${isActive(pathname, item.href) ? "bg-[#a94f65] font-semibold text-white" : "bg-[#f5ecee] text-[#65585b]"}`}>{item.label}</Link>))}
            <button type="button" onClick={() => void logout()} disabled={loggingOut} className="shrink-0 whitespace-nowrap rounded-full border border-[#e5c7cc] bg-white px-4 py-2 text-sm font-semibold text-[#a94f65] disabled:opacity-50">{loggingOut ? "로그아웃 중..." : "로그아웃"}</button>
          </div>
        </div>
        <div className={`admin-route-content min-w-0 overflow-x-hidden ${isHomeDashboard ? "admin-home-dashboard" : ""}`}>{children}</div>
      </div>

      <style>{`
        .admin-route-content aside { display: none !important; }
        .admin-route-content main { width: 100% !important; min-width: 0 !important; overflow-x: hidden !important; }
        .admin-route-content main > div { min-width: 0 !important; width: 100% !important; }
        .admin-route-content table { max-width: 100%; }
        @media (max-width: 1023px) {
          .admin-home-dashboard,.admin-home-dashboard main,.admin-home-dashboard main > div,.admin-home-dashboard main > div > section { width: 100% !important; min-width: 0 !important; max-width: none !important; }
          .admin-home-dashboard main > div { display: block !important; min-height: 0 !important; }
          .admin-home-dashboard main > div > aside { display: none !important; }
          .admin-home-dashboard main > div > section { display: block !important; }
          .admin-home-dashboard main > div > section > header { display: none !important; }
          .admin-home-dashboard main > div > section > div { width: 100% !important; min-width: 0 !important; max-width: none !important; padding: 16px !important; }
          .admin-home-dashboard article,.admin-home-dashboard section,.admin-home-dashboard div { min-width: 0 !important; }
          .admin-home-dashboard .grid { grid-template-columns: minmax(0, 1fr) !important; }
          .admin-home-dashboard pre,.admin-home-dashboard select,.admin-home-dashboard input { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
