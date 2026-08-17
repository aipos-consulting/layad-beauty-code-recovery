"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type MenuItem = { label: string; href: string };
type MenuGroup = { label: string; items: MenuItem[] };

const menuGroups: MenuGroup[] = [
  { label: "대시보드", items: [{ label: "대시보드", href: "/admin" }, { label: "사용자 통계 상세", href: "/admin/statistics" }] },
  { label: "상품 운영", items: [{ label: "상품 신청 정보", href: "/admin/requests" }, { label: "분석 작업", href: "/admin/analysis" }, { label: "상품 관리", href: "/admin/products" }, { label: "적합도 결과", href: "/admin/results" }] },
  { label: "데이터 관리", items: [{ label: "운영 데이터 관리", href: "/admin/data-management" }] },
  { label: "운영 설정", items: [{ label: "운영 설정", href: "/admin/settings" }] },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#fbf7f7] text-[#382d2d] lg:flex">
      <aside className="hidden min-h-screen w-64 shrink-0 border-r border-[#eadfe1] bg-white px-4 py-6 lg:flex lg:flex-col" style={{ minWidth: 256, maxWidth: 256 }}>
        <div className="px-3">
          <p className="text-lg font-semibold tracking-[.12em] text-[#a94f65]">LAYAD ADMIN</p>
        </div>
        <nav className="mt-7 flex-1 space-y-6">
          {menuGroups.map(group => (
            <section key={group.label}>
              <p className="px-3 text-[11px] font-semibold tracking-[.12em] text-[#a39598]">{group.label}</p>
              <div className="mt-2 space-y-1">
                {group.items.map(item => (
                  <Link key={item.href} href={item.href} className={`block rounded-xl px-3 py-3 text-sm transition ${isActive(pathname, item.href) ? "bg-[#fff0f3] font-semibold text-[#a94f65]" : "text-[#65585b] hover:bg-[#fbf3f5]"}`}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </nav>
        <Link href="/" className="mt-6 rounded-xl border border-[#eadfe1] px-3 py-3 text-center text-sm font-semibold text-[#65585b] hover:bg-[#fbf3f5]">사용자 화면</Link>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="border-b border-[#eadfe1] bg-white px-4 py-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {menuGroups.map(group => group.items.map(item => (
              <Link key={item.href} href={item.href} className={`shrink-0 rounded-full px-4 py-2 text-sm ${isActive(pathname, item.href) ? "bg-[#a94f65] font-semibold text-white" : "bg-[#f5ecee] text-[#65585b]"}`}>
                {item.label}
              </Link>
            )))}
          </div>
        </div>
        <div className="admin-route-content min-w-0 overflow-x-hidden">{children}</div>
      </div>

      <style>{`
        .admin-route-content aside { display: none !important; }
        .admin-route-content main { width: 100% !important; min-width: 0 !important; overflow-x: hidden !important; }
        .admin-route-content main > div { min-width: 0 !important; width: 100% !important; }
        .admin-route-content table { max-width: 100%; }
        .admin-route-content header > div > p:first-child { display: none !important; }
        .admin-route-content header > div > h1 { margin-top: 0 !important; }
      `}</style>
    </div>
  );
}
