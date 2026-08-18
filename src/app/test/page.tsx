"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { BEAUTY_TYPES, type BeautyTypeCode } from "@/lib/review-product-fit";
import { createProductAnalysisRequest, validateProductInput, type ProductAnalysisRequest } from "@/lib/product-analysis-request";
import { LanguageSwitcher, type Locale, useLanguage } from "../i18n";

type Code = "O" | "D" | "G" | "M" | "P" | "C" | "V" | "E";
type AxisKey = "OD" | "GM" | "PC" | "VE";
type QuestionText = { question: string; first: string; second: string };
type QuestionDefinition = { id: number; axisKey: AxisKey; options: [Code, Code] };

const definitions: QuestionDefinition[] = [
  { id: 1, axisKey: "GM", options: ["G", "M"] },
  { id: 2, axisKey: "PC", options: ["P", "C"] },
  { id: 3, axisKey: "VE", options: ["V", "E"] },
  { id: 4, axisKey: "GM", options: ["G", "M"] },
  { id: 5, axisKey: "OD", options: ["D", "O"] },
  { id: 6, axisKey: "VE", options: ["V", "E"] },
  { id: 7, axisKey: "PC", options: ["P", "C"] },
  { id: 8, axisKey: "GM", options: ["G", "M"] },
  { id: 9, axisKey: "PC", options: ["P", "C"] },
  { id: 10, axisKey: "OD", options: ["D", "O"] },
  { id: 11, axisKey: "VE", options: ["V", "E"] },
  { id: 12, axisKey: "GM", options: ["G", "M"] },
  { id: 13, axisKey: "VE", options: ["V", "E"] },
  { id: 14, axisKey: "PC", options: ["P", "C"] },
  { id: 15, axisKey: "OD", options: ["D", "O"] },
  { id: 16, axisKey: "VE", options: ["V", "E"] },
  { id: 17, axisKey: "OD", options: ["D", "O"] },
  { id: 18, axisKey: "PC", options: ["P", "C"] },
  { id: 19, axisKey: "GM", options: ["G", "M"] },
  { id: 20, axisKey: "OD", options: ["D", "O"] },
];

