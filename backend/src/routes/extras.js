/**
 * Apply pass 5 — backlog endpoints for AIForensicAccountingInvestigator.
 *
 * Mounted under `/api/extras`. Auth-gated. Heavy/external integrations gate
 * on env and return HTTP 503 + `{ missing: <ENV> }` when unset.
 *
 * Categories:
 *   1. ml-fraud-detector     — TOO-RISKY: in-memory deterministic stub (no
 *                              training pipeline). Documented limits.
 *   2. timeseries-anomaly    — MECHANICAL. Local rolling-mean + z-score over
 *                              the body's series; AI summary if key present.
 *   3. restatement-predict   — NEEDS-PRODUCT-DECISION. Default: heuristic
 *                              red-flag count → tier; AI summary if key set.
 *   4. external-screening    — NEEDS-CREDS (OPENSANCTIONS_API_KEY or
 *                              COMPLYADVANTAGE_API_KEY).
 *   5. sec-edgar-pull        — NEEDS-CREDS (SEC_EDGAR_USER_AGENT). EDGAR
 *                              requires a contact User-Agent per their
 *                              fair-access policy; we refuse without it.
 */
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../services/openrouter');

const router = express.Router();
router.use(authenticateToken);

function aiOrError(res, result, fallback = null) {
  if (result && result.error) {
    if (typeof result.error === 'string' && result.error.includes('OPENROUTER_API_KEY not configured')) {
      if (fallback) return res.json({ ai_unavailable: true, missing: 'OPENROUTER_API_KEY', heuristic: fallback });
      return res.status(503).json({ error: 'AI not configured', missing: 'OPENROUTER_API_KEY' });
    }
    return res.status(502).json({ error: result.error });
  }
  return null;
}

