import { NextResponse } from "next/server";
import { USER_COOKIE } from "@/lib/user-auth-server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(USER_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