const questionText: Record<Locale, QuestionText[]> = {
  ko: [
    { question: "메이크업 사진을 볼 때 더 눈길이 가는 피부 표현은?", first: "빛을 받아 은은한 윤기가 느껴지는 피부", second: "빛 반사가 적고 보송하게 마무리된 피부" },
    { question: "유튜브에서 더 클릭해보고 싶은 영상은?", first: "청담샵 메이크업 아티스트의\n화잘먹 레이어링 베이스 메이크업", second: "바쁜 아침 5분만에 완성하는\n간편 베이스 메이크업" },
    { question: "인생템이라고 생각했던 제품은?", first: "어느 날 갑자기 안 맞았던 적이 종종 있다", second: "거의 항상 비슷하게 잘 맞는다" },
    { question: "베이스 메이크업 후 시간이 지났을 때 더 괜찮다고 느끼는 결과는?", first: "은은한 빛이 남아 있는 입체적인 피부 표현", second: "광이 거의 나지 않는 깔끔한 피부 표현" },
    { question: "외출 전에 딱 한 가지 제품을 추가해서 둘 중 하나를 얻을 수 있다면?", first: "하루종일 건조하지 않은 피부", second: "하루종일 번들거림 없는 피부" },
    { question: "새로운 메이크업 제품을 사용할 때 보통", first: "잘 맞고 안 맞는 차이가 분명한 편이다", second: "대부분의 제품이\n비슷비슷한 수준으로 잘 맞는다" },
    { question: "화장품 리뷰 중 더 끌리는 리뷰는?", first: "메이크업 루틴에 더했더니 메이크업 완성도가 훨씬 높아졌어요", second: "이 제품 덕에 메이크업 루틴이 훨씬 간편해졌어요" },
    { question: "둘 중 더 사고싶은 제품명은?", first: "Glow Radiance Foundation\n글로우 래디언스 파운데이션", second: "Soft Velvet Foundation\n소프트 벨벳 파운데이션" },
    { question: "화장품 설명 문구 중 더 끌리는 건?", first: "사용법을 내 피부와 취향에 딱 맞게\n조절할 수 있습니다", second: "누구나 쉽게 바를 수 있습니다" },
    { question: "(계절 무관) 메이크업이 만족스럽지 않았던 날을 떠올리면", first: "시간이 지나며 건조함으로 메이크업이 뜨거나 갈라진다", second: "시간이 지나며 피지로 메이크업이\n밀리거나 뭉친다" },
    { question: "같은 제품을 쓰고 평소처럼 생활한 후 오후쯤 거울을 보면", first: "그날그날 무너짐의 정도가 다르다", second: "무너지는 정도가 대체로 비슷하다" },
    { question: "베이스 메이크업에서 둘 중 더 허용하기 어려운 것은?", first: "빛 반사가 거의 없어\n얼굴이 평평하고 생기 없이 보이는 것", second: "빛이 너무 많이 돌아\n얼굴이 깔끔하지 않아 보이는 것" },
    { question: "어제 메이크업이 진짜 잘돼서 오늘 그대로 따라하면", first: "같은 결과가 나오지 않을 때가 많다", second: "거의 비슷한 결과가 나온다" },
    { question: "메이크업 방법 중 둘 중 하나만 고른다면?", first: "조금 번거롭더라도 만족도가 높은 방법", second: "만족도는 조금 덜해도 꾸준히 하기\n쉬운 방법" },
    { question: "메이크업한 날 반복적으로 나타나는 변화 중 더 두드러지는 것은?", first: "피부의 당김과 건조함이 늘어난다", second: "피부 표면의 유분이 늘어난다" },
    { question: "컨디션이나 계절이 바뀌면", first: "메이크업 결과도 꽤 달라진다", second: "크게 달라지지 않는다" },
    { question: "두 가지 고민이 모두 있다고 가정할 때, 메이크업 만족도를 위해 더 먼저 해결하고 싶은 것은?", first: "수분이 금방 날아가버려서 건조해지는 현상", second: "과도한 피지 분비로 인해 기름지는 현상" },
    { question: "누가 샘플을 준다면 꼭 써보고 싶은 것은?", first: "완성도 높은 메이크업을 위한\n4단계 베이스 메이크업 세트", second: "하나만으로 베이스 메이크업이 끝나는 올인원 제품" },
    { question: "유명 아티스트에게 50만원을 내고 인생 메이크업을 받을 기회가 있다면?", first: "\"피부에 조명 킨 것처럼\n은은한 윤광 메이크업 해주세요\"", second: "\"피부가 깔끔하고 보송한\n소프트 매트 메이크업 해주세요\"" },
    { question: "오후가 되었을 때 나를 더 불편하게 하는 건?", first: "피부가 건조해져서 당긴다", second: "피부에 유분이 많이 올라온다" },
  ],
  en: [
    { question: "Which skin finish catches your eye more in makeup photos?", first: "Skin with a soft, subtle glow", second: "Skin with low reflection and a soft matte finish" },
    { question: "Which YouTube video would you rather click?", first: "A makeup artist's layered base routine\nfor a polished finish", second: "A quick five-minute base routine\nfor busy mornings" },
    { question: "Thinking of a product you once considered a holy grail...", first: "It sometimes suddenly stopped working for me", second: "It almost always worked in a similar way" },
    { question: "After some time has passed, which base result feels better?", first: "Dimensional skin with a subtle glow remaining", second: "A clean finish with almost no shine" },
    { question: "If one extra product could give you one benefit before going out, which would you choose?", first: "Skin that does not feel dry all day", second: "Skin that does not look oily all day" },
    { question: "When trying a new makeup product...", first: "The difference between a good and bad match is clear", second: "Most products work at a fairly similar level" },
    { question: "Which cosmetic review appeals to you more?", first: "It made my makeup look much more polished", second: "It made my makeup routine much easier" },
    { question: "Which product name would you rather buy?", first: "Glow Radiance Foundation", second: "Soft Velvet Foundation" },
    { question: "Which product description appeals to you more?", first: "You can adjust the method precisely\nto your skin and preferences", second: "Anyone can apply it easily" },
    { question: "Think of a day when your makeup was disappointing, regardless of season.", first: "Dryness caused lifting or cracking over time", second: "Oil caused slipping or clumping over time" },
    { question: "When you check the mirror in the afternoon after using the same product...", first: "The level of breakdown differs from day to day", second: "The level of breakdown is usually similar" },
    { question: "Which base makeup result is harder for you to tolerate?", first: "Too little reflection, making the face look flat and dull", second: "Too much shine, making the face look less clean" },
    { question: "If yesterday's makeup was perfect and you repeat it today...", first: "The same result often does not appear", second: "The result is almost the same" },
    { question: "If you had to choose only one makeup method...", first: "A more demanding method with higher satisfaction", second: "An easier method that is simpler to maintain" },
    { question: "Which change is more noticeable on makeup days?", first: "Tightness and dryness increase", second: "Surface oil increases" },
    { question: "When your condition or the season changes...", first: "My makeup result changes quite a lot", second: "My makeup result does not change much" },
    { question: "If you had both concerns, which would you solve first for better makeup?", first: "Moisture evaporating quickly and causing dryness", second: "Excess sebum making the skin oily" },
    { question: "Which sample would you most want to try?", first: "A four-step base set for a highly polished finish", second: "An all-in-one product that completes the base alone" },
    { question: "If you could receive a once-in-a-lifetime makeup look from a famous artist...", first: "Please give me softly illuminated, glowing skin", second: "Please give me clean, soft matte skin" },
    { question: "Which bothers you more in the afternoon?", first: "My skin feels dry and tight", second: "A lot of oil appears on my skin" },
  ],
  ja: [
    { question: "メイク写真でより目を引く肌表現は？", first: "光を受けてほのかなツヤを感じる肌", second: "光の反射が少なく、さらっと仕上がった肌" },
    { question: "YouTubeでよりクリックしたい動画は？", first: "メイクアップアーティストの\n重ねるベースメイク", second: "忙しい朝に5分で完成する\n簡単ベースメイク" },
    { question: "一生ものだと思っていたアイテムは？", first: "急に合わなくなることが時々ある", second: "ほぼいつも同じように合う" },
    { question: "ベースメイク後、時間がたった時により良いと感じる仕上がりは？", first: "ほのかな光が残る立体的な肌", second: "ほとんどツヤのない整った肌" },
    { question: "外出前に一つだけ効果を追加できるなら？", first: "一日中乾燥しない肌", second: "一日中テカらない肌" },
    { question: "新しいメイク製品を使うときは通常...", first: "合う・合わないの差がはっきりしている", second: "多くの製品が同じくらい合う" },
    { question: "より惹かれるコスメレビューは？", first: "メイクの完成度がずっと高くなった", second: "メイクの手順がずっと簡単になった" },
    { question: "より買いたい製品名は？", first: "Glow Radiance Foundation\nグロウ ラディアンス ファンデーション", second: "Soft Velvet Foundation\nソフト ベルベット ファンデーション" },
    { question: "より惹かれる製品説明は？", first: "肌と好みに合わせて\n使い方を細かく調整できます", second: "誰でも簡単に塗れます" },
    { question: "季節に関係なく、メイクに満足できなかった日を思い出すと...", first: "乾燥で時間とともに浮いたり割れたりする", second: "皮脂で時間とともにずれたり固まったりする" },
    { question: "同じ製品を使い、午後に鏡を見ると...", first: "崩れ方が日によって違う", second: "崩れ方はだいたい同じ" },
    { question: "ベースメイクでより許容しにくいのは？", first: "反射がほとんどなく、顔が平面的で元気なく見える", second: "光が多すぎて、顔が整って見えない" },
    { question: "昨日のメイクがとても良く、今日も同じようにすると...", first: "同じ結果にならないことが多い", second: "ほぼ同じ結果になる" },
    { question: "メイク方法を一つだけ選ぶなら？", first: "少し手間でも満足度が高い方法", second: "満足度が少し低くても続けやすい方法" },
    { question: "メイクした日により目立つ変化は？", first: "つっぱりと乾燥が増える", second: "肌表面の皮脂が増える" },
    { question: "体調や季節が変わると...", first: "メイク結果もかなり変わる", second: "メイク結果はあまり変わらない" },
    { question: "両方の悩みがあるなら、先に解決したいのは？", first: "水分がすぐ逃げて乾燥すること", second: "過剰な皮脂でべたつくこと" },
    { question: "サンプルをもらえるなら試したいのは？", first: "完成度の高いメイクのための4段階ベースセット", second: "一つでベースが完成するオールインワン製品" },
    { question: "有名アーティストに人生最高のメイクをしてもらえるなら？", first: "照明を当てたような、ほのかなツヤ肌にしてください", second: "整った、さらっとしたソフトマット肌にしてください" },
    { question: "午後により不快なのは？", first: "肌が乾燥してつっぱる", second: "肌に皮脂が多く出る" },
  ],
};

