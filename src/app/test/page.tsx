"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Code = "C" | "D" | "E" | "G" | "M" | "O" | "P" | "V";
type AxisKey = "CD" | "EG" | "MO" | "PV";

type TestQuestion = {
  id: number;
  axisKey: AxisKey;
  axisLabel: string;
  question: string;
  options: [{ code: Code; text: string }, { code: Code; text: string }];
};

const questions: TestQuestion[] = [
  { id: 1, axisKey: "CD", axisLabel: "C / D", question: "메이크업 사진을 볼 때 더 눈길이 가는 피부 표현은?", options: [{ code: "C", text: "빛을 받아 은은한 윤기가 느껴지는 피부" }, { code: "D", text: "빛 반사가 적고 보송하게 마무리된 피부" }] },
  { id: 2, axisKey: "CD", axisLabel: "C / D", question: "유튜브에서 더 클릭해보고 싶은 영상은?", options: [{ code: "C", text: "청담샵 메이크업 아티스트의\n화잘먹 레이어링 베이스 메이크업" }, { code: "D", text: "바쁜 아침 5분만에 완성하는\n간편 베이스 메이크업" }] },
  { id: 3, axisKey: "CD", axisLabel: "C / D", question: "인생템이라고 생각했던 제품은?", options: [{ code: "C", text: "어느 날 갑자기 안 맞았던 적이 종종 있다" }, { code: "D", text: "거의 항상 비슷하게 잘 맞는다" }] },
  { id: 4, axisKey: "CD", axisLabel: "C / D", question: "베이스 메이크업 후 시간이 지났을 때 더 괜찮다고 느끼는 결과는?", options: [{ code: "D", text: "은은한 빛이 남아 있는 입체적인 피부 표현" }, { code: "C", text: "광이 거의 나지 않는 깔끔한 피부 표현" }] },
  { id: 5, axisKey: "CD", axisLabel: "C / D", question: "외출 전에 딱 한 가지 제품을 추가해서 둘 중 하나를 얻을 수 있다면?", options: [{ code: "D", text: "하루종일 건조하지 않은 피부" }, { code: "C", text: "하루종일 번들거림 없는 피부" }] },
  { id: 6, axisKey: "EG", axisLabel: "E / G", question: "새로운 메이크업 제품을 사용할 때 보통", options: [{ code: "E", text: "잘 맞고 안 맞는 차이가 분명한 편이다" }, { code: "G", text: "대부분의 제품이\n비슷비슷한 수준으로 잘 맞는다" }] },
  { id: 7, axisKey: "EG", axisLabel: "E / G", question: "화장품 리뷰 중 더 끌리는 리뷰는?", options: [{ code: "E", text: "메이크업 루틴에 더했더니 메이크업 완성도가 훨씬 높아졌어요" }, { code: "G", text: "이 제품 덕에 메이크업 루틴이 훨씬 간편해졌어요" }] },
  { id: 8, axisKey: "EG", axisLabel: "E / G", question: "둘 중 더 사고싶은 제품명은?", options: [{ code: "E", text: "Glow Radiance Foundation\n글로우 래디언스 파운데이션" }, { code: "G", text: "Soft Velvet Foundation\n소프트 벨벳 파운데이션" }] },
  { id: 9, axisKey: "EG", axisLabel: "E / G", question: "화장품 설명 문구 중 더 끌리는 건?", options: [{ code: "G", text: "사용법을 내 피부와 취향에 딱 맞게\n조절할 수 있습니다" }, { code: "E", text: "누구나 쉽게 바를 수 있습니다" }] },
  { id: 10, axisKey: "EG", axisLabel: "E / G", question: "(계절 무관) 메이크업이 만족스럽지 않았던 날을 떠올리면", options: [{ code: "G", text: "시간이 지나며 건조함으로 메이크업이 뜨거나 갈라진다" }, { code: "E", text: "시간이 지나며 피지로 메이크업이\n밀리거나 뭉친다" }] },
  { id: 11, axisKey: "MO", axisLabel: "M / O", question: "같은 제품을 쓰고 평소처럼 생활한 후 오후쯤 거울을 보면", options: [{ code: "M", text: "그날그날 무너짐의 정도가 다르다" }, { code: "O", text: "무너지는 정도가 대체로 비슷하다" }] },
  { id: 12, axisKey: "MO", axisLabel: "M / O", question: "베이스 메이크업에서 둘 중 더 허용하기 어려운 것은?", options: [{ code: "M", text: "빛 반사가 거의 없어\n얼굴이 평평하고 생기 없이 보이는 것" }, { code: "O", text: "빛이 너무 많이 돌아\n얼굴이 깔끔하지 않아 보이는 것" }] },
  { id: 13, axisKey: "MO", axisLabel: "M / O", question: "어제 메이크업이 진짜 잘돼서 오늘 그대로 따라하면", options: [{ code: "M", text: "같은 결과가 나오지 않을 때가 많다" }, { code: "O", text: "거의 비슷한 결과가 나온다" }] },
  { id: 14, axisKey: "MO", axisLabel: "M / O", question: "메이크업 방법 중 둘 중 하나만 고른다면?", options: [{ code: "O", text: "조금 번거롭더라도 만족도가 높은 방법" }, { code: "M", text: "만족도는 조금 덜해도 꾸준히 하기\n쉬운 방법" }] },
  { id: 15, axisKey: "MO", axisLabel: "M / O", question: "메이크업한 날 반복적으로 나타나는 변화 중 더 두드러지는 것은?", options: [{ code: "O", text: "피부의 당김과 건조함이 늘어난다" }, { code: "M", text: "피부 표면의 유분이 늘어난다" }] },
  { id: 16, axisKey: "PV", axisLabel: "P / V", question: "컨디션이나 계절이 바뀌면", options: [{ code: "P", text: "메이크업 결과도 꽤 달라진다" }, { code: "V", text: "크게 달라지지 않는다" }] },
  { id: 17, axisKey: "PV", axisLabel: "P / V", question: "두 가지 고민이 모두 있다고 가정할 때, 메이크업 만족도를 위해 더 먼저 해결하고 싶은 것은?", options: [{ code: "P", text: "수분이 금방 날아가버려서 건조해지는 현상" }, { code: "V", text: "과도한 피지 분비로 인해 기름지는 현상" }] },
  { id: 18, axisKey: "PV", axisLabel: "P / V", question: "누가 샘플을 준다면 꼭 써보고 싶은 것은?", options: [{ code: "P", text: "완성도 높은 메이크업을 위한\n4단계 베이스 메이크업 세트" }, { code: "V", text: "하나만으로 베이스 메이크업이 끝나는 올인원 제품" }] },
  { id: 19, axisKey: "PV", axisLabel: "P / V", question: "유명 아티스트에게 50만원을 내고 인생 메이크업을 받을 기회가 있다면?", options: [{ code: "V", text: "\"피부에 조명 킨 것 처럼\n은은한 윤광 메이크업 해주세요\"" }, { code: "P", text: "\"피부가 깔끔하고 보송한\n소프트 매트 메이크업 해주세요\"" }] },
  { id: 20, axisKey: "PV", axisLabel: "P / V", question: "오후가 되었을 때 나를 더 불편하게 하는건?", options: [{ code: "V", text: "피부가 건조해져서 당긴다" }, { code: "P", text: "피부에 유분이 많이 올라온다" }] },
];

