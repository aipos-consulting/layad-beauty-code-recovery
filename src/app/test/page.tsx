"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Code = "O" | "D" | "G" | "M" | "P" | "C" | "V" | "E";
type AxisKey = "OD" | "GM" | "PC" | "VE";

type TestQuestion = {
  id: number;
  axisKey: AxisKey;
  axisLabel: string;
  question: string;
  options: [{ code: Code; title: string }, { code: Code; title: string }];
};

const questions: TestQuestion[] = [
  {
    id: 1,
    axisKey: "GM",
    axisLabel: "G / M",
    question: "메이크업 사진을 볼 때 더 눈길이 가는 피부 표현은?",
    options: [
      { code: "G", title: "빛을 받아 은은한 윤기가 느껴지는 피부" },
      { code: "M", title: "빛 반사가 적고 보송하게 마무리된 피부" },
    ],
  },
  {
    id: 2,
    axisKey: "PC",
    axisLabel: "P / C",
    question: "유튜브에서 더 클릭해보고 싶은 영상은?",
    options: [
      { code: "P", title: "청담샵 메이크업 아티스트의 \n화잘먹 레이어링 베이스 메이크업" },
      { code: "C", title: "바쁜 아침 5분만에 완성하는 \n간편 베이스 메이크업" },
    ],
  },
  {
    id: 3,
    axisKey: "VE",
    axisLabel: "V / E",
    question: "인생템이라고 생각했던 제품은?",
    options: [
      { code: "V", title: "어느 날 갑자기 안 맞았던 적이 종종 있다" },
      { code: "E", title: "거의 항상 비슷하게 잘 맞는다" },
    ],
  },
  {
    id: 4,
    axisKey: "GM",
    axisLabel: "G / M",
    question: "베이스 메이크업 후 시간이 지났을 때 더 괜찮다고 느끼는 결과는?",
    options: [
      { code: "G", title: "은은한 빛이 남아 있는 입체적인 피부 표현" },
      { code: "M", title: "광이 거의 나지 않는 깔끔한 피부 표현" },
    ],
  },
  {
    id: 5,
    axisKey: "OD",
    axisLabel: "O / D",
    question: "외출 전에 딱 한 가지 제품을 추가해서 둘 중 하나를 얻을 수 있다면?",
    options: [
      { code: "D", title: "하루종일 건조하지 않은 피부" },
      { code: "O", title: "하루종일 번들거림 없는 피부" },
    ],
  },
  {
    id: 6,
    axisKey: "VE",
    axisLabel: "V / E",
    question: "새로운 메이크업 제품을 사용할 때 보통",
    options: [
      { code: "V", title: "잘 맞고 안 맞는 차이가 분명한 편이다" },
      { code: "E", title: "대부분의 제품이 \n비슷비슷한 수준으로 잘 맞는다" },
    ],
  },
  {
    id: 7,
    axisKey: "PC",
    axisLabel: "P / C",
    question: "화장품 리뷰 중 더 끌리는 리뷰는?",
    options: [
      { code: "P", title: "메이크업 루틴에 더했더니 메이크업 완성도가 훨씬 높아졌어요" },
      { code: "C", title: "이 제품 덕에 메이크업 루틴이 훨씬 간편해졌어요" },
    ],
  },
  {
    id: 8,
    axisKey: "GM",
    axisLabel: "G / M",
    question: "둘 중 더 사고싶은 제품명은?",
    options: [
      { code: "G", title: "Glow Radiance Foundation\n글로우 래디언스 파운데이션" },
      { code: "M", title: "Soft Velvet Foundation\n소프트 벨벳 파운데이션" },
    ],
  },
  {
    id: 9,
    axisKey: "PC",
    axisLabel: "P / C",
    question: "화장품 설명 문구 중 더 끌리는 건?",
    options: [
      { code: "P", title: "사용법을 내 피부와 취향에 딱 맞게 \n조절할 수 있습니다" },
      { code: "C", title: "누구나 쉽게 바를 수 있습니다" },
    ],
  },
  {
    id: 10,
    axisKey: "OD",
    axisLabel: "O / D",
    question: "(계절 무관) 메이크업이 만족스럽지 않았던 날을 떠올리면",
    options: [
      { code: "D", title: "시간이 지나며 건조함으로 메이크업이 뜨거나 갈라진다" },
      { code: "O", title: "시간이 지나며 피지로 메이크업이 \n밀리거나 뭉친다" },
    ],
  },
  {
    id: 11,
    axisKey: "VE",
    axisLabel: "V / E",
    question: "같은 제품을 쓰고 평소처럼 생활한 후 오후쯤 거울을 보면",
    options: [
      { code: "V", title: "그날그날 무너짐의 정도가 다르다" },
      { code: "E", title: "무너지는 정도가 대체로 비슷하다" },
    ],
  },
  {
    id: 12,
    axisKey: "GM",
    axisLabel: "G / M",
    question: "베이스 메이크업에서 둘 중 더 허용하기 어려운 것은?",
    options: [
      { code: "M", title: "빛 반사가 거의 없어 \n얼굴이 평평하고 생기 없이 보이는 것" },
      { code: "G", title: "빛이 너무 많이 돌아 \n얼굴이 깔끔하지 않아 보이는 것" },
    ],
  },
  {
    id: 13,
    axisKey: "VE",
    axisLabel: "V / E",
    question: "어제 메이크업이 진짜 잘돼서 오늘 그대로 따라하면",
    options: [
      { code: "V", title: "같은 결과가 나오지 않을 때가 많다" },
      { code: "E", title: "거의 비슷한 결과가 나온다" },
    ],
  },
  {
    id: 14,
    axisKey: "PC",
    axisLabel: "P / C",
    question: "메이크업 방법 중 둘 중 하나만 고른다면?",
    options: [
      { code: "P", title: "조금 번거롭더라도 만족도가 높은 방법" },
      { code: "C", title: "만족도는 조금 덜해도 꾸준히 하기 \n쉬운 방법" },
    ],
  },
  {
    id: 15,
    axisKey: "OD",
    axisLabel: "O / D",
    question: "메이크업한 날 반복적으로 나타나는 변화 중 더 두드러지는 것은?",
    options: [
      { code: "D", title: "피부의 당김과 건조함이 늘어난다" },
      { code: "O", title: "피부 표면의 유분이 늘어난다" },
    ],
  },
  {
    id: 16,
    axisKey: "VE",
    axisLabel: "V / E",
    question: "컨디션이나 계절이 바뀌면",
    options: [
      { code: "V", title: "메이크업 결과도 꽤 달라진다" },
      { code: "E", title: "크게 달라지지 않는다" },
    ],
  },
  {
    id: 17,
    axisKey: "OD",
    axisLabel: "O / D",
    question: "두 가지 고민이 모두 있다고 가정할 때, 메이크업 만족도를 위해 더 먼저 해결하고 싶은 것은?",
    options: [
      { code: "D", title: "수분이 금방 날아가버려서 건조해지는 현상" },
      { code: "O", title: "과도한 피지 분비로 인해 기름지는 현상" },
    ],
  },
  {
    id: 18,
    axisKey: "PC",
    axisLabel: "P / C",
    question: "누가 샘플을 준다면 꼭 써보고 싶은 것은?",
    options: [
      { code: "P", title: "완성도 높은 메이크업을 위한 \n4단계 베이스 메이크업 세트" },
      { code: "C", title: "하나만으로 베이스 메이크업이 끝나는 올인원 제품" },
    ],
  },
  {
    id: 19,
    axisKey: "GM",
    axisLabel: "G / M",
    question: "유명 아티스트에게 50만원을 내고 인생 메이크업을 받을 기회가 있다면?",
    options: [
      { code: "G", title: "\"피부에 조명 킨 것 처럼 \n은은한 윤광 메이크업 해주세요\"" },
      { code: "M", title: "\"피부가 깔끔하고 보송한 \n소프트 매트 메이크업 해주세요\"" },
    ],
  },
  {
    id: 20,
    axisKey: "OD",
    axisLabel: "O / D",
    question: "오후가 되었을 때 나를 더 불편하게 하는건?",
    options: [
      { code: "D", title: "피부가 건조해져서 당긴다" },
      { code: "O", title: "피부에 유분이 많이 올라온다" },
    ],
  }
];

