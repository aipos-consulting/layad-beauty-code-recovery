"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Code = "O" | "D" | "G" | "M" | "P" | "C" | "V" | "E";
type AxisKey = "OD" | "GM" | "PC" | "VE";

type TestOption = {
  code: Code;
  title: string;
  description: string;
};

type TestQuestion = {
  id: number;
  axisKey: AxisKey;
  axisLabel: string;
  question: string;
  options: [TestOption, TestOption];
};

const questions: TestQuestion[] = [
  {
    id: 1,
    axisKey: "OD",
    axisLabel: "O / D",
    question: "메이크업을 시작할 때 나는 보통 어떻게 접근하나요?",
    options: [
      { code: "O", title: "먼저 전체 분위기와 방향을 정한다", description: "오늘 표현하고 싶은 이미지와 전체 인상을 먼저 생각한다." },
      { code: "D", title: "필요한 단계와 제품부터 정한다", description: "오늘 필요한 기능과 사용할 제품을 먼저 정한다." },
    ],
  },
  {
    id: 2,
    axisKey: "OD",
    axisLabel: "O / D",
    question: "새로운 메이크업을 시도할 때 나는 어느 쪽에 더 가깝나요?",
    options: [
      { code: "O", title: "완성될 전체 이미지를 떠올리며 시도한다", description: "색감과 분위기의 조화를 중심으로 선택한다." },
      { code: "D", title: "단계별 방법과 제품 기능을 확인한다", description: "각 단계의 역할을 확인한 뒤 적용한다." },
    ],
  },
  {
    id: 3,
    axisKey: "OD",
    axisLabel: "O / D",
    question: "결과가 마음에 들지 않을 때 나는 어떻게 점검하나요?",
    options: [
      { code: "O", title: "전체 인상과 조화를 다시 본다", description: "얼굴 전체 분위기와 색감의 연결을 먼저 살펴본다." },
      { code: "D", title: "문제가 생긴 단계와 제품을 찾는다", description: "베이스, 눈, 입술 등 구체적인 원인을 확인한다." },
    ],
  },
  {
    id: 4,
    axisKey: "OD",
    axisLabel: "O / D",
    question: "시간이 부족할 때 무엇을 먼저 하나요?",
    options: [
      { code: "O", title: "전체 인상을 가장 잘 살리는 표현", description: "짧은 시간에도 원하는 분위기가 드러나는 부분을 먼저 한다." },
      { code: "D", title: "꼭 필요한 기능과 단계", description: "자외선 차단이나 피부 보정처럼 필요한 단계부터 한다." },
    ],
  },
  {
    id: 5,
    axisKey: "OD",
    axisLabel: "O / D",
    question: "메이크업 정보를 볼 때 더 도움 되는 설명은 무엇인가요?",
    options: [
      { code: "O", title: "이미지와 분위기를 보여주는 설명", description: "전체 스타일과 인상이 어떻게 달라지는지 보고 싶다." },
      { code: "D", title: "제품과 사용 순서를 알려주는 설명", description: "구체적인 사용법과 기능을 알고 싶다." },
    ],
  },
  {
    id: 6,
    axisKey: "GM",
    axisLabel: "G / M · 임시",
    question: "베이스 메이크업의 마무리감은 어느 쪽을 더 선호하나요?",
    options: [
      { code: "G", title: "은은하게 빛나는 광채 표현", description: "피부에 자연스러운 윤기와 생기가 보이는 표현이 좋다." },
      { code: "M", title: "보송하고 차분한 매트 표현", description: "번들거림 없이 정돈된 피부 표현이 좋다." },
    ],
  },
  {
    id: 7,
    axisKey: "GM",
    axisLabel: "G / M · 임시",
    question: "사진을 찍을 때 원하는 피부 표현은 무엇인가요?",
    options: [
      { code: "G", title: "빛을 받아 입체적으로 보이는 피부", description: "광대와 이마에 은은한 반사가 있는 표현을 선호한다." },
      { code: "M", title: "빛 반사 없이 균일한 피부", description: "얼굴 전체가 차분하고 고르게 보이는 표현을 선호한다." },
    ],
  },
  {
    id: 8,
    axisKey: "GM",
    axisLabel: "G / M · 임시",
    question: "하이라이터와 파우더 중 더 자주 손이 가는 것은 무엇인가요?",
    options: [
      { code: "G", title: "하이라이터 또는 광채 제품", description: "윤기와 입체감을 더하는 제품을 자주 사용한다." },
      { code: "M", title: "파우더 또는 유분 조절 제품", description: "보송함과 지속력을 더하는 제품을 자주 사용한다." },
    ],
  },
  {
    id: 9,
    axisKey: "GM",
    axisLabel: "G / M · 임시",
    question: "시간이 지나도 유지되길 바라는 느낌은 무엇인가요?",
    options: [
      { code: "G", title: "자연스러운 윤기와 촉촉함", description: "시간이 지나도 생기 있는 광채가 남기를 원한다." },
      { code: "M", title: "보송함과 깔끔한 표면", description: "시간이 지나도 유분감 없이 정돈되길 원한다." },
    ],
  },
  {
    id: 10,
    axisKey: "GM",
    axisLabel: "G / M · 임시",
    question: "메이크업 제품 설명에서 더 끌리는 표현은 무엇인가요?",
    options: [
      { code: "G", title: "물광, 윤광, 글로우", description: "촉촉하고 빛나는 마무리를 연상시키는 표현이 좋다." },
      { code: "M", title: "세미매트, 소프트매트, 보송", description: "차분하고 매끈한 마무리를 연상시키는 표현이 좋다." },
    ],
  },
  {
    id: 11,
    axisKey: "PC",
    axisLabel: "P / C",
    question: "평소 메이크업 과정에서 더 중요한 것은 무엇인가요?",
    options: [
      { code: "P", title: "세부 표현과 완성도", description: "시간이 조금 더 걸려도 정교하게 마무리하고 싶다." },
      { code: "C", title: "간단한 과정과 편의성", description: "적은 단계로 빠르고 편하게 완성하고 싶다." },
    ],
  },
  {
    id: 12,
    axisKey: "PC",
    axisLabel: "P / C",
    question: "아이 메이크업을 할 때 나는 어느 쪽인가요?",
    options: [
      { code: "P", title: "여러 단계로 경계와 음영을 다듬는다", description: "브러시와 색상을 나눠 세밀하게 표현한다." },
      { code: "C", title: "한두 제품으로 빠르게 마무리한다", description: "손이나 간단한 도구로 자연스럽게 완성한다." },
    ],
  },
  {
    id: 13,
    axisKey: "PC",
    axisLabel: "P / C",
    question: "제품을 선택할 때 더 끌리는 특징은 무엇인가요?",
    options: [
      { code: "P", title: "표현을 세밀하게 조절할 수 있는 제품", description: "색상, 커버력, 질감을 단계적으로 조절하고 싶다." },
      { code: "C", title: "여러 기능을 한 번에 제공하는 제품", description: "한 제품으로 여러 단계를 줄이고 싶다." },
    ],
  },
  {
    id: 14,
    axisKey: "PC",
    axisLabel: "P / C",
    question: "외출 준비 시간이 충분할 때도 나는 어떻게 하나요?",
    options: [
      { code: "P", title: "평소보다 더 정교하게 완성한다", description: "작은 차이까지 확인하며 완성도를 높인다." },
      { code: "C", title: "익숙한 간단 루틴을 유지한다", description: "시간이 있어도 편하고 검증된 방법을 선호한다." },
    ],
  },
  {
    id: 15,
    axisKey: "PC",
    axisLabel: "P / C",
    question: "메이크업 도구 사용에 대한 생각은 무엇인가요?",
    options: [
      { code: "P", title: "목적에 맞는 여러 도구를 활용한다", description: "브러시와 퍼프를 구분해 사용하는 편이다." },
      { code: "C", title: "최소한의 도구로 해결한다", description: "손이나 한두 개의 도구만 있어도 충분하다." },
    ],
  },
  {
    id: 16,
    axisKey: "VE",
    axisLabel: "V / E",
    question: "같은 제품을 사용했을 때 결과는 보통 어떤가요?",
    options: [
      { code: "V", title: "그날 피부와 환경에 따라 달라진다", description: "날씨, 컨디션, 사용량에 따라 결과 차이가 큰 편이다." },
      { code: "E", title: "대체로 비슷하고 안정적이다", description: "같은 방법이면 결과도 비교적 일정한 편이다." },
    ],
  },
  {
    id: 17,
    axisKey: "VE",
    axisLabel: "V / E",
    question: "메이크업 루틴을 반복할 때 나는 어느 쪽인가요?",
    options: [
      { code: "V", title: "상황에 따라 제품과 순서를 자주 바꾼다", description: "피부 상태와 일정에 맞춰 유연하게 조정한다." },
      { code: "E", title: "효과가 검증된 순서를 꾸준히 유지한다", description: "익숙한 제품과 방법으로 안정적으로 진행한다." },
    ],
  },
  {
    id: 18,
    axisKey: "VE",
    axisLabel: "V / E",
    question: "새 제품을 사용할 때 결과를 예측하기 쉬운가요?",
    options: [
      { code: "V", title: "직접 써보기 전에는 예측하기 어렵다", description: "제품과 피부의 조합에 따라 결과가 많이 달라진다." },
      { code: "E", title: "제품 특징을 보면 결과를 대체로 예상한다", description: "비슷한 유형의 제품은 결과도 비교적 일정하다." },
    ],
  },
  {
    id: 19,
    axisKey: "VE",
    axisLabel: "V / E",
    question: "계절이 바뀌면 메이크업 결과는 어떻게 되나요?",
    options: [
      { code: "V", title: "계절마다 표현과 지속력이 크게 달라진다", description: "온도와 습도에 따라 루틴을 많이 바꿔야 한다." },
      { code: "E", title: "조금 조정하면 비슷한 결과를 유지한다", description: "계절이 달라도 기본적인 결과는 비교적 일정하다." },
    ],
  },
  {
    id: 20,
    axisKey: "VE",
    axisLabel: "V / E",
    question: "내 메이크업 결과를 한마디로 표현하면 어느 쪽인가요?",
    options: [
      { code: "V", title: "조건에 따라 달라지는 편", description: "제품, 피부, 환경의 영향을 많이 받는다." },
      { code: "E", title: "비교적 일정하고 안정적인 편", description: "익숙한 방법을 쓰면 결과가 크게 흔들리지 않는다." },
    ],
  },
];

