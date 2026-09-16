"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { captureAttribution, trackEvent, trackPageView } from "@/lib/marketing-analytics";

type ClarityFunction = ((...args: unknown[]) => void) & { q?: unknown[][] };
type AnalyticsWindow = Window & { clarity?: ClarityFunction };

const CLARITY_SCRIPT_ID = "layad-clarity-script";
const TEST_SESSION_KEY = "layad_test_started_v1";

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

export default function MarketingAnalytics() {
  const pathname = usePathname();
  const observedMilestones = useRef(new Set<number>());

  useEffect(() => {
    captureAttribution();
    ensureClarity(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "");
  }, []);

  useEffect(() => {
    if (!pathname) return;

    const send = () => {
      trackPageView(pathname);

      if (pathname === "/test") {
        markTestStarted();
        oncePerSession("layad_event_test_start_v1", () => trackEvent("test_start"));
      }

      if (pathname === "/fit") {
        trackEvent("product_analysis_view");
      }

      const resultMatch = pathname.match(/^\/result\/([OD][GM][PC][VE])$/i);
      if (resultMatch) {
        const beautyCode = resultMatch[1].toUpperCase();
        trackEvent("result_view", { beauty_code: beautyCode });

        if (hasTestStarted()) {
          oncePerSession(`layad_event_test_complete_${beautyCode}_v2`, () => {
            trackEvent("test_complete", { beauty_code: beautyCode });
          });
        }
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

      if (/(kakao|카카오|line|라인|share|공유|copy|복사|url|링크)/i.test(text)) {
        trackEvent("share_click", {
          share_channel: shareChannel(text),
          source_path: pathname ?? "",
        });
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
