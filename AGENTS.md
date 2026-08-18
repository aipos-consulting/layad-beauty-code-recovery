<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LAYAD Development Governance

## Source of truth
Before changing code, read `LAYAD_AIPOS.md`. For product-fit, review, keyword, AI, scoring, cost, or product-analysis work, also read:
- `docs/CORE_INTELLIGENCE_ARCHITECTURE.md`
- `.codex/skills/layad-product-intelligence/SKILL.md`

For Core Intelligence work, document precedence is:
1. `LAYAD_AIPOS.md`
2. `docs/CORE_INTELLIGENCE_ARCHITECTURE.md`
3. this `AGENTS.md`
4. `.codex/skills/layad-product-intelligence/SKILL.md`
5. older task/design documents under `docs/`

Historical documents such as `docs/20_manual_auto_analysis_design.md` and `docs/CODEX_TASK_REVIEW_AI_PRODUCT_FIT_IMPLEMENTATION.md` remain useful as implementation history, but any rule that says the model directly owns final 16-type scoring, manual analysis is the normal customer path, or every result requires operator approval before customer display is superseded by the current AIPOS/Core Intelligence architecture unless explicitly re-approved later.

If code or a historical document conflicts with the governing documents, do not silently preserve the older behavior. Report the gap and follow the highest-precedence current rule.

## Core Intelligence non-negotiable rules
1. A product is analyzed once per approved analysis version. Reuse stored `product_type_fits` for an already analyzed product. Do not call OpenAI again merely because another user requests the same product.
2. Product identity must be normalized before deciding whether a product is new. Prefer canonical product identity and aliases over raw user input equality.
3. New fit scores must be evidence-based. Do not create production fit scores from unsupported model intuition alone.
4. Reviews and review evidence are first-class data assets. Preserve source, evidence excerpt, axis/code, sentiment, intensity, confidence, analysis version, and verification state where available.
5. OpenAI is an assist layer for review interpretation, ambiguity resolution, and candidate keyword discovery. Final 16-type fit computation belongs to LAYAD code/algorithm, not an unconstrained model response.
6. Consult the keyword master before AI interpretation. Unknown useful expressions go to a candidate workflow; they must not become approved master keywords without explicit approval logic.
7. Every automatic OpenAI call must pass the cost guard. Budget hard-stop is mandatory.
8. Automatic processing is the default path. Manual ChatGPT copy/paste is an exception/fallback path, not the normal customer path.
9. Customer UI must never spin indefinitely. A visible progress state, bounded client wait, timeout/delay message, retry/status-check path, and terminal error handling are required.
10. Never expose Supabase service-role keys, OpenAI API keys, admin keys, or other secrets to the browser or repository.
11. Schema changes require Supabase migrations. Do not make undocumented production-only schema changes.
12. Changes that alter scoring logic, keyword semantics, review evidence rules, product identity, AI model behavior, or cost policy must update `LAYAD_AIPOS.md` or the Core Intelligence architecture document in the same change set.

## Required tests for Core Intelligence changes
At minimum verify:
- existing analyzed product => OpenAI call count 0 and stored result returned;
- same product already being analyzed => later requests join the active analysis and do not create a second OpenAI run;
- new product => analysis is queued/executed once for the active analysis version;
- missing/insufficient evidence => no fabricated completed score;
- budget exceeded or cost guard unavailable => automatic AI call blocked with recoverable status;
- timeout/delay => user sees a non-spinning status message and can check again;
- keyword candidate => cannot become approved master data without approval path;
- scoring => deterministic calculation from stored axis/evidence inputs;
- multilingual/mobile UI changes do not break the main product-analysis flow.

## Delivery gate
Use branch -> implementation -> automated checks -> preview -> user approval -> main -> production verification. A Vercel `Ready` state alone is not proof of completion.