const axisPairs: Record<AxisKey, [Code, Code]> = {
  OD: ["O", "D"],
  GM: ["G", "M"],
  PC: ["P", "C"],
  VE: ["V", "E"],
};

const axisNames: Record<AxisKey, string> = {
  OD: "Oily / Dry",
  GM: "Glow / Matte",
  PC: "Precise / Convenient",
  VE: "Variable / Even",
};

export default function TestPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Code>>({});
  const [completed, setCompleted] = useState(false);

  const current = questions[currentIndex];
  const selected = answers[current.id] ?? null;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const scores = useMemo(() => {
    const result: Record<Code, number> = { O: 0, D: 0, G: 0, M: 0, P: 0, C: 0, V: 0, E: 0 };
    Object.values(answers).forEach((code) => {
      result[code] += 1;
    });
    return result;
  }, [answers]);

  const finalCode = useMemo(() => {
    const order: AxisKey[] = ["OD", "GM", "PC", "VE"];
    return order
      .map((axis) => {
        const [first, second] = axisPairs[axis];
        return scores[first] >= 3 ? first : second;
      })
      .join("");
  }, [scores]);

  const choose = (code: Code) => {
    setAnswers((previous) => ({ ...previous, [current.id]: code }));
  };

  const next = () => {
    if (!selected) return;
    if (currentIndex === questions.length - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((index) => index + 1);
  };

  if (completed) {
    return (
      <main className="min-h-screen bg-[#fff8f8] px-5 py-8 text-[#382d2d] sm:px-8">
        <section className="mx-auto max-w-3xl rounded-[2rem] bg-white px-6 py-12 text-center shadow-[0_24px_70px_rgba(120,70,80,0.12)] sm:px-12">
          <p className="text-xs font-semibold tracking-[0.25em] text-[#b97b88]">YOUR BEAUTY CODE</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-[0.18em] text-[#d88c9c] sm:text-6xl">{finalCode}</h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#766767]">
            각 축의 5개 문항에서 3점 이상 받은 코드로 결과가 결정되었습니다.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {(["OD", "GM", "PC", "VE"] as AxisKey[]).map((axis) => {
              const [first, second] = axisPairs[axis];
              const result = scores[first] >= 3 ? first : second;
              return (
                <div key={axis} className="rounded-2xl border border-[#f1dfe2] bg-[#fffafa] p-5 text-left">
                  <p className="text-xs font-semibold tracking-[0.16em] text-[#b97b88]">{axisNames[axis]}</p>
                  <p className="mt-2 text-2xl font-semibold">{result}</p>
                  <p className="mt-2 text-sm text-[#7e7070]">{first} {scores[first]}점 · {second} {scores[second]}점</p>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setCurrentIndex(0);
              setCompleted(false);
            }}
            className="mt-9 inline-flex h-12 items-center justify-center rounded-full bg-[#d88c9c] px-7 text-sm font-semibold text-white transition hover:bg-[#c8798a]"
          >
            테스트 다시 하기
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8f8] px-5 py-6 text-[#382d2d] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_70px_rgba(120,70,80,0.12)]">
        <header className="flex items-center justify-between border-b border-[#f4e5e7] px-6 py-5 sm:px-10">
          <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-[#b97b88]">LAYAD BEAUTY CODE</Link>
          <p className="text-sm text-[#8c7e7e]">{currentIndex + 1} / 20</p>
        </header>

        <section className="flex flex-1 items-center px-6 py-10 sm:px-12">
          <div className="mx-auto w-full max-w-2xl">
            <div className="h-2 overflow-hidden rounded-full bg-[#f3e8e9]">
              <div className="h-full rounded-full bg-[#d88c9c] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            <p className="mt-7 text-xs font-semibold tracking-[0.2em] text-[#b97b88]">
              QUESTION {String(current.id).padStart(2, "0")} · {current.axisLabel}
            </p>
            <h1 className="mt-4 text-2xl font-semibold leading-snug sm:text-3xl">{current.question}</h1>
            <p className="mt-3 text-sm leading-6 text-[#827474]">나와 더 가까운 선택지를 하나 골라주세요.</p>

            <div className="mt-7 grid gap-4">
              {current.options.map((option) => {
                const active = selected === option.code;
                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => choose(option.code)}
                    className={`rounded-2xl border p-5 text-left transition ${active ? "border-[#d88c9c] bg-[#fff0f2]" : "border-[#efdee1] hover:border-[#dca7b1] hover:bg-[#fffafa]"}`}
                  >
                    <div className="flex items-start gap-4">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${active ? "bg-[#d88c9c] text-white" : "bg-[#f7eaec] text-[#a56f7a]"}`}>
                        {option.code}
                      </span>
                      <span className="whitespace-pre-line text-base font-medium leading-7">{option.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              {currentIndex === 0 ? (
                <Link href="/" className="rounded-full px-5 py-3 text-sm text-[#7e7070] hover:bg-[#fff5f6]">처음 화면</Link>
              ) : (
                <button type="button" onClick={() => setCurrentIndex((index) => index - 1)} className="rounded-full px-5 py-3 text-sm text-[#7e7070] hover:bg-[#fff5f6]">이전 질문</button>
              )}

              <button
                type="button"
                onClick={next}
                disabled={!selected}
                className="rounded-full bg-[#d88c9c] px-7 py-3 text-sm font-semibold text-white transition enabled:hover:bg-[#c8798a] disabled:cursor-not-allowed disabled:bg-[#d8cccc]"
              >
                {currentIndex === questions.length - 1 ? "결과 확인" : "다음 질문"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
