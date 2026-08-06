import type { ReactNode } from "react";
import AdminNavigationFix from "./admin-navigation-fix";
import AdminSettingsClickGuard from "./admin-settings-click-guard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminNavigationFix />
      <AdminSettingsClickGuard />
      {children}
    </>
  );
}
