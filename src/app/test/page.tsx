"use client";

import Link from "next/link";
import { useState } from "react";

const options = [
  {
    code: "O",
    title: "먼저 전체 분위기와 방향을 정한다",
    description: "오늘 표현하고 싶은 이미지와 전체 인상을 먼저 생각하는 편이다.",
  },
  {
    code: "D",
    title: "필요한 단계와 제품부터 정한다",
    description: "오늘 필요한 기능과 사용할 제품을 먼저 정하는 편이다.",
  },
];

export default function TestPage() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-[#f7f2ed] px-5 py-6 text-[#241f1b] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_24px_80px_rgba(70,48,35,0.12)]">
        <header className="flex items-center justify-between border-b border-black/5 px-6 py-5 sm:px-10">
          <Link href="/" className="group">
            <p className="text-xs font-semibold tracking-[0.32em] text-[#9b6c55]">
              LAYAD
            </p>
            <p className="mt-1 text-sm font-medium group-hover:text-[#9b6c55]">
              BEAUTY CODE
            </p>
          </Link>
          <p className="text-sm font-medium text-[#8a7d75]">1 / 20</p>
        </header>

        <section className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 sm:py-14">
          <div className="mx-auto w-full max-w-2xl">
            <div className="h-2 overflow-hidden rounded-full bg-[#eee6e0]">
              <div className="h-full w-[5%] rounded-full bg-[#9b6c55]" />
            </div>

            <p className="mt-8 text-xs font-semibold tracking-[0.22em] text-[#9b6c55]">
              QUESTION 01 · O / D
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
              메이크업을 시작할 때 나는 보통 어떻게 접근하나요?
            </h1>
            <p className="mt-4 text-base leading-7 text-[#776a62]">
              평소 나와 더 가까운 선택지를 하나 골라주세요. 정답은 없습니다.
            </p>

            <div className="mt-8 grid gap-4">
              {options.map((option) => {
                const selected = selectedCode === option.code;

                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => setSelectedCode(option.code)}
                    aria-pressed={selected}
                    className={`rounded-3xl border p-5 text-left transition sm:p-6 ${
                      selected
                        ? "border-[#9b6c55] bg-[#f5ebe5] shadow-[0_12px_30px_rgba(93,62,46,0.10)]"
                        : "border-[#eadfd7] bg-white hover:-translate-y-0.5 hover:border-[#c8aa98] hover:bg-[#fcf8f5]"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          selected
                            ? "bg-[#2d2521] text-white"
                            : "bg-[#f2ebe6] text-[#7d6558]"
                        }`}
                      >
                        {option.code}
                      </span>
                      <span>
                        <span className="block text-lg font-semibold leading-7">
                          {option.title}
                        </span>
                        <span className="mt-2 block text-sm leading-6 text-[#81736b]">
                          {option.description}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-medium text-[#71645d] transition hover:bg-[#f7f2ed]"
              >
                처음 화면으로
              </Link>
              <button
                type="button"
                disabled={!selectedCode}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#2d2521] px-7 text-sm font-semibold text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-black disabled:cursor-not-allowed disabled:bg-[#c9bfba]"
              >
                {selectedCode ? "선택 완료" : "선택지를 골라주세요"}
              </button>
            </div>

            {selectedCode && (
              <p className="mt-5 text-center text-sm text-[#8a7d75]">
                1번 선택이 저장되었습니다. 다음 질문 연결은 다음 개발 단계에서
                진행합니다.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
