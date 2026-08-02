"use client";

import Link from "next/link";
import { useState } from "react";

type ODCode = "O" | "D";

type TestOption = {
  code: ODCode;
  title: string;
  description: string;
};

type TestQuestion = {
  id: number;
  axis: "O / D";
  question: string;
  options: TestOption[];
};

const questions: TestQuestion[] = [
  {
    id: 1,
    axis: "O / D",
    question: "메이크업을 시작할 때 나는 보통 어떻게 접근하나요?",
    options: [
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
    ],
  },
  {
    id: 2,
    axis: "O / D",
    question: "새로운 메이크업을 시도할 때 나는 어느 쪽에 더 가깝나요?",
    options: [
      {
        code: "O",
        title: "완성될 전체 이미지를 떠올리며 시도한다",
        description: "색감과 분위기가 서로 어울리는지를 중심으로 선택하는 편이다.",
      },
      {
        code: "D",
        title: "단계별 방법과 제품 기능을 확인하며 시도한다",
        description: "각 단계가 어떤 역할을 하는지 확인한 뒤 적용하는 편이다.",
      },
    ],
  },
  {
    id: 3,
    axis: "O / D",
    question: "메이크업 결과가 마음에 들지 않을 때 나는 어떻게 점검하나요?",
    options: [
      {
        code: "O",
        title: "전체 인상과 조화를 다시 살펴본다",
        description: "얼굴 전체의 분위기와 색감이 자연스럽게 이어지는지 먼저 본다.",
      },
      {
        code: "D",
        title: "문제가 생긴 단계와 제품을 찾아본다",
        description: "베이스, 눈, 입술 등 구체적인 단계에서 원인을 확인하는 편이다.",
      },
    ],
  },
  {
    id: 4,
    axis: "O / D",
    question: "시간이 부족할 때 메이크업 순서를 정하는 기준은 무엇인가요?",
    options: [
      {
        code: "O",
        title: "전체 인상을 가장 잘 살리는 표현부터 한다",
        description: "짧은 시간에도 원하는 분위기가 드러나는 부분을 먼저 선택한다.",
      },
      {
        code: "D",
        title: "꼭 필요한 기능과 단계를 우선한다",
        description: "자외선 차단, 피부 보정처럼 필요한 기능부터 순서대로 진행한다.",
      },
    ],
  },
  {
    id: 5,
    axis: "O / D",
    question: "메이크업 정보를 볼 때 더 도움이 되는 설명은 무엇인가요?",
    options: [
      {
        code: "O",
        title: "어떤 이미지와 분위기를 만들 수 있는지 보여주는 설명",
        description: "전체 스타일과 인상이 어떻게 달라지는지 알려주는 내용이 좋다.",
      },
      {
        code: "D",
        title: "어떤 제품을 어느 단계에서 쓰는지 알려주는 설명",
        description: "구체적인 사용 순서와 기능을 알려주는 내용이 더 실용적이다.",
      },
    ],
  },
];

