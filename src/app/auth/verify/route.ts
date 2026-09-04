import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminUserClient } from "@/lib/user-auth-server";

const ACCOUNT_URL = "https://layad16.com/account";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.redirect(`${ACCOUNT_URL}?confirm_error=missing`, { status: 303 });

  const supabase = adminUserClient();
  if (!supabase) return NextResponse.redirect(`${ACCOUNT_URL}?confirm_error=config`, { status: 303 });

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: verification, error } = await supabase
    .from("layad_email_verifications")
    .select("id,user_id,expires_at,used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !verification?.id || verification.used_at || new Date(String(verification.expires_at)).getTime() <= Date.now()) {
    return NextResponse.redirect(`${ACCOUNT_URL}?confirm_error=invalid`, { status: 303 });
  }

  const now = new Date().toISOString();
  const { error: userError } = await supabase
    .from("layad_users")
    .update({ email_verified: true, updated_at: now })
    .eq("id", verification.user_id);
  if (userError) return NextResponse.redirect(`${ACCOUNT_URL}?confirm_error=update`, { status: 303 });

  await supabase.from("layad_email_verifications").update({ used_at: now }).eq("id", verification.id);
  return NextResponse.redirect(`${ACCOUNT_URL}?confirmed=1`, { status: 303 });
}
