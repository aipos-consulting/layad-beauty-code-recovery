import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STAFF_COOKIE = "layad_staff_access_v2";
const STAFF_PERSIST_COOKIE = "layad_staff_persist_v1";

type StaffRole = "ceo" | "admin";
type PersistedStaff = { id: string; email?: string; role: StaffRole; exp: number };

function readPersistentStaff(value: string | undefined): PersistedStaff | null {
  if (!value || !serviceRoleKey) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", serviceRoleKey).update(encoded).digest("base64url");
  try {
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as PersistedStaff;
    if (!payload.id || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (payload.role !== "ceo" && payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

async function currentRoleById(id: string): Promise<StaffRole | null> {
  if (!supabaseUrl || !serviceRoleKey) return null;
  const response = await fetch(`${supabaseUrl}/rest/v1/staff_roles?user_id=eq.${encodeURIComponent(id)}&select=role&limit=1`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []) as Array<{ role?: StaffRole }>;
  const role = rows[0]?.role;
  return role === "ceo" || role === "admin" ? role : null;
}

async function resolveRole(request: NextRequest) {
  const token = request.cookies.get(STAFF_COOKIE)?.value;
  if (token && supabaseUrl && publishableKey) {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (userResponse.ok) {
      const user = await userResponse.json() as { id?: string; app_metadata?: { staff_role?: StaffRole } };
      if (user.id) {
        const metadataRole = user.app_metadata?.staff_role;
        if (metadataRole === "ceo" || metadataRole === "admin") return metadataRole;
        const roleResponse = await fetch(`${supabaseUrl}/rest/v1/staff_roles?user_id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`, {
          headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (roleResponse.ok) {
          const rows = await roleResponse.json() as Array<{ role?: StaffRole }>;
          const role = rows[0]?.role;
          if (role === "ceo" || role === "admin") return role;
        }
      }
    }
  }

  const persisted = readPersistentStaff(request.cookies.get(STAFF_PERSIST_COOKIE)?.value);
  if (!persisted) return null;
  // Re-check the current server-side role on every protected request so revoked staff access stops immediately.
  return currentRoleById(persisted.id);
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isLoginPage = path === "/ceo/login" || path === "/admin/login";
  if (isLoginPage) {
    const role = await resolveRole(request);
    if (role === "ceo" || role === "admin") {
      const destination = request.nextUrl.clone();
      destination.pathname = path === "/admin/login" ? "/admin" : "/ceo";
      destination.search = "";
      return NextResponse.redirect(destination);
    }
    return NextResponse.next();
  }
  if (path === "/ceo/activate" || path === "/api/ceo-activate" || path.startsWith("/api/staff-auth/")) return NextResponse.next();

  const protectsCeo = path === "/ceo" || path.startsWith("/ceo/") || path === "/api/admin/dashboard" || path === "/api/admin/ai-usage";
  const protectsAdmin = path === "/admin" || path.startsWith("/admin/") || (path.startsWith("/api/admin/") && !protectsCeo);
  if (!protectsCeo && !protectsAdmin) return NextResponse.next();

  const role = await resolveRole(request);
  if (protectsAdmin && role !== "admin" && role !== "ceo") {
    if (path.startsWith("/api/")) return NextResponse.json({ ok: false, code: "ADMIN_AUTH_REQUIRED" }, { status: 401 });
    const login = request.nextUrl.clone(); login.pathname = "/admin/login"; login.search = ""; return NextResponse.redirect(login);
  }
  if (protectsCeo && role !== "ceo" && role !== "admin") {
    if (path.startsWith("/api/")) return NextResponse.json({ ok: false, code: "CEO_AUTH_REQUIRED" }, { status: 401 });
    const login = request.nextUrl.clone(); login.pathname = "/ceo/login"; login.search = ""; return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/ceo/:path*", "/admin/:path*", "/api/admin/:path*", "/api/staff-auth/:path*", "/api/ceo-activate"] };
