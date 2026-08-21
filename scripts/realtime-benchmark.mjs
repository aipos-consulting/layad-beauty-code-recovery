const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || process.env.OPENAI_ANALYSIS_MODEL || "gpt-5-mini";
const product = "디어달리아 글로우 프라이머";

if (!apiKey) {
  console.log("BENCHMARK_SKIPPED no OPENAI_API_KEY");
  process.exit(0);
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reviews: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          sourceUrl: { type: "string" },
          reviewText: { type: "string" },
          features: {
            type: "array",
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                axis: { type: "string", enum: ["OD", "GM", "PC", "VE"] },
                code: { type: "string", enum: ["O", "D", "G", "M", "P", "C", "V", "E"] },
                sentiment: { type: "string", enum: ["positive", "negative", "neutral", "mixed"] },
                intensity: { type: "number", minimum: 0, maximum: 1 },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                keyword: { type: "string" }
              },
              required: ["axis", "code", "sentiment", "intensity", "confidence", "keyword"]
            }
          }
        },
        required: ["sourceUrl", "reviewText", "features"]
      }
    }
  },
  required: ["reviews"]
};

function outputText(payload) {
  if (payload.output_text) return payload.output_text;
  return (payload.output || []).flatMap(x => x.content || []).map(x => x.text || "").join("");
}

function localScore(parsed) {
  const start = performance.now();
  const sums = { OD: { O: 0, D: 0 }, GM: { G: 0, M: 0 }, PC: { P: 0, C: 0 }, VE: { V: 0, E: 0 } };
  for (const review of parsed.reviews || []) {
    for (const f of review.features || []) {
      const axis = sums[f.axis];
      if (!axis || !(f.code in axis)) continue;
      let w = Math.max(0, Math.min(1, Number(f.intensity) || 0)) * Math.max(0, Math.min(1, Number(f.confidence) || 0));
      if (f.sentiment === "negative") w *= -1;
      axis[f.code] += w;
    }
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
  const prompt = `Latency-sensitive LAYAD benchmark. Exact product: ${product}. Search Olive Young first and only. Find 3 to 5 PUBLIC consumer-review evidence items for this exact product. Stop immediately after enough evidence is found. Use short paraphrases, no long quotes. For each review extract at most 4 strong usage features and map them to OD, GM, PC, VE. Return fewer reviews rather than searching broadly or fabricating evidence.`;
  try {
    const openaiStart = performance.now();
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        tools: [{ type: "web_search", filters: { allowed_domains: ["oliveyoung.co.kr"] }, search_context_size: "low" }],
        input: prompt,
        text: { format: { type: "json_schema", name: "layad_latency_benchmark", strict: true, schema } }
      }),
      signal: controller.signal
    });
    const openaiMs = Math.round(performance.now() - openaiStart);
    if (!response.ok) {
      console.log(`BENCHMARK_RUN ${i} FAIL status=${response.status} openaiMs=${openaiMs} totalMs=${Math.round(performance.now()-totalStart)}`);
      console.log((await response.text()).slice(0, 500).replace(/\s+/g, " "));
      return { ok: false, totalMs: Math.round(performance.now()-totalStart), openaiMs };
    }
    const payload = await response.json();
    const text = outputText(payload);
    const parsed = JSON.parse(text || '{"reviews":[]}');
    const { scoringMs } = localScore(parsed);
    const totalMs = Math.round(performance.now() - totalStart);
    console.log(`BENCHMARK_RUN ${i} OK model=${model} reviews=${(parsed.reviews||[]).length} openaiMs=${openaiMs} scoringMs=${scoringMs} totalMs=${totalMs} within10s=${totalMs <= 10000}`);
    return { ok: true, totalMs, openaiMs, scoringMs, reviews: (parsed.reviews||[]).length };
  } catch (e) {
    const totalMs = Math.round(performance.now() - totalStart);
    console.log(`BENCHMARK_RUN ${i} FAIL error=${String(e?.message || e)} totalMs=${totalMs} within10s=false`);
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
console.log(`BENCHMARK_SUMMARY runs=3 success=${successes.length} within10s=${within} avgMs=${avg ?? "n/a"}`);
