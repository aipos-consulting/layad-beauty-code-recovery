"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./i18n";

const labels = {
  ko: { home: "홈", fit: "적합도분석", community: "커뮤니티", mypage: "My Page", aria: "사용자 메뉴" },
  en: { home: "Home", fit: "Fit Analysis", community: "Community", mypage: "My Page", aria: "User menu" },
  ja: { home: "ホーム", fit: "適合度分析", community: "コミュニティ", mypage: "My Page", aria: "ユーザーメニュー" },
} as const;

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function UserBottomTabs() {
  const pathname = usePathname();
  const { locale } = useLanguage();
  if (pathname.startsWith("/admin") || pathname.startsWith("/ceo")) return null;

  const t = labels[locale];
  const tabs = [
    { label: t.home, href: "/", icon: "⌂" },
    { label: t.fit, href: "/fit", icon: "✦" },
    { label: t.community, href: "/community", icon: "♡" },
    { label: t.mypage, href: "/mypage", icon: "◎" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d8d0c7] bg-[#F6F4F0]/95 pb-[max(env(safe-area-inset-bottom),8px)] backdrop-blur md:hidden" aria-label={t.aria}>
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map((tab) => {
          const on = active(pathname, tab.href);
          return (
            <Link key={tab.href} href={tab.href} className={`flex min-h-[62px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${on ? "text-[#9b5f61]" : "text-[#736c66]"}`}>
              <span className={`text-xl leading-none ${on ? "scale-110" : ""}`}>{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
