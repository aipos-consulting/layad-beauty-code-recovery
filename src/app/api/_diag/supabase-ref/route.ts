import { NextResponse } from "next/server";

export async function GET() {
  const raw = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let host = "";
  try {
    host = raw ? new URL(raw).hostname : "";
  } catch {
    host = "invalid";
  }
  const projectRef = host.endsWith(".supabase.co") ? host.replace(/\.supabase\.co$/, "") : "";
  return NextResponse.json({ configured: Boolean(raw), host, projectRef });
}
