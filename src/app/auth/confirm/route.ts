import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE, userAuthConfig } from "@/lib/user-auth-server";

const ACCOUNT_URL = "https://layad16.com/account?confirmed=1";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") ?? "email";

  if (!tokenHash) {
    // Supabase's default confirmation flow has already verified the user before
    // redirecting here. Return the browser to the LAYAD account page instead of
    // allowing any localhost fallback to remain visible.
    return NextResponse.redirect(ACCOUNT_URL, { status: 303 });
  }

  const { url, publishableKey } = userAuthConfig();
  if (!url || !publishableKey) {
    return NextResponse.redirect("https://layad16.com/account?confirm_error=config", { status: 303 });
  }

  const verifyResponse = await fetch(`${url}/auth/v1/verify`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token_hash: tokenHash, type }),
    cache: "no-store",
  });

  const payload = await verifyResponse.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!verifyResponse.ok || !payload.access_token) {
    return NextResponse.redirect("https://layad16.com/account?confirm_error=invalid", { status: 303 });
  }

  const response = NextResponse.redirect(ACCOUNT_URL, { status: 303 });
  response.cookies.set(USER_COOKIE, payload.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Number(payload.expires_in ?? 3600)),
  });
  return response;
}
