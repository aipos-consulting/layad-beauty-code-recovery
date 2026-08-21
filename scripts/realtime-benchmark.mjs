const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.log("BENCHMARK_SKIPPED no OPENAI_API_KEY");
  process.exit(0);
}

const product = "디어달리아 글로우 프라이머";
const reviews = [
  "촉촉하게 밀착되고 자연스러운 윤광이 올라오며 베이스가 들뜨지 않는 편이다.",
  "부드럽고 얇게 펴 발려 메이크업 전에 빠르게 사용하기 편하다.",
  "건조한 날에는 윤광 표현이 좋지만 양이 많으면 번들거림이 생길 수 있다.",
  "파운데이션과 함께 사용했을 때 밀림이 적고 비교적 균일하게 표현된다.",
  "바르기 쉽고 자연스러운 광이 유지되지만 피부 상태에 따라 지속감 차이가 있다.",
  "건성 피부에서는 당김을 줄이고 베이스가 매끈하게 올라가는 데 도움이 됐다.",
  "지성 피부에서는 오후가 되면 광이 번들거림처럼 느껴질 때가 있었다.",
  "소량만 사용하면 표현이 깔끔하지만 사용량 조절이 중요하다.",
  "손으로 발라도 얼룩이 적고 빠르게 펴져 아침 메이크업에 편리했다.",
  "파운데이션 전에 바르면 피부결이 정돈돼 보이고 광이 과하지 않았다.",
  "날씨가 건조할수록 만족도가 높았고 습한 날에는 지속력이 떨어지는 느낌이 있었다.",
  "쿠션과 함께 사용했을 때는 잘 맞았지만 매트 파운데이션과는 조합 차이가 있었다.",
  "피부 표면이 매끈하게 보이지만 모공을 완전히 가려주는 타입은 아니었다.",
  "얇게 한 겹 바르면 자연스럽지만 여러 겹 바르면 밀릴 수 있었다.",
  "메이크업 초보자도 사용법이 어렵지 않고 별도 도구 없이 바르기 쉬웠다.",
  "광 표현은 비교적 일정했지만 유분이 많은 부위에서는 시간이 지나며 차이가 생겼다.",
  "건조한 볼 부위에서는 촉촉함이 오래 갔고 코 주변에서는 유지력이 짧았다.",
  "베이스 전에 사용하면 파운데이션이 갈라지는 현상이 줄었다는 느낌이 있었다.",
  "소량 사용 시 피부가 정돈돼 보이고 수정 화장도 비교적 수월했다.",
  "피부 타입과 함께 쓰는 베이스 제품에 따라 결과가 달라지는 편이었다."
];

const fullSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    features: {
      type: "array",
      maxItems: 80,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          reviewIndex: { type: "integer", minimum: 0, maximum: 19 },
          axis: { type: "string", enum: ["OD", "GM", "PC", "VE"] },
          code: { type: "string", enum: ["O", "D", "G", "M", "P", "C", "V", "E"] },
          sentiment: { type: "string", enum: ["positive", "negative", "neutral", "mixed"] },
          intensity: { type: "number", minimum: 0, maximum: 1 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          keyword: { type: "string" }
        },
        required: ["reviewIndex", "axis", "code", "sentiment", "intensity", "confidence", "keyword"]
      }
    }
  },
  required: ["features"]
};

const compactSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    signals: {
      type: "array",
      maxItems: 80,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          i: { type: "integer", minimum: 0, maximum: 19 },
          c: { type: "string", enum: ["O", "D", "G", "M", "P", "C", "V", "E"] },
          w: { type: "integer", minimum: 1, maximum: 3 }
        },
        required: ["i", "c", "w"]
      }
    }
  },
  required: ["signals"]
};

function outputText(payload) {
  if (payload.output_text) return payload.output_text;
  return (payload.output || []).flatMap(x => x.content || []).map(x => x.text || "").join("");
}

