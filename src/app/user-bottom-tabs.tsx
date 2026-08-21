"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "홈", href: "/", icon: "⌂" },
  { label: "적합도분석", href: "/test", icon: "✦" },
  { label: "커뮤니티", href: "/community", icon: "♡" },
  { label: "My Page", href: "/mypage", icon: "◎" },
];

function active(pathname:string, href:string){
  if(href==="/") return pathname==="/";
  return pathname===href || pathname.startsWith(`${href}/`);
}

export default function UserBottomTabs(){
  const pathname=usePathname();
  if(pathname.startsWith("/admin") || pathname.startsWith("/ceo")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d8d0c7] bg-[#F6F4F0]/95 pb-[max(env(safe-area-inset-bottom),8px)] backdrop-blur md:hidden" aria-label="사용자 메뉴">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map(tab=>{
          const on=active(pathname,tab.href);
          return <Link key={tab.href} href={tab.href} className={`flex min-h-[62px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${on?"text-[#9b5f61]":"text-[#736c66]"}`}>
            <span className={`text-xl leading-none ${on?"scale-110":""}`}>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>;
        })}
      </div>
    </nav>
  );
}
