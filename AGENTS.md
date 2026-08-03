<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LAYAD Repository Instructions

## Mandatory reading order

Before proposing or implementing changes, read:
1. `docs/MASTER_DESIGN.md`
2. `docs/MVP_CURRENT_STATE.md`
3. `docs/TARGET_DESIGN.md`
4. `docs/DECISION_LOG.md`
5. `docs/BACKLOG.md`
6. `docs/PROJECT_OPERATING_STANDARD.md`

## Work mode

Every request must be classified as one of the following.

### DESIGN ONLY
Use when the user asks to design, review, plan, or wait for instructions.
- Do not change application code, DB migrations, environment variables, or deployment configuration.
- Do not deploy.

### DEVELOP ONLY
Use when the user explicitly asks to develop but not deploy.
- Work in a feature branch.
- Keep changes small and reversible.
- Add or update tests.
- Report affected files and regression risks.
- Do not merge or deploy without approval.

### DEVELOP AND DEPLOY
Use only when the user explicitly asks to develop and deploy.
- Confirm scope against approved design documents.
- Develop in a controlled branch or commit.
- Run checks and regression tests.
- Verify Preview before Production when available.
- Report deployment status honestly.

## Two-track protection

Track A is the stable MVP. Track B is documentation and future design.
- Documentation work must not modify `/src`, `/supabase`, runtime configuration, or Production deployment.
- Future design must not be described as implemented.
- Production defects must not be mixed with broad redesign work.

## Requirement status

Use one of:
`IDEA`, `DESIGNED`, `DEVELOPED`, `DEPLOYED`, `VERIFIED`, `DEFERRED`, `REJECTED`.

Never claim completion unless status and evidence support the claim.

## Product invariant

The primary value of LAYAD is:

> Showing how well the selected product matches the member's Beauty Code.

User-facing product flows must prioritize the member's code, selected product, matching score, score meaning, ranking, and evidence.

## Safety rules

- Do not expose service-role keys, secret keys, raw IP addresses, or personal data.
- Do not grant public DB access to solve a server permission problem without explicit security review.
- DB changes require migration, rollback consideration, and data impact notes.
- Test data must be tagged and removable without affecting real data.
- When documents, code, and instructions conflict, stop and request a decision.