const ui: Record<Locale, Record<string, string>> = {
  ko: { choose: "나와 더 가까운 선택지를 하나 골라주세요.", home: "처음 화면", previous: "이전 질문", resultRule: "각 축의 5개 문항에서 3점 이상 받은 코드로 결과가 결정되었습니다.", points: "점", productTitle: "내 상품 적합도 분석", productDesc: "궁금한 상품명 또는 상품 링크를 등록하면 나의 Beauty Code와의 적합도를 확인할 수 있습니다.", productLabel: "상품명 또는 상품 링크", productPlaceholder: "상품명 또는 https://...", submit: "적합도 분석하기", empty: "분석할 상품을 등록해 주세요.", requested: "상품 분석 요청이 접수되었습니다.", pending: "분석 준비 중", myType: "내 유형", reset: "테스트 다시 하기", duplicate: "같은 상품이 이미 분석 준비 중입니다.", invalid: "입력값을 확인해 주세요." },
  en: { choose: "Choose the option that feels closer to you.", home: "Home", previous: "Previous", resultRule: "Each axis is decided by the code that receives at least 3 of 5 points.", points: "pts", productTitle: "My product fit", productDesc: "Enter a product name or link to check its fit with your Beauty Code.", productLabel: "Product name or link", productPlaceholder: "Product name or https://...", submit: "Check product fit", empty: "Enter a product to analyze.", requested: "Your product analysis request has been received.", pending: "Pending analysis", myType: "My type", reset: "Retake test", duplicate: "The same product is already pending.", invalid: "Please check your input." },
  ja: { choose: "自分により近い選択肢を一つ選んでください。", home: "最初の画面", previous: "前の質問", resultRule: "各軸の5問で3点以上を得たコードにより結果が決まります。", points: "点", productTitle: "自分の商品適合度", productDesc: "商品名またはリンクを入力してBeauty Codeとの適合度を確認します。", productLabel: "商品名または商品リンク", productPlaceholder: "商品名または https://...", submit: "適合度を確認", empty: "分析する商品を入力してください。", requested: "商品分析リクエストを受け付けました。", pending: "分析準備中", myType: "自分のタイプ", reset: "もう一度テスト", duplicate: "同じ商品はすでに分析準備中です。", invalid: "入力内容を確認してください。" },
};