// --- 1. ML FRAUD DETECTOR (TOO-RISKY: in-memory stub) -----------------------
// PRODUCT-DECISION: no real ML pipeline. We score each transaction with a
// deterministic feature-weighted formula (round-amount weight, vendor-name
// length, amount > $X tier, weekend-flag) and label as low/medium/high risk.
// Caller can opt-in to AI summary. Documented as a stub so callers know not
// to treat the score as model output.
router.post('/ml-fraud-detector/score', async (req, res) => {
  try {
    const { transactions = [], use_ai_summary = false } = req.body || {};
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'transactions[] required' });
    }
    const scored = transactions.slice(0, 500).map((t, idx) => {
      const amt = Number(t.amount) || 0;
      let s = 0;
      const flags = [];
      if (amt > 0 && amt % 1000 === 0) { s += 0.25; flags.push('round_amount'); }
      if (amt > 9000 && amt < 10000) { s += 0.30; flags.push('possible_structuring'); }
      if (amt > 50000) { s += 0.20; flags.push('large_amount'); }
      const vendor = String(t.counterparty || t.vendor || '').trim();
      if (vendor && vendor.length < 4) { s += 0.10; flags.push('short_vendor_name'); }
      if (t.transaction_date) {
        const d = new Date(t.transaction_date);
        if (!isNaN(d) && (d.getDay() === 0 || d.getDay() === 6)) { s += 0.10; flags.push('weekend'); }
      }
      if (t.category && /cash|wire|misc/i.test(t.category)) { s += 0.10; flags.push('high_risk_category'); }
      const score = Math.min(1, s);
      const tier = score >= 0.6 ? 'high' : score >= 0.3 ? 'medium' : 'low';
      return { id: t.id ?? idx, score, tier, flags };
    });
    const summary = {
      total: scored.length,
      high: scored.filter(x => x.tier === 'high').length,
      medium: scored.filter(x => x.tier === 'medium').length,
      low: scored.filter(x => x.tier === 'low').length,
    };
    let ai_summary = null;
    if (use_ai_summary) {
      const result = await callOpenRouter(
        'You are a forensic accountant. Briefly summarize the fraud-tier distribution and the top-3 highest-scoring transactions. Output JSON.',
        `Summary: ${JSON.stringify(summary)}\nTop: ${JSON.stringify(scored.sort((a, b) => b.score - a.score).slice(0, 3))}\nReturn {"narrative": string, "next_steps": [string]}.`,
        { temperature: 0.3, maxTokens: 600 }
      );
      const errCheck = aiOrError(res, result, summary);
      if (errCheck) return errCheck;
      ai_summary = result;
    }
    return res.json({
      stub: true,
      stub_note: 'In-memory deterministic scorer. Not a trained model. See PRODUCT-DECISION comment in extras.js.',
      summary,
      scored,
      ai_summary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. TIMESERIES ANOMALY (MECHANICAL) -------------------------------------
router.post('/timeseries-anomaly/detect', async (req, res) => {
  try {
    const { series = [], window = 7, z_threshold = 2.5, use_ai_summary = false } = req.body || {};
    if (!Array.isArray(series) || series.length < 3) {
      return res.status(400).json({ error: 'series[] with >=3 points required' });
    }
    const w = Math.max(3, Math.min(30, parseInt(window, 10) || 7));
    const zt = Math.max(1, Math.min(6, Number(z_threshold) || 2.5));
    const anomalies = [];
    const values = series.map(p => Number(p.value)).filter(v => Number.isFinite(v));
    for (let i = w; i < series.length; i += 1) {
      const slice = values.slice(i - w, i);
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
      const sd = Math.sqrt(variance) || 1e-9;
      const v = Number(series[i].value);
      const z = (v - mean) / sd;
      if (Math.abs(z) >= zt) {
        anomalies.push({
          index: i,
          point: series[i],
          z_score: Number(z.toFixed(3)),
          rolling_mean: Number(mean.toFixed(3)),
          rolling_sd: Number(sd.toFixed(3)),
          direction: z > 0 ? 'spike' : 'drop',
        });
      }
    }
    let ai_summary = null;
    if (use_ai_summary) {
      const result = await callOpenRouter(
        'You are a forensic accountant. Summarize the anomalies and suggest next steps. JSON only.',
        `Detected ${anomalies.length} anomalies (window=${w}, z>=${zt}). Sample: ${JSON.stringify(anomalies.slice(0, 10))}\nReturn {"narrative": string, "next_steps": [string], "risk_level": "low|medium|high"}.`,
        { temperature: 0.3, maxTokens: 600 }
      );
      const errCheck = aiOrError(res, result, { anomalies_count: anomalies.length });
      if (errCheck) return errCheck;
      ai_summary = result;
    }
    res.json({ window: w, z_threshold: zt, anomalies, ai_summary });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 3. RESTATEMENT PREDICTION (NEEDS-PRODUCT-DECISION) ---------------------
// PRODUCT-DECISION: no calibrated model. Heuristic = count of red-flag fields
// from input maps to a tier. AI narrative optional. A real implementation
// would need labeled restatement history (Audit Analytics or Compustat).
router.post('/restatement-predict', async (req, res) => {
  try {
    const {
      company,
      red_flags = [],
      beneish_m_score,
      altman_z_score,
      audit_changes_2y = 0,
      late_filings_2y = 0,
      use_ai_summary = false,
    } = req.body || {};
    if (!company) return res.status(400).json({ error: 'company required' });

    let score = 0;
    const reasons = [];
    if (Array.isArray(red_flags)) {
      score += Math.min(0.5, red_flags.length * 0.05);
      if (red_flags.length > 0) reasons.push(`${red_flags.length} red flag(s)`);
    }
    if (typeof beneish_m_score === 'number' && beneish_m_score > -1.78) {
      score += 0.25; reasons.push('Beneish M-Score above manipulation threshold');
    }
    if (typeof altman_z_score === 'number' && altman_z_score < 1.81) {
      score += 0.15; reasons.push('Altman Z-Score in distress zone');
    }
    if (audit_changes_2y >= 2) { score += 0.15; reasons.push('Multiple auditor changes in 2y'); }
    if (late_filings_2y >= 1) { score += 0.10; reasons.push('Late filing(s) in 2y'); }
    score = Math.min(1, score);
    const tier = score >= 0.6 ? 'high' : score >= 0.3 ? 'medium' : 'low';
    const heuristic = { company, score: Number(score.toFixed(3)), tier, reasons };

    let ai_summary = null;
    if (use_ai_summary) {
      const result = await callOpenRouter(
        'You are a forensic accountant. Given heuristic restatement-risk inputs, write a measured narrative and next steps. JSON only.',
        `Inputs: ${JSON.stringify({ company, red_flags, beneish_m_score, altman_z_score, audit_changes_2y, late_filings_2y })}\nHeuristic: ${JSON.stringify(heuristic)}\nReturn {"narrative": string, "next_steps": [string], "caveats": [string]}.`,
        { temperature: 0.3, maxTokens: 700 }
      );
      const errCheck = aiOrError(res, result, heuristic);
      if (errCheck) return errCheck;
      ai_summary = result;
    }
    res.json({ heuristic, ai_summary, model_kind: 'heuristic-only (no calibrated model)' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 4. EXTERNAL SCREENING (NEEDS-CREDS) ------------------------------------
// Env vars: OPENSANCTIONS_API_KEY or COMPLYADVANTAGE_API_KEY. Without either,
// return 503 with `missing` so the FE can show "configure to enable".
router.post('/external-screening', async (req, res) => {
  if (!process.env.OPENSANCTIONS_API_KEY && !process.env.COMPLYADVANTAGE_API_KEY) {
    return res.status(503).json({
      error: 'External screening not configured',
      missing: 'OPENSANCTIONS_API_KEY (or COMPLYADVANTAGE_API_KEY)',
    });
  }
  // Without making an actual outbound call (TOO-RISKY without rate-limit/billing
  // controls), record the request and return queued status.
  const { name, country, dob } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  return res.status(202).json({
    queued: true,
    provider: process.env.OPENSANCTIONS_API_KEY ? 'opensanctions' : 'complyadvantage',
    request: { name, country: country || null, dob: dob || null },
    note: 'Request would be forwarded to provider; outbound HTTP intentionally not wired in this stub.',
  });
});

// --- 5. SEC EDGAR PULL (NEEDS-CREDS: USER-AGENT) ----------------------------
// EDGAR fair-access requires an identifying User-Agent (email or company).
// We refuse without SEC_EDGAR_USER_AGENT to avoid IP blocks. Outbound HTTP
// is intentionally not wired here — return the URL the caller should hit.
router.post('/sec-edgar/pull', async (req, res) => {
  if (!process.env.SEC_EDGAR_USER_AGENT) {
    return res.status(503).json({
      error: 'SEC EDGAR not configured',
      missing: 'SEC_EDGAR_USER_AGENT',
      hint: 'Set to "Your Company contact@example.com" per SEC fair-access policy.',
    });
  }
  const { cik, form_type = '10-K', limit = 5 } = req.body || {};
  if (!cik) return res.status(400).json({ error: 'cik required' });
  const padded = String(cik).padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${padded}.json`;
  return res.json({
    pull_planned: true,
    url,
    user_agent: process.env.SEC_EDGAR_USER_AGENT,
    cik: padded,
    form_type,
    limit,
    note: 'URL ready; outbound HTTP intentionally not wired in this stub.',
  });
});

module.exports = router;
