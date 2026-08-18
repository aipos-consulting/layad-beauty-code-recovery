# LAYAD Product Intelligence Skill

## Purpose
Use this skill for any change involving product fit analysis, product identity, reviews, review evidence, keyword intelligence, Beauty Code scoring, OpenAI analysis, analysis cost, timeout/status handling, or Admin analysis operations.

## Governing documents
Read first:
1. `LAYAD_AIPOS.md`
2. `AGENTS.md`
3. `docs/CORE_INTELLIGENCE_ARCHITECTURE.md`

## Standard workflow
1. Restate the requested business outcome and identify whether it changes a core rule.
2. Inspect the existing implementation and database schema before editing.
3. Check product identity and one-analysis-per-product/version behavior.
4. Check review/evidence provenance and keyword-master usage.
5. Estimate OpenAI call and token/cost impact; preserve mandatory cost guard.
6. Design the smallest coherent change across API, DB, algorithm, Admin, and customer UX. Do not patch only the visible symptom when the workflow is inconsistent.
7. Use migrations for schema changes and keep secrets server-side.
8. Implement deterministic LAYAD scoring from stored evidence/profile inputs. Do not delegate final production scoring to unconstrained AI output.
9. Implement bounded wait states and recoverable timeout/error status for customer-facing analysis.
10. Add or update tests for invariants below.
11. Verify Preview before production merge.
12. Update governance/design docs when a core rule changes.

## Core invariants
- Existing approved product result for current analysis version: reuse DB; OpenAI = 0 calls.
- New product: at most one active analysis run per product/version.
- Evidence requirement: no unsupported production score.
- Keyword master first; unknown keyword -> candidate -> approval -> master.
- OpenAI: evidence extraction/ambiguity/candidate discovery only unless an explicitly approved design version says otherwise.
- Final 16-type score: LAYAD algorithm.
- Cost guard: fail closed for automatic AI analysis.
- Manual review: fallback only.
- Customer wait: no indefinite spinner.
- Traceability: analysis version, review count, evidence count, token usage, cost, confidence, and status should be auditable.

## Data flow target
User input -> normalize product -> lookup approved result ->
- HIT: return stored fit for user's Beauty Code
- MISS: create product/analysis run -> collect/validate reviews -> keyword matching -> AI evidence extraction for unresolved context -> store evidence -> calculate axis profile -> calculate all 16 fits -> persist -> return result.

## Keyword lifecycle
1. Normalize review text and detect approved keywords/synonyms.
2. Apply deterministic mappings where context is sufficiently clear.
3. Send ambiguous/unmapped expressions to AI evidence extraction.
4. Store useful unseen expressions as candidates with frequency, proposed axis/code, confidence, source examples, and first/last seen dates.
5. Admin approves/rejects candidates.
6. Only approved entries participate as master knowledge.

## Required test scenarios
- duplicate spelling/alias resolves to same canonical product where configured;
- repeat product request uses stored result without AI call;
- concurrent requests do not start duplicate active analysis runs;
- insufficient review evidence returns pending/manual-review state, not fabricated score;
- budget hard stop blocks OpenAI;
- OpenAI failure moves request to recoverable/manual state;
- client timeout stops spinner and displays status/check-again action;
- scoring is deterministic for fixed evidence inputs;
- candidate keyword cannot self-promote;
- analysis version change can intentionally trigger re-analysis while preserving prior audit history.

## Completion report
Report: files changed, schema changes, tests, OpenAI/cost impact, data migration impact, preview URL/status, known gaps, and whether `LAYAD_AIPOS.md` was updated.