import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const common = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 0 };
  response.cookies.set("layad_staff_access_v2", "", common);
  response.cookies.set("layad_staff_access", "", common);
  return response;
}
