import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function resolveRole(request: NextRequest) {
  const token = request.cookies.get("layad_staff_access")?.value;
  if (!token || !supabaseUrl || !publishableKey) return null;

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!userResponse.ok) return null;
  const user = await userResponse.json() as { id?: string; app_metadata?: { staff_role?: "ceo" | "admin" } };
  if (!user.id) return null;

  const metadataRole = user.app_metadata?.staff_role;
  if (metadataRole === "ceo" || metadataRole === "admin") return metadataRole;

  const roleResponse = await fetch(`${supabaseUrl}/rest/v1/staff_roles?user_id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!roleResponse.ok) return null;
  const rows = await roleResponse.json() as Array<{ role?: "ceo" | "admin" }>;
  return rows[0]?.role ?? null;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/ceo/login" || path === "/ceo/activate" || path === "/api/ceo-activate" || path === "/admin/login" || path.startsWith("/api/staff-auth/") || path === "/staff-setup" || path === "/api/staff-setup") return NextResponse.next();

  const protectsCeo = path === "/ceo" || path.startsWith("/ceo/") || path === "/api/admin/dashboard" || path === "/api/admin/ai-usage";
  const protectsAdmin = path === "/admin" || path.startsWith("/admin/") || (path.startsWith("/api/admin/") && !protectsCeo);
  if (!protectsCeo && !protectsAdmin) return NextResponse.next();

  const role = await resolveRole(request);
  if (protectsAdmin && role !== "admin") {
    if (path.startsWith("/api/")) return NextResponse.json({ ok: false, code: "ADMIN_AUTH_REQUIRED" }, { status: 401 });
    const login = request.nextUrl.clone(); login.pathname = "/admin/login"; login.search = ""; return NextResponse.redirect(login);
  }
  if (protectsCeo && role !== "ceo" && role !== "admin") {
    if (path.startsWith("/api/")) return NextResponse.json({ ok: false, code: "CEO_AUTH_REQUIRED" }, { status: 401 });
    const login = request.nextUrl.clone(); login.pathname = "/ceo/login"; login.search = ""; return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/ceo/:path*", "/admin/:path*", "/api/admin/:path*", "/api/staff-auth/:path*", "/api/ceo-activate", "/staff-setup", "/api/staff-setup"] };
