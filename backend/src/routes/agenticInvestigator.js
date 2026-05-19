// Agentic investigator: NL prompt + transaction data → multi-analysis report.
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { callOpenRouter } = require('../services/openrouter');

// POST /api/agentic-investigator/run { question, scope?:{case_id?,party?} }
router.post('/run', async (req, res) => {
  try {
    const { question, scope = {} } = req.body || {};
    if (!question) return res.status(400).json({ error: 'question required' });

    // Pull data for chained analysis
    const txs = await pool.query(`SELECT * FROM transactions ${scope.case_id ? 'WHERE case_id = $1' : ''} ORDER BY date DESC LIMIT 200`, scope.case_id ? [scope.case_id] : []).catch(() => ({ rows: [] }));
    const anomalies = await pool.query(`SELECT * FROM anomalies ${scope.case_id ? 'WHERE case_id = $1' : ''} ORDER BY detected_at DESC LIMIT 50`, scope.case_id ? [scope.case_id] : []).catch(() => ({ rows: [] }));

    const system = 'You are a forensic accountant. Use the supplied data. Output JSON {"summary":"...","benford_finding":"...","ratio_findings":["..."],"network_findings":["..."],"recommendations":["..."]}.';
    let parsed;
    try {
      const raw = await callOpenRouter([{ role: 'system', content: system }, { role: 'user', content: `Question: ${question}\nTxs sample: ${JSON.stringify(txs.rows.slice(0, 40))}\nAnomalies: ${JSON.stringify(anomalies.rows)}` }]);
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { raw }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable' });
    }
    return res.json({ question, scope, analysis: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'run failed' });
  }
});

module.exports = router;