const reviewText = reviews.map((r, i) => `${i}: ${r}`).join("\n");
const fullPrompt = `LAYAD analysis benchmark. Product label: ${product}. Treat the 20 sentences as fixed performance-test review inputs. Do not browse. For each strongly supported signal, map the review to OD, GM, PC, or VE; choose O/D/G/M/P/C/V/E, sentiment, intensity, confidence, and a short keyword. P=Precise, C=Convenient, V=Variable, E=Even. Avoid weak or speculative signals.\n\n${reviewText}`;
const compactPrompt = `Classify strong LAYAD signals from 20 fixed review sentences. No web. For each strong signal return only review index i, code c in O,D,G,M,P,C,V,E, and strength w 1..3. P=Precise, C=Convenient, V=Variable, E=Even. No explanation.\n\n${reviewText}`;

const tests = [
  { name: "BASELINE", model: "gpt-5-mini", prompt: fullPrompt, schema: fullSchema, reasoning: undefined, maxOutput: undefined },
  { name: "OPT1_MIN_REASONING", model: "gpt-5-mini", prompt: fullPrompt, schema: fullSchema, reasoning: { effort: "minimal" }, maxOutput: 2400 },
  { name: "OPT2_COMPACT", model: "gpt-5-mini", prompt: compactPrompt, schema: compactSchema, reasoning: { effort: "minimal" }, maxOutput: 1200 },
  { name: "OPT3_NANO_COMPACT", model: "gpt-5-nano", prompt: compactPrompt, schema: compactSchema, reasoning: { effort: "minimal" }, maxOutput: 1200 },
  { name: "OPT4_54NANO_COMPACT", model: "gpt-5.4-nano", prompt: compactPrompt, schema: compactSchema, reasoning: { effort: "none" }, maxOutput: 1200 }
];

async function runTest(t) {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("120s timeout")), 120000);
  try {
    const body = {
      model: t.model,
      store: false,
      input: t.prompt,
      text: { format: { type: "json_schema", name: `layad_${t.name.toLowerCase()}`, strict: true, schema: t.schema } }
    };
    if (t.reasoning) body.reasoning = t.reasoning;
    if (t.maxOutput) body.max_output_tokens = t.maxOutput;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const ms = Math.round(performance.now() - start);
    if (!response.ok) {
      const err = (await response.text()).slice(0, 500).replace(/\s+/g, " ");
      console.log(`LATENCY_TEST ${t.name} FAIL model=${t.model} status=${response.status} ms=${ms} error=${err}`);
      return { name: t.name, ok: false, ms };
    }
    const payload = await response.json();
    const text = outputText(payload);
    let count = 0;
    try {
      const parsed = JSON.parse(text || "{}");
      count = Array.isArray(parsed.features) ? parsed.features.length : Array.isArray(parsed.signals) ? parsed.signals.length : 0;
    } catch {}
    const usage = payload.usage || {};
    console.log(`LATENCY_TEST ${t.name} OK model=${t.model} ms=${ms} sec=${(ms/1000).toFixed(3)} items=${count} input_tokens=${usage.input_tokens ?? "n/a"} output_tokens=${usage.output_tokens ?? "n/a"} reasoning_tokens=${usage.output_tokens_details?.reasoning_tokens ?? "n/a"}`);
    return { name: t.name, ok: true, ms, count };
  } catch (e) {
    const ms = Math.round(performance.now() - start);
    console.log(`LATENCY_TEST ${t.name} FAIL model=${t.model} ms=${ms} error=${String(e?.message || e)}`);
    return { name: t.name, ok: false, ms };
  } finally {
    clearTimeout(timeout);
  }
}

console.log(`LATENCY_SUITE START reviews=${reviews.length} timeout=120s`);
const results = [];
for (const test of tests) results.push(await runTest(test));
const base = results.find(r => r.name === "BASELINE" && r.ok);
for (const r of results) {
  if (base && r.ok) console.log(`LATENCY_COMPARE ${r.name} vs_baseline=${((r.ms / base.ms) * 100).toFixed(1)}pct speedup=${(base.ms / r.ms).toFixed(2)}x`);
}
console.log("LATENCY_SUITE END");