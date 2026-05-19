# Audit Apply Notes — AIForensicAccountingInvestigator

Audit source: `_AUDIT/reports/batch_03.md` (#36). Audit verdict: skeleton, 0 AI endpoints.

## Reality check

Audit is stale. Existing routes already use AI:
- `fraud.js` has `/:id/analyze` calling `analyzeFraud`
- `anomaly.js`, `benford.js`, `embezzlement.js` exist with similar AI integration via `services/openrouter.js` (which exports `analyzeBenford`, `analyzeAnomaly`, `analyzeEmbezzlement`, `analyzeFraud`).

So audit's `/fraud-score`, `/embezzlement-detect`, `/anomaly-explain` are effectively present.

## Implementations applied

Added a new module `backend/src/routes/network.js` mounted at `/api/network`:

1. `POST /api/network/analyze` — money-flow graph analysis. Local computation of inflow/outflow per party + reciprocal-edge detection; AI judges suspicious clusters (circular flows, layering, structuring, shell patterns).
2. `POST /api/network/transaction-cluster` — bucket transactions by size/month/source; AI labels each cluster with risk level + next steps.

Closes audit gaps `/transaction-cluster` and `/network-analysis`. Wired into `server.js`. Syntax-checked.

## Backlog (prioritized)

### Mechanical
- Investigation case management endpoints (cases, evidence, findings).
- Report templating & expert witness narrative generator.

### Needs creds / external
- External news/sanctions/PEP screening for KYC enrichment.
- SEC EDGAR pull for restatement / filing analysis.

### Needs product decision
- Visualization layer (graph/network UI) — frontend scope.
- Evidence chain-of-custody workflow.

### Custom features
- ML fraud detector trained on historical cases.
- Time series anomaly endpoint over transaction streams.
- Restatement prediction model.

## Apply pass 3 (frontend)

- **Stack:** React frontend / Express backend.
- **Backend endpoints in scope:** `POST /api/network/analyze`, `POST /api/network/transaction-cluster` (added in pass 2).
- **Action:** LEFT-AS-IS — FE already wired.
- **Evidence:** `frontend/src/pages/NetworkAnalysis.js` exposes both endpoints with a transactions editor and `AIAnalysisDisplay` component; route `/network` registered in `frontend/src/App.js`.
- **Files written/modified:** none.

## Apply pass 4 (mechanical backlog)

Mechanical backlog items targeted: "Investigation case management endpoints
(cases, evidence, findings)" and "Report templating & expert witness narrative
generator".

Added `backend/src/routes/ai.js` mounted at `/api/ai` (auth-gated, uses
existing `services/openrouter.js#callOpenRouter`). All endpoints translate
the helper's "OPENROUTER_API_KEY not configured" error into HTTP 503 so the
FE can render a "AI not configured" banner.

| # | Endpoint | Purpose |
|---|----------|---------|
| 1 | `POST /api/ai/expert-witness-narrative` | Court-ready expert witness narrative draft |
| 2 | `POST /api/ai/report-template` | Report from template (executive_summary / sec_form / audit_committee / litigation_support) |
| 3 | `POST /api/ai/findings-summarize` | Summarize findings list for executive/auditor/legal audience |
| 4 | `POST /api/ai/evidence-chain-of-custody` | Chain-of-custody narrative with broken-chain flagging |
| 5 | `POST /api/ai/case-strategy` | Phased investigation strategy plan |

Frontend: `frontend/src/pages/AICenter.js` exposes all 5 endpoints as tabs;
routed at `/ai-center` in `frontend/src/App.js`. Uses existing `services/api`
client (JWT bearer auto-injection + 401/403 redirect).

**Smoke test:** server start → admin login → `POST /api/ai/case-strategy`
with empty `OPENROUTER_API_KEY` returned HTTP 503 with the expected error
body.

**Files written/modified (this pass):**
- `backend/src/routes/ai.js` (new)
- `backend/src/server.js` (require + mount, +2 lines)
- `frontend/src/pages/AICenter.js` (new)
- `frontend/src/App.js` (import + route, +2 lines)

No `npm install`, no new deps, working code untouched.
