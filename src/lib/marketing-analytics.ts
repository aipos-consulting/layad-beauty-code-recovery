export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_path?: string;
  captured_at?: string;
};

const FIRST_TOUCH_KEY = "layad_utm_first_touch_v1";
const LAST_TOUCH_KEY = "layad_utm_last_touch_v1";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readStorage(key: string): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: Attribution) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Analytics must never interrupt the user experience.
  }
}

export function captureAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const touch: Attribution = {};
  let hasUtm = false;

  UTM_KEYS.forEach((key) => {
    const value = params.get(key)?.trim();
    if (value) {
      touch[key] = value;
      hasUtm = true;
    }
  });

  if (!hasUtm) return readStorage(LAST_TOUCH_KEY) ?? readStorage(FIRST_TOUCH_KEY);

  touch.landing_path = `${window.location.pathname}${window.location.search}`;
  touch.captured_at = new Date().toISOString();

  if (!readStorage(FIRST_TOUCH_KEY)) writeStorage(FIRST_TOUCH_KEY, touch);
  writeStorage(LAST_TOUCH_KEY, touch);
  return touch;
}

export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  return readStorage(LAST_TOUCH_KEY) ?? readStorage(FIRST_TOUCH_KEY);
}

export function trackEvent(name: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  const attribution = getAttribution();
  window.gtag("event", name, {
    ...attribution,
    ...params,
  });
}

export function trackPageView(path: string) {
  trackEvent("page_view", {
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
    page_title: typeof document !== "undefined" ? document.title : undefined,
  });
}
