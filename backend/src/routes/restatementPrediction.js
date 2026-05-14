// Restatement prediction: flag firms likely to restate.
const express = require('express');
const router = express.Router();

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

// POST /api/restatement-prediction/score { signals:{accruals_ratio, days_sales_outstanding_delta, audit_change_recent:bool, leverage_change_pct, sga_pct_revenue} }
router.post('/score', async (req, res) => {
  try {
    const s = req.body?.signals || {};
    const z = -2
      + 0.8 * Math.abs(Number(s.accruals_ratio || 0))
      + 0.05 * Math.abs(Number(s.days_sales_outstanding_delta || 0))
      + (s.audit_change_recent ? 0.7 : 0)
      + 0.03 * Math.abs(Number(s.leverage_change_pct || 0))
      + 0.04 * Math.max(0, Number(s.sga_pct_revenue || 0) - 25);
    const p = sigmoid(z);
    return res.json({ probability_restatement: Math.round(p * 1000) / 1000, risk: p > 0.6 ? 'high' : p > 0.3 ? 'medium' : 'low' });
  } catch (e) {
    return res.status(500).json({ error: 'score failed' });
  }
});

module.exports = router;
