"use client";

import { usePathname } from "next/navigation";

export default function ToneSurface({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <div className={isAdmin ? undefined : "layad-user-tone"}>
      {children}
    </div>
  );
}
