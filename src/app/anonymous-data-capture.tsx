"use client";

import { useEffect, useMemo, useState } from "react";

const ANSWERS_KEY = "layad-test-answers";
const SESSION_KEY = "layad-supabase-session-id";
const SAVED_CODE_KEY = "layad-saved-beauty-code";

type AnswerMap = Record<number, string>;
type AgeBand =
  | "14-19"
  | "20-29"
  | "30-39"
  | "40-49"
  | "50-59"
  | "60+"
  | "prefer_not_to_say";

const ageOptions: Array<{ value: AgeBand; label: string }> = [
  { value: "14-19", label: "14–19세" },
  { value: "20-29", label: "20–29세" },
  { value: "30-39", label: "30–39세" },
  { value: "40-49", label: "40–49세" },
  { value: "50-59", label: "50–59세" },
  { value: "60+", label: "60세 이상" },
  { value: "prefer_not_to_say", label: "응답하지 않음" },
];

function readAnswers(): AnswerMap {
  try {
    return JSON.parse(sessionStorage.getItem(ANSWERS_KEY) ?? "{}") as AnswerMap;
  } catch {
    return {};
  }
}

function findBeautyCode() {
  const candidates = Array.from(document.querySelectorAll("h1, p"));
  return candidates
    .map((element) => element.textContent?.trim() ?? "")
    .find((text) => /^[OD][GM][PC][VE]$/.test(text));
}

function findCurrentQuestionId() {
  const label = Array.from(document.querySelectorAll("p")).find((element) =>
    element.textContent?.trim().startsWith("QUESTION "),
  );
  const match = label?.textContent?.match(/QUESTION\s+(\d{1,2})/);
  return match ? Number(match[1]) : null;
}

function findAnswerCode(button: HTMLButtonElement) {
  const possible = Array.from(button.querySelectorAll("span"))
    .map((element) => element.textContent?.trim() ?? "")
    .find((text) => /^[ODGMPCVE]$/.test(text));
  return possible ?? null;
}

export default function AnonymousDataCapture() {
  const [beautyCode, setBeautyCode] = useState<string | null>(null);
  const [showAgePrompt, setShowAgePrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const isTestPath = useMemo(
    () => typeof window !== "undefined" && window.location.pathname === "/test",
    [],
  );

  useEffect(() => {
    if (!isTestPath) return;

    const clickHandler = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest("button");
      if (!(button instanceof HTMLButtonElement)) return;

      const questionId = findCurrentQuestionId();
      const answerCode = findAnswerCode(button);
      if (questionId && answerCode) {
        const answers = readAnswers();
        answers[questionId] = answerCode;
        sessionStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
      }

      if (button.textContent?.includes("테스트 다시 하기")) {
        sessionStorage.removeItem(ANSWERS_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SAVED_CODE_KEY);
        setBeautyCode(null);
        setShowAgePrompt(false);
        setSaveMessage("");
      }
    };

    const inspectResult = () => {
      const code = findBeautyCode();
      if (!code) return;
      setBeautyCode(code);

      const savedCode = sessionStorage.getItem(SAVED_CODE_KEY);
      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (savedCode !== code || !sessionId) setShowAgePrompt(true);
    };

    document.addEventListener("click", clickHandler);
    inspectResult();
    const observer = new MutationObserver(inspectResult);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", clickHandler);
      observer.disconnect();
    };
  }, [isTestPath]);

  useEffect(() => {
    const submitHandler = async (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!(form instanceof HTMLFormElement)) return;
      const submitButton = form.querySelector('button[type="submit"]');
      if (!submitButton?.textContent?.includes("적합도 분석하기")) return;

      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) return;

      const input = form.querySelector("input") as HTMLInputElement | null;
      const inputValue = input?.value.trim();
      if (!inputValue) return;

      const inputType = /^https?:\/\//i.test(inputValue) ? "url" : "name";
      try {
        await fetch("/api/product-analysis-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, inputType, inputValue }),
        });
      } catch {
        // Existing product request UI must continue even if persistence is temporarily unavailable.
      }
    };

    document.addEventListener("submit", submitHandler, true);
    return () => document.removeEventListener("submit", submitHandler, true);
  }, []);

  const saveSession = async (ageBand: AgeBand | null) => {
    if (!beautyCode || saving) return;
    setSaving(true);
    setSaveMessage("");

    const answers = Object.entries(readAnswers()).map(([questionId, selectedCode]) => ({
      questionId: Number(questionId),
      selectedCode,
    }));

    try {
      const response = await fetch("/api/anonymous-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beautyCode,
          beautyCodeSource: "test",
          ageBand,
          answers,
        }),
      });

      const result = (await response.json()) as { ok?: boolean; sessionId?: string; code?: string };
      if (!response.ok || !result.ok || !result.sessionId) {
        if (result.code === "SUPABASE_NOT_CONFIGURED") {
          localStorage.setItem(
            "layad-pending-session",
            JSON.stringify({ beautyCode, beautyCodeSource: "test", ageBand, answers }),
          );
          setSaveMessage("현재 저장 준비 중입니다. 결과는 이 기기에 임시 보관되었습니다.");
        } else {
          setSaveMessage("저장에 실패했습니다. 결과 화면은 계속 이용할 수 있습니다.");
        }
        return;
      }

      sessionStorage.setItem(SESSION_KEY, result.sessionId);
      sessionStorage.setItem(SAVED_CODE_KEY, beautyCode);
      localStorage.removeItem("layad-pending-session");
      setShowAgePrompt(false);
      setSaveMessage("익명 테스트 데이터가 저장되었습니다.");
    } catch {
      localStorage.setItem(
        "layad-pending-session",
        JSON.stringify({ beautyCode, beautyCodeSource: "test", ageBand, answers }),
      );
      setSaveMessage("네트워크 문제로 이 기기에 임시 보관했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!isTestPath || (!showAgePrompt && !saveMessage)) return null;

  return (
    <>
      {showAgePrompt ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4">
          <section className="w-full max-w-md rounded-3xl bg-white p-6 text-[#382d2d] shadow-2xl sm:p-8">
            <p className="text-center text-xs font-semibold tracking-[0.18em] text-[#b97b88]">OPTIONAL</p>
            <h2 className="mt-3 text-center text-xl font-semibold">연령대를 선택해 주세요</h2>
            <p className="mt-3 text-center text-sm leading-6 text-[#766767]">
              서비스 개선을 위한 선택 항목입니다. 정확한 나이와 생년월일은 저장하지 않습니다.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {ageOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={saving}
                  onClick={() => saveSession(option.value)}
                  className="rounded-2xl border border-[#ead7db] bg-[#fffafa] px-3 py-3 text-sm font-semibold transition hover:border-[#d88c9c] hover:bg-[#fff0f2] disabled:opacity-60"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveSession(null)}
              className="mt-4 w-full rounded-full px-4 py-3 text-sm text-[#7e7070] hover:bg-[#fff5f6] disabled:opacity-60"
            >
              선택하지 않고 저장
            </button>
          </section>
        </div>
      ) : null}

      {saveMessage ? (
        <div className="fixed bottom-5 left-1/2 z-[110] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-[#382d2d] px-5 py-4 text-center text-sm text-white shadow-xl">
          {saveMessage}
        </div>
      ) : null}
    </>
  );
}
