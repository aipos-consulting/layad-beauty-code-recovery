"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { captureAttribution, trackEvent, trackPageView } from "@/lib/marketing-analytics";

type ClarityFunction = ((...args: unknown[]) => void) & { q?: unknown[][] };
type AnalyticsWindow = Window & { clarity?: ClarityFunction };

const CLARITY_SCRIPT_ID = "layad-clarity-script";
const TEST_SESSION_KEY = "layad_test_started_v1";
const MARKETING_VISIT_KEY = "layad-marketing-visit-id-v1";

function ensureClarity(projectId: string) {
  if (typeof window === "undefined" || !projectId) return;

  const analyticsWindow = window as AnalyticsWindow;
  if (!analyticsWindow.clarity) {
    const clarity = ((...args: unknown[]) => {
      clarity.q = clarity.q ?? [];
      clarity.q.push(args);
    }) as ClarityFunction;
    analyticsWindow.clarity = clarity;
  }

  if (!document.getElementById(CLARITY_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = CLARITY_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
    document.head.appendChild(script);
  }
}

function oncePerSession(key: string, action: () => void) {
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Tracking must never block the product flow.
  }
  action();
}

function getVisitId() {
  try {
    const existing = window.sessionStorage.getItem(MARKETING_VISIT_KEY);
    if (existing) return existing;
    const created = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `mv_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    window.sessionStorage.setItem(MARKETING_VISIT_KEY, created);
    return created;
  } catch {
    return `mv_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function postAttribution(payload: Record<string, unknown>) {
  const visitId = getVisitId();
  void fetch("/api/marketing-attribution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitId, ...payload }),
    keepalive: true,
  }).catch(() => undefined);
}

function captureServerAttribution() {
  const params = new URLSearchParams(window.location.search);
  postAttribution({
    action: "visit",
    landingPath: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || null,
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term"),
    campaignId: params.get("campaign_id") ?? params.get("utm_id"),
    adsetId: params.get("adset_id"),
    adId: params.get("ad_id"),
    placement: params.get("placement"),
    siteSourceName: params.get("site_source_name"),
    hasFbclid: params.has("fbclid"),
  });
}

function markTestStarted() {
  try {
    window.sessionStorage.setItem(TEST_SESSION_KEY, "1");
  } catch {
    // Analytics must never interrupt the user experience.
  }
}

function hasTestStarted() {
  try {
    return window.sessionStorage.getItem(TEST_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function shareChannel(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.includes("kakao") || normalized.includes("카카오")) return "kakao";
  if (normalized.includes("line") || normalized.includes("라인")) return "line";
  if (normalized.includes("copy") || normalized.includes("복사") || normalized.includes("url") || normalized.includes("링크")) return "url_copy";
  return "other";
}

function beautyCodeFromPage() {
  const heading = Array.from(document.querySelectorAll("h1,h2"))
    .map((element) => element.textContent?.trim().toUpperCase() ?? "")
    .find((value) => /^[OD][GM][PC][VE]$/.test(value));
  if (heading) return heading;
  const match = window.location.pathname.match(/\/(?:result|s)\/([OD][GM][PC][VE])$/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export default function MarketingAnalytics() {
  const pathname = usePathname();
  const observedMilestones = useRef(new Set<number>());
  const observedInlineCompletions = useRef(new Set<string>());

  useEffect(() => {
    captureAttribution();
    captureServerAttribution();
    ensureClarity(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "");
  }, []);

  useEffect(() => {
    if (!pathname) return;

    if (pathname === "/test") {
      markTestStarted();
      postAttribution({ action: "test_start" });
    }

    const resultMatchForAttribution = pathname.match(/^\/result\/([OD][GM][PC][VE])$/i);
    if (resultMatchForAttribution) {
      postAttribution({
        action: "test_complete",
        beautyCode: resultMatchForAttribution[1].toUpperCase(),
      });
    }

    const send = () => {
      trackPageView(pathname);

      if (pathname === "/test") {
        oncePerSession("layad_event_test_start_v1", () => {
          trackEvent("test_start");
        });
      }

      if (pathname === "/fit") {
        trackEvent("product_analysis_view");
      }

      const resultMatch = pathname.match(/^\/result\/([OD][GM][PC][VE])$/i);
      if (resultMatch) {
        const beautyCode = resultMatch[1].toUpperCase();
        trackEvent("result_view", { beauty_code: beautyCode });

        oncePerSession(`layad_event_test_complete_${beautyCode}_v2`, () => {
          trackEvent("test_complete", { beauty_code: beautyCode });
        });
      }

      const sharedMatch = pathname.match(/^\/s\/([OD][GM][PC][VE])$/i);
      if (sharedMatch) {
        trackEvent("shared_result_view", { beauty_code: sharedMatch[1].toUpperCase() });
      }
    };

    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      send();
      return;
    }

    const timer = window.setInterval(() => {
      if (typeof window.gtag === "function") {
        window.clearInterval(timer);
        send();
      }
    }, 100);

    const timeout = window.setTimeout(() => window.clearInterval(timer), 5000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/test") return;

    const inspectTest = () => {
      const text = document.body.innerText;
      const normalizedText = text.toUpperCase();
      const headingCode = Array.from(document.querySelectorAll("h1,h2"))
        .map((element) => element.textContent?.trim().toUpperCase() ?? "")
        .find((value) => /^[OD][GM][PC][VE]$/.test(value));
      const textCode = normalizedText.match(/\b([OD][GM][PC][VE])\b/)?.[1];
      const resultCode = headingCode ?? textCode;
      const isResultScreen = normalizedText.includes("YOUR BEAUTY CODE") || Boolean(headingCode);

      if (isResultScreen && resultCode && !observedInlineCompletions.current.has(resultCode)) {
        observedInlineCompletions.current.add(resultCode);

        postAttribution({ action: "test_complete", beautyCode: resultCode });

        oncePerSession(`layad_event_test_complete_inline_${resultCode}_v4`, () => {
          trackEvent("test_complete", { beauty_code: resultCode });
        });
        oncePerSession(`layad_event_result_view_inline_${resultCode}_v2`, () => {
          trackEvent("result_view", { beauty_code: resultCode });
        });
      }

      const progressMatch = text.match(/\b(\d{1,2})\s*\/\s*20\b/);
      if (!progressMatch) return;

      const question = Number(progressMatch[1]);
      const milestones = [
        { question: 5, percent: 25 },
        { question: 10, percent: 50 },
        { question: 15, percent: 75 },
      ];

      milestones.forEach(({ question: threshold, percent }) => {
        if (question >= threshold && !observedMilestones.current.has(percent)) {
          observedMilestones.current.add(percent);
          trackEvent("test_progress", { percent, current_question: question });
        }
      });
    };

    inspectTest();
    const observer = new MutationObserver(inspectTest);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a,button") : null;
      if (!target) return;

      const text = (target.textContent ?? "").trim();
      const href = target instanceof HTMLAnchorElement ? target.getAttribute("href") ?? "" : "";

      if (href === "/fit" || href.startsWith("/fit?")) {
        trackEvent("product_analysis_click", { source_path: pathname ?? "" });
      }

      if (href.includes("cafe.naver.com/layad16")) {
        trackEvent("naver_cafe_click", { source_path: pathname ?? "" });
      }

      if (/(kakao|카카오|line|라인|share|공유|copy|복사|url|링크)/i.test(text)) {
        const channel = shareChannel(text);
        trackEvent("share_click", {
          share_channel: channel,
          source_path: pathname ?? "",
        });

        const isActualKakaoShare = channel === "kakao" && /^\/s\/[OD][GM][PC][VE]$/i.test(pathname ?? "");
        const isCopyShare = channel === "url_copy";
        if (isActualKakaoShare || isCopyShare) {
          postAttribution({
            action: "share_click",
            shareChannel: channel,
            sourcePath: pathname ?? "",
            beautyCode: beautyCodeFromPage(),
          });
        }
      }
    };

    const onSubmit = (event: SubmitEvent) => {
      if (pathname !== "/fit") return;
      if (event.target instanceof HTMLFormElement) {
        trackEvent("product_analysis_submit");
      }
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [pathname]);

  return null;
}
