"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { BEAUTY_TYPES, type BeautyTypeCode } from "@/lib/review-product-fit";
import {
  createProductAnalysisRequest,
  validateProductInput,
  type ProductAnalysisRequest,
} from "@/lib/product-analysis-request";

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
  },
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

const formatRequestTime = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export default function TestPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Code>>({});
  const [completed, setCompleted] = useState(false);
  const [productInput, setProductInput] = useState("");
  const [productError, setProductError] = useState("");
  const [analysisRequests, setAnalysisRequests] = useState<ProductAnalysisRequest[]>([]);

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
      .join("") as BeautyTypeCode;
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

  const submitProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateProductInput(productInput);
    if (!validation.valid) {
      setProductError(validation.message ?? "입력값을 확인해 주세요.");
      return;
    }

    const normalized = productInput.trim();
    if (analysisRequests[0]?.inputValue === normalized) {
      setProductError("같은 상품이 이미 분석 준비 중입니다.");
      return;
    }

    const request = createProductAnalysisRequest(normalized, finalCode);
    setAnalysisRequests((previous) => [request, ...previous]);
    setProductInput("");
    setProductError("");
  };

  const resetTest = () => {
    setAnswers({});
    setCurrentIndex(0);
    setCompleted(false);
    setProductInput("");
    setProductError("");
    setAnalysisRequests([]);
  };

  if (completed) {
    return (
      <main className="min-h-screen bg-[#fff8f8] px-5 py-8 text-[#382d2d] sm:px-8">
        <section className="mx-auto max-w-4xl rounded-[2rem] bg-white px-6 py-12 text-center shadow-[0_24px_70px_rgba(120,70,80,0.12)] sm:px-12">
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

          <section className="mt-12 border-t border-[#f1dfe2] pt-10 text-left">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#b97b88]">PRODUCT FIT ANALYSIS</p>
              <h2 className="mt-3 text-2xl font-semibold">내 상품 적합도 분석</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#766767]">
                궁금한 상품명 또는 상품 링크를 등록하면 리뷰 맥락 분석을 통해 나의 Beauty Code와의 적합도를 확인할 수 있습니다.
              </p>
            </div>

            <form onSubmit={submitProduct} className="mx-auto mt-8 max-w-2xl rounded-3xl border border-[#f1dfe2] bg-[#fffafa] p-5 sm:p-6">
              <label htmlFor="product-input" className="text-sm font-semibold text-[#5f5053]">상품명 또는 상품 링크</label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="product-input"
                  type="text"
                  value={productInput}
                  onChange={(event) => {
                    setProductInput(event.target.value);
                    if (productError) setProductError("");
                  }}
                  placeholder="예: 프라이머 상품명 또는 https://..."
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-2xl border border-[#e8cfd4] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#b8a8ab] focus:border-[#d88c9c] focus:ring-2 focus:ring-[#f4dce1]"
                />
                <button
                  type="submit"
                  disabled={!productInput.trim()}
                  className="rounded-2xl bg-[#d88c9c] px-6 py-3 text-sm font-semibold text-white transition enabled:hover:bg-[#c8798a] disabled:cursor-not-allowed disabled:bg-[#d8cccc]"
                >
                  적합도 분석하기
                </button>
              </div>
              {productError ? <p className="mt-3 text-sm font-medium text-[#b84f63]">{productError}</p> : null}
              <p className="mt-3 text-xs leading-6 text-[#806f72]">
                상품명 또는 공개 상품 페이지 링크 중 하나만 입력해도 됩니다. 현재 단계에서는 분석 요청만 접수되며 임의 점수는 생성하지 않습니다.
              </p>
            </form>

            <div className="mt-7 space-y-5">
              {analysisRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#e3c7cd] px-5 py-8 text-center text-sm text-[#806f72]">
                  분석할 상품을 등록해 주세요.
                </div>
              ) : (
                analysisRequests.map((request) => (
                  <article key={request.id} className="rounded-3xl border-2 border-[#d88c9c] bg-[#fff0f2] p-6 shadow-[0_14px_35px_rgba(216,140,156,0.14)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-[#d88c9c] px-3 py-1 text-xs font-semibold text-white">내 유형 {request.userBeautyCode}</span>
                      <span className="rounded-full border border-[#e6a8b5] bg-white px-3 py-1 text-xs font-semibold text-[#a85f6e]">분석 준비 중</span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">상품 분석 요청이 접수되었습니다.</h3>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                        <dt className="text-[#806f72]">등록 유형</dt>
                        <dd className="font-semibold">{request.inputType === "url" ? "상품 링크" : "상품명"}</dd>
                      </div>
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                        <dt className="text-[#806f72]">등록값</dt>
                        <dd className="min-w-0 text-left font-semibold sm:text-right">
                          {request.productUrl ? (
                            <a href={request.productUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-[#d88c9c] underline-offset-4">
                              등록한 상품 링크
                            </a>
                          ) : (
                            <span><span className="font-normal text-[#9b7f84]">사용자 입력 상품명 · </span>{request.productName}</span>
                          )}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                        <dt className="text-[#806f72]">요청 시각</dt>
                        <dd className="font-semibold">{formatRequestTime(request.createdAt)}</dd>
                      </div>
                    </dl>

                    <div className="mt-6 border-t border-[#e9c7ce] pt-5">
                      <p className="text-xs font-semibold tracking-[0.12em] text-[#9b6b75]">16유형 분석 상태</p>
                      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
                        {BEAUTY_TYPES.map((code) => {
                          const isMine = code === request.userBeautyCode;
                          return (
                            <div
                              key={code}
                              className={`rounded-xl border px-2 py-2 text-center text-xs font-semibold ${isMine ? "border-[#d88c9c] bg-[#d88c9c] text-white shadow-sm" : "border-[#ead7db] bg-white/80 text-[#8d7b7f]"}`}
                            >
                              {code}
                              {isMine ? <span className="mt-1 block text-[10px]">내 유형</span> : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <p className="mt-5 rounded-2xl bg-white/80 p-4 text-xs leading-6 text-[#806f72]">
                      현재는 분석 요청 접수 단계입니다. 리뷰 데이터 수집과 AI 맥락 분석이 완료되기 전에는 16유형 적합도 점수를 표시하지 않습니다.
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <button
            type="button"
            onClick={resetTest}
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
