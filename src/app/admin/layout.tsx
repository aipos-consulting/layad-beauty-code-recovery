import type { ReactNode } from "react";
import AdminNavigationFix from "./admin-navigation-fix";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminNavigationFix />
      {children}
    </>
  );
}
