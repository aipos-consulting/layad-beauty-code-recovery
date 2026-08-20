import { BEAUTY_TYPE_DESCRIPTIONS_KO } from "./beauty-type-descriptions";
import type { BeautyTypeCode } from "./review-product-fit";

export type ResultDescriptionLocale = "ko" | "en" | "ja";

const codes = [
  "OGPV", "OGPE", "OGCV", "OGCE",
  "OMPV", "OMPE", "OMCV", "OMCE",
  "DGPV", "DGPE", "DGCV", "DGCE",
  "DMPV", "DMPE", "DMCV", "DMCE",
] as const satisfies readonly BeautyTypeCode[];

function englishDescription(code: BeautyTypeCode) {
  const oily = code[0] === "O";
  const glow = code[1] === "G";
  const precise = code[2] === "P";
  const variable = code[3] === "V";

  const tags = [
    oily ? "#Oily" : "#Dry",
    glow ? "#GlowPreference" : "#MattePreference",
    precise ? "#PolishedFinish" : "#ConvenienceFocused",
    variable ? "#Variable" : "#Consistent",
  ].join(" ");

  const skin = oily
    ? "Your skin tends to be on the oily side."
    : "Your skin tends to be on the dry side.";

  const finish = oily
    ? glow
      ? "You know how to make the most of your skin and prefer a lively, glowing look—especially a soft radiance rather than obvious shine."
      : "You prefer a clean, soft-matte base without excess shine, and you are always looking for makeup that stays smooth without slipping or caking."
    : glow
      ? "Dryness, dullness and fine lines are major concerns, so you naturally gravitate toward a fresh, luminous base with healthy-looking glow."
      : "You dislike dryness, but still prefer a clean matte finish. Ideally, you want makeup that feels hydrated underneath and soft on the surface without emphasizing fine lines.";

  const routine = precise
    ? "You are willing to put in extra effort for a more polished makeup result—perhaps you are a true beauty enthusiast."
    : "You prefer a sustainable, relatively simple makeup routine that is easy to keep up with every day.";

  const stability = variable
    ? "Your results can change noticeably depending on the product, your skin condition or the environment. A product that once felt like a holy grail can suddenly stop working, so finding the perfect match is not always easy. Because your preferences are clear, you tend to try different options until you get a result you truly like."
    : "Your skin is relatively stable across products, condition and environment. Once you find a proven routine, you tend to stay with it. New products are lower-risk for you, although finding something that feels truly exceptional can still be difficult.";

  return `${tags}\n\n${skin}\n${finish}\n\n${routine}\n${stability}\n\nLAYAD Makeup 16 Types is original content created by LAYAD to provide personalized tips based on skin type and makeup preferences, including how to use products and what to pair together.\n- How well will the product I want to buy suit my type?\n- Which products have satisfied people with the same type as me?\n\nShare your experiences and talk with the community!`;
}

function japaneseDescription(code: BeautyTypeCode) {
  const oily = code[0] === "O";
  const glow = code[1] === "G";
  const precise = code[2] === "P";
  const variable = code[3] === "V";

  const tags = [
    oily ? "#脂性肌" : "#乾燥肌",
    glow ? "#ツヤ肌派" : "#マット派",
    precise ? "#完成度重視" : "#手軽さ重視",
    variable ? "#変動型" : "#安定型",
  ].join(" ");

  const skin = oily
    ? "あなたの肌タイプは脂性肌寄りです。"
    : "あなたの肌タイプは乾燥肌寄りです。";

  const finish = oily
    ? glow
      ? "自分の肌の長所を活かし、いきいきとしたツヤ肌メイクを好みます。強いテカリではなく、自然で上品なツヤ感が理想です。"
      : "テカリを抑えた、すっきりとしたソフトマットなベースメイクを好みます。浮きやヨレの少ない、なめらかな仕上がりを求めるタイプです。"
    : glow
      ? "乾燥やくすみ、細かい乾燥ジワが大きな悩みになりやすく、ベースメイクでは生き生きとしたツヤと潤い感のある仕上がりを求めます。"
      : "乾燥は苦手ですが、仕上がりはすっきりとしたマット感を好みます。内側は潤い、表面はさらっとして、細かいシワを目立たせないなめらかなメイクが理想です。";

  const routine = precise
    ? "メイクの完成度を上げるためなら手間を惜しまないタイプです。もしかするとかなりのコスメ好きかもしれません。"
    : "毎日続けやすい、比較的シンプルで持続可能なメイクルーティンを好みます。";

  const stability = variable
    ? "使う製品や肌状態、環境によって仕上がりがかなり変わりやすいタイプです。運命のアイテムを見つけたと思っても、ある日突然合わなくなることがあります。自分にぴったりの製品選びは簡単ではありませんが、理想がはっきりしているため、納得できる仕上がりを求めていろいろ試す傾向があります。"
    : "製品や体調、環境による変化は比較的小さく、肌状態は安定しているタイプです。一度自分に合うルーティンが見つかると長く続ける傾向があります。新しい製品を試すリスクは低めですが、心から気に入る逸品に出会うのが難しいこともあります。";

  return `${tags}\n\n${skin}\n${finish}\n\n${routine}\n${stability}\n\nLAYAD Makeup 16 Typesは、肌タイプとメイクの好みに合わせて、使い方や相性の良いアイテムなどのヒントを提供するためにLAYADが独自に制作したコンテンツです。\n- 買いたいあの商品は自分のタイプにどれくらい合う？\n- 同じタイプの人はどんな製品に満足している？\n\nみんなで体験を共有して話してみましょう！`;
}

export const BEAUTY_TYPE_DESCRIPTIONS: Record<ResultDescriptionLocale, Record<BeautyTypeCode, string>> = {
  ko: Object.fromEntries(codes.map((code) => [code, BEAUTY_TYPE_DESCRIPTIONS_KO[code]])) as Record<BeautyTypeCode, string>,
  en: Object.fromEntries(codes.map((code) => [code, englishDescription(code)])) as Record<BeautyTypeCode, string>,
  ja: Object.fromEntries(codes.map((code) => [code, japaneseDescription(code)])) as Record<BeautyTypeCode, string>,
};