const axisPairs: Record<AxisKey, [Code, Code]> = {
  OD: ["O", "D"],
  GM: ["G", "M"],
  PC: ["P", "C"],
  VE: ["V", "E"],
};

export default function TestPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Code>>({});
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = questions[currentIndex];
  const selectedCode = answers[currentQuestion.id] ?? null;
  const progress = (currentQuestion.id / questions.length) * 100;
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === questions.length - 1;

  const results = useMemo(() => {
    const axisResults: Partial<Record<AxisKey, Code>> = {};
    (Object.keys(axisPairs) as AxisKey[]).forEach((axisKey) => {
      const [first, second] = axisPairs[axisKey];
      const axisAnswers = questions
        .filter((question) => question.axisKey === axisKey)
        .map((question) => answers[question.id]);
      const firstScore = axisAnswers.filter((answer) => answer === first).length;
      axisResults[axisKey] = firstScore >= 3 ? first : second;
    });
    return axisResults;
  }, [answers]);

  const scoreFor = (code: Code) => Object.values(answers).filter((answer) => answer === code).length;
  const beautyCode = `${results.OD ?? "-"}${results.GM ?? "-"}${results.PC ?? "-"}${results.VE ?? "-"}`;

  const selectAnswer = (code: Code) => {
    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: code }));
  };

  const moveNext = () => {
    if (!selectedCode) return;
    if (isLastQuestion) {
      setShowResult(true);
      return;
    }
    setCurrentIndex((index) => index + 1);
  };

  const movePrevious = () => {
    if (isFirstQuestion) return;
    setCurrentIndex((index) => index - 1);
  };

  if (showResult) {
    return (
      <main className="min-h-screen bg-[#f7f2ed] px-5 py-6 text-[#241f1b] sm:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_24px_80px_rgba(70,48,35,0.12)]">
          <header className="flex items-center justify-between border-b border-black/5 px-6 py-5 sm:px-10">
            <Link href="/" className="group">
              <p className="text-xs font-semibold tracking-[0.32em] text-[#9b6c55]">LAYAD</p>
              <p className="mt-1 text-sm font-medium group-hover:text-[#9b6c55]">BEAUTY CODE</p>
            </Link>
            <p className="text-sm font-medium text-[#8a7d75]">20 / 20</p>
          </header>

          <section className="flex flex-1 items-center px-6 py-12 sm:px-12">
            <div className="mx-auto w-full max-w-2xl text-center">
              <p className="text-xs font-semibold tracking-[0.24em] text-[#9b6c55]">YOUR BEAUTY CODE</p>
              <h1 className="mt-5 text-6xl font-semibold tracking-[0.16em] sm:text-7xl">{beautyCode}</h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#776a62]">
                각 축의 5개 응답 중 3점 이상을 받은 코드로 구성된 규칙 기반 결과입니다.
                AI 분석이나 제품 추천 결과가 아닙니다.
              </p>

              <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(
                  [
                    ["OD", "O / D"],
                    ["GM", "G / M"],
                    ["PC", "P / C"],
                    ["VE", "V / E"],
                  ] as [AxisKey, string][]
                ).map(([axisKey, label]) => {
                  const [first, second] = axisPairs[axisKey];
                  const result = results[axisKey];
                  return (
                    <div key={axisKey} className="rounded-3xl border border-[#eadfd7] bg-[#fcf8f5] p-4">
                      <p className="text-xs font-semibold tracking-[0.16em] text-[#9b6c55]">{label}</p>
                      <p className="mt-2 text-3xl font-semibold">{result}</p>
                      <p className="mt-2 text-xs leading-5 text-[#81736b]">{first} {scoreFor(first)}점 · {second} {scoreFor(second)}점</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 rounded-2xl bg-[#fff7ed] p-4 text-left text-sm leading-6 text-[#7b5a43]">
                G/M은 현재 Glow/Matte 가설을 사용한 임시 문항입니다. LAYAD 오너의 공식 정의가 확정되면 문항과 설명을 교체해야 합니다.
              </div>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowResult(false);
                    setCurrentIndex(19);
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[#d8c5b8] px-6 text-sm font-semibold transition hover:bg-[#f7f2ed]"
                >
                  마지막 응답 다시 보기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    setCurrentIndex(0);
                    setShowResult(false);
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#2d2521] px-7 text-sm font-semibold text-white transition hover:bg-black"
                >
                  테스트 다시 하기
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
              QUESTION {String(currentQuestion.id).padStart(2, "0")} · {currentQuestion.axisLabel}
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
                onClick={moveNext}
                disabled={!selectedCode}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#2d2521] px-7 text-sm font-semibold text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-black disabled:cursor-not-allowed disabled:bg-[#c9bfba]"
              >
                {!selectedCode ? "선택지를 골라주세요" : isLastQuestion ? "Beauty Code 확인" : "다음 질문"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
