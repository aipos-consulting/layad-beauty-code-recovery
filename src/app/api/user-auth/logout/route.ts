import { NextResponse } from "next/server";
import { USER_COOKIE, USER_PERSIST_COOKIE } from "@/lib/user-auth-server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
  response.cookies.set(USER_COOKIE, "", options);
  response.cookies.set(USER_PERSIST_COOKIE, "", options);
  return response;
}
