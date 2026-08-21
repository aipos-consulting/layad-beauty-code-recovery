const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || process.env.OPENAI_ANALYSIS_MODEL || "gpt-5-mini";
const product = "디어달리아 글로우 프라이머";

if (!apiKey) {
  console.log("BENCHMARK_SKIPPED no OPENAI_API_KEY");
  process.exit(0);
}

const sampleReviews = [
  "PERFORMANCE-ONLY SAMPLE: 촉촉하고 광이 자연스럽게 올라오며 베이스가 들뜨지 않는 편이라는 사용감.",
  "PERFORMANCE-ONLY SAMPLE: 발림성이 부드럽고 얇게 펴 발리며 메이크업 전 단계에서 사용하기 편하다는 사용감.",
  "PERFORMANCE-ONLY SAMPLE: 피부가 건조할 때 윤광 표현에 도움이 되지만 양이 많으면 번들거릴 수 있다는 사용감.",
  "PERFORMANCE-ONLY SAMPLE: 파운데이션과 함께 사용했을 때 밀림이 적고 전체적으로 균일하게 표현된다는 사용감.",
  "PERFORMANCE-ONLY SAMPLE: 빠르게 바르기 쉽고 자연스러운 글로우가 유지되지만 피부 상태에 따라 지속감 차이가 있다는 사용감."
];

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    features: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          reviewIndex: { type: "integer", minimum: 0, maximum: 4 },
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

function outputText(payload) {
  if (payload.output_text) return payload.output_text;
  return (payload.output || []).flatMap(x => x.content || []).map(x => x.text || "").join("");
}

function localScore(parsed) {
  const start = performance.now();
  const sums = { OD: { O: 0, D: 0 }, GM: { G: 0, M: 0 }, PC: { P: 0, C: 0 }, VE: { V: 0, E: 0 } };
  for (const f of parsed.features || []) {
    const axis = sums[f.axis];
    if (!axis || !(f.code in axis)) continue;
    let w = Math.max(0, Math.min(1, Number(f.intensity) || 0)) * Math.max(0, Math.min(1, Number(f.confidence) || 0));
    if (f.sentiment === "negative") w *= -1;
    axis[f.code] += w;
  }
  const result = {};
  for (const [axis, pair] of Object.entries(sums)) {
    const keys = Object.keys(pair);
    const a = Math.max(0, pair[keys[0]]);
    const b = Math.max(0, pair[keys[1]]);
    const total = a + b;
    result[axis] = total ? [Math.round(a / total * 100), Math.round(b / total * 100)] : [50, 50];
  }
  return { scoringMs: Math.round(performance.now() - start), result };
}

async function oneRun(i) {
  const totalStart = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("9s SLA timeout")), 9000);
  const prompt = `LAYAD latency benchmark, analysis only. Product label: ${product}. The five review sentences below are synthetic performance-test inputs, not verified product evidence. Do not browse the web. Extract only strongly supported usage features and map them to OD, GM, PC, VE. P=Precise, C=Convenient, V=Variable, E=Even. Keep output concise.\n\n${sampleReviews.map((x, idx) => `${idx}: ${x}`).join("\n")}`;
  try {
    const openaiStart = performance.now();
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        input: prompt,
        text: { format: { type: "json_schema", name: "layad_analysis_latency", strict: true, schema } }
      }),
      signal: controller.signal
    });
    const openaiMs = Math.round(performance.now() - openaiStart);
    if (!response.ok) {
      console.log(`BENCHMARK_ANALYSIS_RUN ${i} FAIL status=${response.status} openaiMs=${openaiMs} totalMs=${Math.round(performance.now()-totalStart)}`);
      console.log((await response.text()).slice(0, 500).replace(/\s+/g, " "));
      return { ok: false, totalMs: Math.round(performance.now()-totalStart), openaiMs };
    }
    const payload = await response.json();
    const text = outputText(payload);
    const parsed = JSON.parse(text || '{"features":[]}');
    const { scoringMs } = localScore(parsed);
    const totalMs = Math.round(performance.now() - totalStart);
    console.log(`BENCHMARK_ANALYSIS_RUN ${i} OK model=${model} features=${(parsed.features||[]).length} openaiMs=${openaiMs} scoringMs=${scoringMs} totalMs=${totalMs} within10s=${totalMs <= 10000}`);
    return { ok: true, totalMs, openaiMs, scoringMs };
  } catch (e) {
    const totalMs = Math.round(performance.now() - totalStart);
    console.log(`BENCHMARK_ANALYSIS_RUN ${i} FAIL error=${String(e?.message || e)} totalMs=${totalMs} within10s=false`);
    return { ok: false, totalMs };
  } finally {
    clearTimeout(timeout);
  }
}

const results = [];
for (let i = 1; i <= 3; i++) results.push(await oneRun(i));
const successes = results.filter(x => x.ok);
const within = successes.filter(x => x.totalMs <= 10000).length;
const avg = successes.length ? Math.round(successes.reduce((s,x)=>s+x.totalMs,0)/successes.length) : null;
console.log(`BENCHMARK_ANALYSIS_SUMMARY runs=3 success=${successes.length} within10s=${within} avgMs=${avg ?? "n/a"}`);
