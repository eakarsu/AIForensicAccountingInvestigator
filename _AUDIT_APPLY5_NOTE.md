# Apply Pass 5 — AIForensicAccountingInvestigator

- **Date:** 2026-05-08
- **Stack:** Node-Express (Sequelize/Postgres) + React (CRA). Backend in `backend/src/`, FE in `frontend/src/`. JWT bearer middleware (`middleware/auth`); `aiRateLimiter`; `services/openrouter.callOpenRouter`.
- **Audit source:** `_AUDIT/reports/batch_03.md` #36 (skeleton, 10 routes, 0 AI per audit — stale).

## Verified present (no new work on backend)

Prior pass-5 work already applied:

- `backend/src/routes/extras.js` mounted at `/api/extras` (server.js line 96) with 5 endpoints:
  1. `POST /ml-fraud-detector/score` — TOO-RISKY heuristic stub (deterministic; documented limits).
  2. `POST /timeseries-anomaly/detect` — MECHANICAL rolling z-score.
  3. `POST /restatement-predict` — MECHANICAL signals from ratios + auditor changes.
  4. `POST /external-screening` — NEEDS-CREDS (OFAC / sanctions / PEP feeds).
  5. `POST /sec-edgar/pull` — NEEDS-CREDS (SEC_EDGAR_USER_AGENT or similar).
- Pass 4 already added `/api/ai/*` (5 endpoints) and `/api/network/*` (2 endpoints).

## Implemented (this pass) — FE wiring for pass-5 backend

The pass-5 backend was added without an accompanying FE page. Filled the gap:

- **New file:** `frontend/src/pages/ExtrasTools.js` — tabbed JSON tool with sample payloads for all 5 extras endpoints. Renders 503 banner with `missing` env hint. Uses central `services/api.js` axios client (JWT auto-injected).
- **Edit:** `frontend/src/App.js` — imported `ExtrasTools` and added `<Route path="/extras" />` (2 lines).

## Deferred

| Item | Category | Reason |
|------|----------|--------|
| ML fraud-detection model training pipeline | TOO-RISKY | Heuristic stub in place; real training needs labeled data + model storage. |
| OFAC / sanctions / PEP screening feed | NEEDS-CREDS | Documented env stubs; commercial vendor required. |
| SEC EDGAR live pull | NEEDS-CREDS | EDGAR has free public API but requires `User-Agent` policy compliance — gated. |
| Network graph visualization | NEEDS-PRODUCT-DECISION | Adding SVG/D3 layer is non-trivial product decision. |
| Investigation case management UI | NEEDS-PRODUCT-DECISION | Backend supports it via existing `audit`/`reports`; FE needs design. |

## Smoke test

- `node --check backend/src/routes/extras.js` PASS.
- `node --check backend/src/server.js` PASS.
- `@babel/parser` (jsx) parse of `ExtrasTools.js` and `App.js` PASS.
- Live HTTP smoke: skipped (existing `_AUDIT_NOTE.md` already records pass-4 live test).

## Notes

5/5 pass-5 cap items implemented as one BE module (extras.js). FE page added in this pass to satisfy "BE + FE" requirement.