const axisPairs: Record<AxisKey, [Code, Code]> = { OD: ["O", "D"], GM: ["G", "M"], PC: ["P", "C"], VE: ["V", "E"] };

export default function TestPage() {
  const { locale } = useLanguage();
  const text = ui[locale];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Code>>({});
  const [completed, setCompleted] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [productInput, setProductInput] = useState("");
  const [productError, setProductError] = useState("");
  const [analysisRequests, setAnalysisRequests] = useState<ProductAnalysisRequest[]>([]);

  const definition = definitions[currentIndex];
  const localized = questionText[locale][currentIndex];
  const selected = answers[definition.id] ?? null;
  const progress = ((currentIndex + 1) / definitions.length) * 100;

  const scores = useMemo(() => {
    const result: Record<Code, number> = { O: 0, D: 0, G: 0, M: 0, P: 0, C: 0, V: 0, E: 0 };
    Object.values(answers).forEach((code) => { result[code] += 1; });
    return result;
  }, [answers]);

  const finalCode = useMemo(() => (["OD", "GM", "PC", "VE"] as AxisKey[]).map((axis) => {
    const [first, second] = axisPairs[axis];
    return scores[first] >= 3 ? first : second;
  }).join("") as BeautyTypeCode, [scores]);

  const choose = (code: Code) => {
    if (advancing && currentIndex !== definitions.length - 1) return;
    setAdvancing(true);
    setAnswers((previous) => ({ ...previous, [definition.id]: code }));

    if (currentIndex === definitions.length - 1) {
      setCompleted(true);
      setAdvancing(false);
      return;
    }

    window.setTimeout(() => {
      setCurrentIndex((index) => index + 1);
      setAdvancing(false);
    }, 180);
  };

  const submitProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateProductInput(productInput);
    if (!validation.valid) { setProductError(text.invalid); return; }
    const normalized = productInput.trim();
    if (analysisRequests[0]?.inputValue === normalized) { setProductError(text.duplicate); return; }
    setAnalysisRequests((previous) => [createProductAnalysisRequest(normalized, finalCode), ...previous]);
    setProductInput(""); setProductError("");
  };

  const resetTest = () => { setAnswers({}); setCurrentIndex(0); setCompleted(false); setAdvancing(false); setProductInput(""); setProductError(""); setAnalysisRequests([]); };

  const highlightedTrait = (value: string) => <><span className="text-[#D5B34C]">{value[0]}</span>{value.slice(1)}</>;

  if (completed) return (
    <main className="min-h-screen bg-[#F6F4F0] px-5 py-8 text-[#222222] sm:px-8">
      <section className="mx-auto max-w-4xl rounded-[2rem] bg-[#FBFAF8] px-6 py-10 text-center shadow-[0_24px_70px_rgba(34,34,34,0.10)] sm:px-12">
        <div className="flex justify-end"><LanguageSwitcher compact /></div>
        <div className="mx-auto mt-7 flex aspect-square w-full max-w-xl flex-col bg-[#222222] p-7 text-left text-[#F6F4F0] sm:p-11">
          <div className="flex items-start justify-between gap-5">
            <p className="text-[10px] font-semibold tracking-[-0.02em] text-[#D7D0C7]">@layad.official</p>
            <img src="/layad-logo.svg" alt="LAYAD Seoul" className="h-auto w-20 invert mix-blend-screen opacity-90 sm:w-24" />
          </div>
          <h1 className="mt-10 whitespace-nowrap font-brand text-[clamp(4.5rem,20vw,8.5rem)] font-bold leading-none tracking-[-0.11em] sm:mt-14">{finalCode}</h1>
          <dl className="mt-auto space-y-0.5 text-sm font-semibold leading-[1.05] tracking-[-0.035em] sm:text-xl">
            <div className="flex gap-1.5"><dt>Skin Type :</dt><dd>{highlightedTrait(finalCode[0] === "O" ? "Oily" : "Dry")}</dd></div>
            <div className="flex gap-1.5"><dt>Finish Preference :</dt><dd>{highlightedTrait(finalCode[1] === "G" ? "Glow" : "Matte")}</dd></div>
            <div className="flex gap-1.5"><dt>Application Style :</dt><dd>{highlightedTrait(finalCode[2] === "P" ? "Perfection-focused" : "Convenience-focused")}</dd></div>
            <div className="flex gap-1.5"><dt>Skin Variability :</dt><dd>{highlightedTrait(finalCode[3] === "V" ? "Variable" : "Even")}</dd></div>
          </dl>
        </div>
        <section className="mt-12 border-t border-[#f1dfe2] pt-10 text-left">
          <div className="text-center"><p className="text-xs font-semibold tracking-[0.2em] text-[#b97b88]">PRODUCT FIT ANALYSIS</p><h2 className="mt-3 text-2xl font-semibold">{text.productTitle}</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#766767]">{text.productDesc}</p></div>
          <form onSubmit={submitProduct} className="mx-auto mt-8 max-w-2xl rounded-3xl border border-[#f1dfe2] bg-[#fffafa] p-5 sm:p-6">
            <label htmlFor="product-input" className="text-sm font-semibold text-[#5f5053]">{text.productLabel}</label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row"><input id="product-input" value={productInput} onChange={(e) => { setProductInput(e.target.value); setProductError(""); }} placeholder={text.productPlaceholder} className="min-w-0 flex-1 rounded-2xl border border-[#e8cfd4] bg-white px-4 py-3 text-sm outline-none" /><button type="submit" disabled={!productInput.trim()} className="rounded-2xl bg-[#d88c9c] px-6 py-3 text-sm font-semibold text-white disabled:bg-[#d8cccc]">{text.submit}</button></div>
            {productError && <p className="mt-3 text-sm font-medium text-[#b84f63]">{productError}</p>}
          </form>
          <div className="mt-7 space-y-4">{analysisRequests.length === 0 ? <div className="rounded-2xl border border-dashed border-[#e3c7cd] px-5 py-8 text-center text-sm text-[#806f72]">{text.empty}</div> : analysisRequests.map((request) => <article key={request.id} className="rounded-3xl border-2 border-[#d88c9c] bg-[#fff0f2] p-6"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#d88c9c] px-3 py-1 text-xs font-semibold text-white">{text.myType} {request.userBeautyCode}</span><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#a85f6e]">{text.pending}</span></div><h3 className="mt-5 text-lg font-semibold">{text.requested}</h3><p className="mt-3 break-all text-sm text-[#806f72]">{request.inputValue}</p><div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8">{BEAUTY_TYPES.map((code) => <div key={code} className={`rounded-xl border px-2 py-2 text-center text-xs font-semibold ${code === request.userBeautyCode ? "border-[#d88c9c] bg-[#d88c9c] text-white" : "border-[#ead7db] bg-white/80"}`}>{code}</div>)}</div></article>)}</div>
        </section>
        <button type="button" onClick={resetTest} className="mt-9 rounded-full bg-[#d88c9c] px-7 py-3 text-sm font-semibold text-white">{text.reset}</button>
      </section>
    </main>
  );

  const options = [{ code: definition.options[0], title: localized.first }, { code: definition.options[1], title: localized.second }];
  return (
    <main className="min-h-screen bg-[#F6F4F0] px-5 py-6 text-[#222222] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-[#FBFAF8] shadow-[0_24px_70px_rgba(34,34,34,0.10)]">
        <header className="flex items-center justify-between gap-3 border-b border-[#D7D0C7] px-6 py-5 sm:px-10"><Link href="/" aria-label="LAYAD 홈" className="shrink-0"><img src="/layad-logo.svg" alt="LAYAD Seoul" className="h-auto w-[104px] object-contain sm:w-[132px]" /></Link><div className="flex items-center gap-3"><p className="whitespace-nowrap text-sm tabular-nums text-[#625D57]">{currentIndex + 1}/20</p><LanguageSwitcher compact /></div></header>
        <section className="flex flex-1 items-center px-6 py-10 sm:px-12"><div className="mx-auto w-full max-w-2xl">
          <div className="h-2 overflow-hidden rounded-full bg-[#E7E1D9]"><div className="h-full rounded-full bg-[#8F8276] transition-all duration-300" style={{ width: `${progress}%` }} /></div>
          <p className="mt-7 text-xs font-semibold tracking-[0.2em] text-[#7B7168]">QUESTION {String(currentIndex + 1).padStart(2, "0")}</p>
          <h1 className="mt-4 text-2xl font-semibold leading-snug sm:text-3xl">{localized.question}</h1><p className="mt-3 text-sm leading-6 text-[#625D57]">{text.choose}</p>
          <div className="mt-7 grid gap-4">{options.map((option) => { const active = selected === option.code; return <button key={option.code} type="button" disabled={advancing && currentIndex !== definitions.length - 1} onClick={() => choose(option.code)} aria-pressed={active} className={`rounded-2xl border p-5 text-left transition disabled:cursor-wait ${active ? "border-[#8F8276] bg-[#E7E1D9]" : "border-[#D7D0C7] bg-[#FBFAF8] hover:border-[#A99F93] hover:bg-[#F1EDE8]"}`}><span className="whitespace-pre-line text-base font-medium leading-7">{option.title}</span></button>; })}</div>
          <div className="mt-8 flex items-center justify-start">{currentIndex === 0 ? <Link href="/" className="rounded-full px-5 py-3 text-sm text-[#625D57] hover:bg-[#EDE8E2]">{text.home}</Link> : <button type="button" disabled={advancing} onClick={() => setCurrentIndex((index) => index - 1)} className="rounded-full px-5 py-3 text-sm text-[#625D57] hover:bg-[#EDE8E2]">{text.previous}</button>}</div>
        </div></section>
      </div>
    </main>
  );
}
