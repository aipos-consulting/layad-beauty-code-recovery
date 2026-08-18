# LAYAD Core Intelligence Architecture

Status: Proposed operating baseline
Date: 2026-08-18

## 1. Why this exists
LAYAD product-fit intelligence is a core business asset, not a simple AI feature. The architecture must turn review language into proprietary, reusable product intelligence while controlling AI cost and preserving explainability.

## 2. Business value chain
Public product/review data -> structured review evidence -> LAYAD keyword intelligence -> product axis profile -> 16 Beauty Code fit scores -> user response/behavior data.

The defensible asset is the accumulated structured data and deterministic scoring logic, not dependency on a specific model provider.

## 3. Architectural layers
### A. Data Asset Layer
- products and canonical identities/aliases
- review sources and reviews
- review evidence/features
- approved keyword master and keyword candidates
- analysis runs and audit history

### B. LAYAD Intelligence Layer
- O/D, G/M, P/C, V/E mappings
- evidence aggregation
- product axis profiles
- deterministic 16-type fit calculation
- confidence and evidence sufficiency rules

### C. AI Assist Layer
- review interpretation where keyword/rule logic is insufficient
- ambiguity resolution
- contextual evidence extraction
- candidate keyword discovery
- never the sole source of an unexplained production fit score

### D. Operations Layer
- OpenAI cost guard and hard stop
- automatic vs manual-review routing
- analysis status, timeout, retry, monitoring
- token/cost/audit metrics

## 4. Product one-analysis principle
A canonical product is analyzed once for an approved analysis version. Subsequent user requests reuse stored results.

Re-analysis is allowed only for a controlled reason, such as:
- analysis-version change;
- material review refresh policy;
- data-quality correction;
- explicit operator-approved re-analysis.

Product normalization/alias resolution must occur before a new analysis run is created. Concurrency protection must prevent duplicate active runs for the same product/version.

## 5. Evidence-first analysis
Production fit must be traceable to review/product evidence. Each useful review signal should preserve:
- review/source identity;
- evidence excerpt;
- feature label/keyword;
- axis and code;
- sentiment;
- intensity;
- confidence;
- context/conditions where relevant;
- analysis version;
- verification state.

Insufficient evidence must result in pending, low-confidence, or manual-review handling rather than invented certainty.

## 6. Keyword Intelligence
Add two managed concepts.

### review_keyword_master
Approved LAYAD vocabulary. Recommended fields:
- id
- canonical_keyword
- language_code
- axis
- code
- base_weight
- synonyms/normalized forms
- context rule or exclusions
- status
- verification status
- version
- created/updated/approved metadata

### review_keyword_candidates
Unapproved expressions discovered from reviews/AI. Recommended fields:
- expression
- language_code
- proposed axis/code
- proposed weight
- confidence
- occurrence count
- product/source counts
- sample evidence references
- first_seen_at / last_seen_at
- status: pending/approved/rejected
- reviewer/decision metadata

Candidate data must not silently influence production scoring as approved master knowledge.

## 7. Target runtime flow
1. User submits product name or URL.
2. Normalize and identify canonical product.
3. Look up approved `product_type_fits` for current analysis version.
4. If found, return stored fit immediately; no OpenAI call.
5. If not found, create or reuse the single active analysis run.
6. Collect/validate review sources and reviews.
7. Remove duplicates/low-value records with deterministic logic where possible.
8. Match approved keyword master first.
9. Use OpenAI only for unresolved contextual evidence and candidate discovery.
10. Store evidence in `review_features`.
11. Aggregate `product_axis_profiles`.
12. Compute all 16 `product_type_fits` with LAYAD code.
13. Persist analysis metadata, token usage, cost, review/evidence counts, confidence, and version.
14. Return user's Beauty Code result.

## 8. Customer wait-state policy
The browser must not represent manual waiting as active AI work.

Target UX:
- 0-10s: product information check;
- 10-30s: review/evidence analysis message when actual analysis is active;
- after bounded wait (target 30s): stop indefinite spinner and show delayed-processing status plus `Check result again` action;
- terminal failure: clear recoverable/manual-review message;
- completed: display stored result.

Server processing may continue independently of the client wait state where the deployed architecture supports it, but the UI must never promise completion that is not happening.

## 9. Automatic/manual policy
Automatic is the standard customer path when configuration, evidence, and budget permit.

Manual review is reserved for:
- insufficient/contradictory evidence;
- product identity ambiguity;
- OpenAI/provider failure;
- budget/cost-guard block;
- low confidence;
- operator quality-control exception.

Manual ChatGPT copy/paste must not be required for every customer request.

## 10. Cost architecture
Cost is controlled by:
- one-analysis-per-product/version reuse;
- deterministic review filtering and keyword lookup before AI;
- AI only on unresolved evidence;
- stored results for repeated users;
- token/output limits where compatible with quality;
- mandatory monthly hard-stop guard;
- run-level input/output token and estimated/actual cost records.

Primary economic KPI is cost per newly analyzed canonical product, not cost per user request.

## 11. Core KPIs
Track at minimum:
- analyzed canonical products;
- product cache/reuse rate;
- OpenAI avoided-call rate;
- reviews and valid evidence per product;
- approved keyword-master size and candidate conversion rate;
- analysis confidence distribution;
- analysis cost per new product;
- duplicate-analysis prevention count;
- automatic completion rate;
- manual-review rate;
- timeout/delayed-processing rate;
- user result engagement/conversion metrics when defined.

## 12. Current GAP as of 2026-08-18
Existing strengths:
- tables for products, review sources, reviews, analysis runs, review features, axis profiles, and 16-type fits exist in migrations;
- review evidence scoring functions exist;
- OpenAI admin analysis endpoint and cost guard exist;
- result polling exists.

Critical gaps:
- customer product request currently records `submitted`/manual-review mode rather than starting the target automatic pipeline;
- existing product-result reuse is not enforced at request entry;
- real review collection/evidence pipeline is not connected end-to-end;
- keyword master/candidate DB and Admin workflow are missing;
- current OpenAI admin prompt can directly generate 16 scores instead of strictly producing evidence;
- manual ChatGPT workflow remains the normal Admin workflow;
- client wait/status behavior can leave users watching a spinner without meaningful progress.

## 13. Implementation priority
P0 Governance and safety: this document, AGENTS, Skill, source-of-truth verification.
P1 User reliability: bounded timeout/status/error UX.
P2 Product reuse: canonical identity, result lookup, duplicate-run protection.
P3 Evidence pipeline: real reviews -> review_features -> profiles -> deterministic fits.
P4 Keyword Intelligence: master/candidate schema, Admin lifecycle, deterministic pre-analysis.
P5 Automatic AI orchestration: cost-guarded evidence extraction with manual fallback.
P6 Investor/operations metrics: reuse, evidence, keywords, confidence, cost and automation dashboards.

No phase may bypass the non-negotiable rules in `AGENTS.md`.