const axes: { key: AxisKey; first: Code; second: Code; label: string }[] = [
  { key: "CD", first: "C", second: "D", label: "C / D" },
  { key: "EG", first: "E", second: "G", label: "E / G" },
  { key: "MO", first: "M", second: "O", label: "M / O" },
  { key: "PV", first: "P", second: "V", label: "P / V" },
];

export default function TestPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Code>>({});
  const [completed, setCompleted] = useState(false);

  const currentQuestion = questions[currentIndex];
  const selectedCode = answers[currentQuestion.id] ?? null;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const results = useMemo(() => {
    return axes.map((axis) => {
      const axisAnswers = questions
        .filter((question) => question.axisKey === axis.key)
        .map((question) => answers[question.id]);
      const firstScore = axisAnswers.filter((answer) => answer === axis.first).length;
      const secondScore = axisAnswers.filter((answer) => answer === axis.second).length;
      return { ...axis, firstScore, secondScore, result: firstScore >= 3 ? axis.first : axis.second };
    });
  }, [answers]);

  const beautyCode = results.map((axis) => axis.result).join("");

  const moveNext = () => {
    if (!selectedCode) return;
    if (currentIndex === questions.length - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((index) => index + 1);
  };

  if (completed) {
    return (
      <main className="min-h-screen bg-[#fbf7f5] px-4 py-6 text-[#2d2927] sm:px-8">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-[#eaded9] bg-white p-7 text-center shadow-[0_22px_70px_rgba(82,55,48,0.10)] sm:p-12">
          <p className="text-xs font-semibold tracking-[0.25em] text-[#c56f73]">YOUR BEAUTY CODE</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[0.18em] sm:text-6xl">{beautyCode}</h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#716964]">업로드된 「20문항과 응답코드(2).xlsx」의 질문·선택지·응답 코드를 반영한 결과입니다.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {results.map((axis) => (
              <div key={axis.key} className="rounded-2xl border border-[#eaded9] bg-[#fffaf8] p-5 text-left">
                <div className="flex items-center justify-between"><p className="font-semibold">{axis.label}</p><p className="text-2xl font-semibold text-[#c56f73]">{axis.result}</p></div>
                <p className="mt-2 text-sm text-[#766d68]">{axis.first} {axis.firstScore}점 · {axis.second} {axis.secondScore}점</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => { setAnswers({}); setCurrentIndex(0); setCompleted(false); }} className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#d8797d] px-8 text-sm font-semibold text-white transition hover:bg-[#c9686d]">테스트 다시 하기</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf7f5] px-4 py-5 text-[#2d2927] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-[#eaded9] bg-white shadow-[0_22px_70px_rgba(82,55,48,0.10)]">
        <header className="flex items-center justify-between border-b border-[#f0e7e3] px-6 py-4 sm:px-10"><Link href="/" className="text-sm font-semibold tracking-[0.12em]">LAYAD BEAUTY CODE</Link><p className="text-sm text-[#8a7f79]">{currentIndex + 1} / 20</p></header>
        <section className="flex flex-1 items-center px-6 py-9 sm:px-12">
          <div className="mx-auto w-full max-w-2xl">
            <div className="h-1.5 overflow-hidden rounded-full bg-[#f1e8e4]"><div className="h-full rounded-full bg-[#d8797d] transition-all" style={{ width: `${progress}%` }} /></div>
            <p className="mt-7 text-xs font-semibold tracking-[0.2em] text-[#c56f73]">QUESTION {String(currentQuestion.id).padStart(2, "0")} · {currentQuestion.axisLabel}</p>
            <h1 className="mt-3 text-2xl font-semibold leading-snug sm:text-3xl">{currentQuestion.question}</h1>
            <p className="mt-3 text-sm leading-6 text-[#817772]">나와 더 가까운 응답을 하나 선택해 주세요.</p>
            <div className="mt-7 grid gap-3">
              {currentQuestion.options.map((option) => {
                const selected = selectedCode === option.code;
                return (
                  <button key={option.code} type="button" onClick={() => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: option.code }))} className={`rounded-2xl border p-5 text-left transition ${selected ? "border-[#d8797d] bg-[#fff3f1] shadow-[0_10px_25px_rgba(189,105,109,0.10)]" : "border-[#eaded9] bg-white hover:border-[#dcb7b5] hover:bg-[#fffbfa]"}`}>
                    <div className="flex items-start gap-4"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${selected ? "bg-[#d8797d] text-white" : "bg-[#f5ece8] text-[#806f68]"}`}>{option.code}</span><span className="whitespace-pre-line text-base leading-7">{option.text}</span></div>
                  </button>
                );
              })}
            </div>
            <div className="mt-7 flex items-center justify-between gap-3">
              {currentIndex === 0 ? <Link href="/" className="inline-flex h-11 items-center rounded-full px-4 text-sm text-[#766d68] hover:bg-[#fbf4f1]">처음 화면</Link> : <button type="button" onClick={() => setCurrentIndex((index) => index - 1)} className="inline-flex h-11 items-center rounded-full px-4 text-sm text-[#766d68] hover:bg-[#fbf4f1]">이전 질문</button>}
              <button type="button" onClick={moveNext} disabled={!selectedCode} className="inline-flex h-11 items-center justify-center rounded-full bg-[#d8797d] px-7 text-sm font-semibold text-white transition enabled:hover:bg-[#c9686d] disabled:cursor-not-allowed disabled:bg-[#d8ceca]">{currentIndex === questions.length - 1 ? "결과 확인" : "다음 질문"}</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