export default function TestPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ODCode>>({});
  const [axisResult, setAxisResult] = useState<ODCode | null>(null);

  const currentQuestion = questions[currentIndex];
  const selectedCode = answers[currentQuestion.id] ?? null;
  const progress = (currentQuestion.id / 20) * 100;
  const isFirstQuestion = currentIndex === 0;
  const isLastODQuestion = currentIndex === questions.length - 1;

  const selectAnswer = (code: ODCode) => {
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: code,
    }));
    setAxisResult(null);
  };

  const moveNext = () => {
    if (!selectedCode || isLastODQuestion) return;
    setCurrentIndex((index) => index + 1);
  };

  const movePrevious = () => {
    if (isFirstQuestion) return;
    setAxisResult(null);
    setCurrentIndex((index) => index - 1);
  };

  const calculateODResult = () => {
    const completedAnswers = questions.map((question) => answers[question.id]);
    if (completedAnswers.some((answer) => !answer)) return;

    const oScore = completedAnswers.filter((answer) => answer === "O").length;
    setAxisResult(oScore >= 3 ? "O" : "D");
  };

  const oScore = Object.values(answers).filter((answer) => answer === "O").length;
  const dScore = Object.values(answers).filter((answer) => answer === "D").length;

  if (axisResult) {
    return (
      <main className="min-h-screen bg-[#f7f2ed] px-5 py-6 text-[#241f1b] sm:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_24px_80px_rgba(70,48,35,0.12)]">
          <header className="flex items-center justify-between border-b border-black/5 px-6 py-5 sm:px-10">
            <Link href="/" className="group">
              <p className="text-xs font-semibold tracking-[0.32em] text-[#9b6c55]">LAYAD</p>
              <p className="mt-1 text-sm font-medium group-hover:text-[#9b6c55]">BEAUTY CODE</p>
            </Link>
            <p className="text-sm font-medium text-[#8a7d75]">5 / 20</p>
          </header>

          <section className="flex flex-1 items-center px-6 py-12 sm:px-12">
            <div className="mx-auto w-full max-w-2xl text-center">
              <p className="text-xs font-semibold tracking-[0.24em] text-[#9b6c55]">O / D AXIS COMPLETE</p>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">첫 번째 축 결과는 {axisResult}입니다.</h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#776a62]">
                5개 응답 중 {axisResult} 코드가 3점 이상을 받아 O/D 축 결과로 결정되었습니다.
                이 결과는 규칙 기반 판정이며 AI 분석이 아닙니다.
              </p>

              <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-4">
                <div className={`rounded-3xl border p-5 ${axisResult === "O" ? "border-[#9b6c55] bg-[#f5ebe5]" : "border-[#eadfd7]"}`}>
                  <p className="text-3xl font-semibold">O</p>
                  <p className="mt-2 text-sm text-[#776a62]">{oScore}점</p>
                </div>
                <div className={`rounded-3xl border p-5 ${axisResult === "D" ? "border-[#9b6c55] bg-[#f5ebe5]" : "border-[#eadfd7]"}`}>
                  <p className="text-3xl font-semibold">D</p>
                  <p className="mt-2 text-sm text-[#776a62]">{dScore}점</p>
                </div>
              </div>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setAxisResult(null);
                    setCurrentIndex(4);
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[#d8c5b8] px-6 text-sm font-semibold transition hover:bg-[#f7f2ed]"
                >
                  응답 다시 보기
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex h-12 cursor-not-allowed items-center justify-center rounded-full bg-[#c9bfba] px-7 text-sm font-semibold text-white"
                >
                  다음 축은 다음 단계에서 연결
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f2ed] px-5 py-6 text-[#241f1b] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_24px_80px_rgba(70,48,35,0.12)]">
        <header className="flex items-center justify-between border-b border-black/5 px-6 py-5 sm:px-10">
          <Link href="/" className="group">
            <p className="text-xs font-semibold tracking-[0.32em] text-[#9b6c55]">LAYAD</p>
            <p className="mt-1 text-sm font-medium group-hover:text-[#9b6c55]">BEAUTY CODE</p>
          </Link>
          <p className="text-sm font-medium text-[#8a7d75]">{currentQuestion.id} / 20</p>
        </header>

        <section className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 sm:py-14">
          <div className="mx-auto w-full max-w-2xl">
            <div className="h-2 overflow-hidden rounded-full bg-[#eee6e0]">
              <div className="h-full rounded-full bg-[#9b6c55] transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>

            <p className="mt-8 text-xs font-semibold tracking-[0.22em] text-[#9b6c55]">
              QUESTION {String(currentQuestion.id).padStart(2, "0")} · {currentQuestion.axis}
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">{currentQuestion.question}</h1>
            <p className="mt-4 text-base leading-7 text-[#776a62]">평소 나와 더 가까운 선택지를 하나 골라주세요. 정답은 없습니다.</p>

            <div className="mt-8 grid gap-4">
              {currentQuestion.options.map((option) => {
                const selected = selectedCode === option.code;
                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => selectAnswer(option.code)}
                    aria-pressed={selected}
                    className={`rounded-3xl border p-5 text-left transition sm:p-6 ${selected ? "border-[#9b6c55] bg-[#f5ebe5] shadow-[0_12px_30px_rgba(93,62,46,0.10)]" : "border-[#eadfd7] bg-white hover:-translate-y-0.5 hover:border-[#c8aa98] hover:bg-[#fcf8f5]"}`}
                  >
                    <div className="flex items-start gap-4">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${selected ? "bg-[#2d2521] text-white" : "bg-[#f2ebe6] text-[#7d6558]"}`}>{option.code}</span>
                      <span>
                        <span className="block text-lg font-semibold leading-7">{option.title}</span>
                        <span className="mt-2 block text-sm leading-6 text-[#81736b]">{option.description}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              {isFirstQuestion ? (
                <Link href="/" className="inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-medium text-[#71645d] transition hover:bg-[#f7f2ed]">처음 화면으로</Link>
              ) : (
                <button type="button" onClick={movePrevious} className="inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-medium text-[#71645d] transition hover:bg-[#f7f2ed]">이전 질문</button>
              )}

              <button
                type="button"
                onClick={isLastODQuestion ? calculateODResult : moveNext}
                disabled={!selectedCode}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#2d2521] px-7 text-sm font-semibold text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-black disabled:cursor-not-allowed disabled:bg-[#c9bfba]"
              >
                {!selectedCode ? "선택지를 골라주세요" : isLastODQuestion ? "O/D 결과 확인" : "다음 질문"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
