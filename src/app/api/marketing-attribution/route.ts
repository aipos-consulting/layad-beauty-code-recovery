import { NextRequest, NextResponse } from "next/server";

type Body = {
  visitId?: string;
  action?: "visit" | "test_start" | "test_complete" | "link_session" | "naver_cafe_click" | "share_click";
  landingPath?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  campaignId?: string | null;
  adsetId?: string | null;
  adId?: string | null;
  placement?: string | null;
  siteSourceName?: string | null;
  hasFbclid?: boolean;
  beautyCode?: string | null;
  sessionId?: string | null;
  shareChannel?: string | null;
  sourcePath?: string | null;
};

function config() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

function text(value: unknown, max = 180) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function validVisitId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(value);
}

export async function POST(request: NextRequest) {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, code: "BAD_REQUEST" }, { status: 400 });
  }

  if (!validVisitId(body.visitId)) {
    return NextResponse.json({ ok: false, code: "INVALID_VISIT_ID" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const action = body.action ?? "visit";

  if (action === "share_click") {
    const channel = text(body.shareChannel, 40);
    if (!channel) return NextResponse.json({ ok: false, code: "INVALID_SHARE_CHANNEL" }, { status: 400 });

    const sharePayload = {
      visit_id: body.visitId,
      channel,
      source_path: text(body.sourcePath, 300),
      beauty_code: typeof body.beautyCode === "string" && /^[OD][GM][PC][VE]$/.test(body.beautyCode) ? body.beautyCode : null,
      created_at: now,
    };

    const shareResponse = await fetch(`${url}/rest/v1/marketing_share_events`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(sharePayload),
      cache: "no-store",
    });

    if (!shareResponse.ok) {
      const detail = await shareResponse.text();
      console.error("marketing share event write failed", shareResponse.status, detail);
      return NextResponse.json({ ok: false, code: "SHARE_WRITE_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  const payload: Record<string, unknown> = {
    visit_id: body.visitId,
    last_seen_at: now,
    updated_at: now,
  };

  if (action === "visit") {
    payload.landing_path = text(body.landingPath, 500);
    payload.referrer = text(body.referrer, 500);
    payload.utm_source = text(body.utmSource);
    payload.utm_medium = text(body.utmMedium);
    payload.utm_campaign = text(body.utmCampaign);
    payload.utm_content = text(body.utmContent);
    payload.utm_term = text(body.utmTerm);
    payload.campaign_id = text(body.campaignId);
    payload.adset_id = text(body.adsetId);
    payload.ad_id = text(body.adId);
    payload.placement = text(body.placement);
    payload.site_source_name = text(body.siteSourceName);
    payload.has_fbclid = Boolean(body.hasFbclid);
  } else if (action === "test_start") {
    payload.test_started = true;
  } else if (action === "test_complete") {
    payload.test_started = true;
    payload.test_completed = true;
    if (typeof body.beautyCode === "string" && /^[OD][GM][PC][VE]$/.test(body.beautyCode)) {
      payload.beauty_code = body.beautyCode;
    }
  } else if (action === "link_session") {
    if (typeof body.sessionId === "string" && /^[0-9a-f-]{36}$/i.test(body.sessionId)) {
      payload.test_session_id = body.sessionId;
    }
  } else if (action === "naver_cafe_click") {
    payload.naver_cafe_clicked = true;
    payload.naver_cafe_clicked_at = now;
  }

  const response = await fetch(`${url}/rest/v1/marketing_visits?on_conflict=visit_id`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("marketing attribution write failed", response.status, detail);
    return NextResponse.json({ ok: false, code: "WRITE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
