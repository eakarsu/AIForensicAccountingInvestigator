// ML fraud detection: train on historical fraud, score new transactions.
// v0 uses a simple logistic-style scorer over engineered features.
const express = require('express');
const router = express.Router();
const pool = require('../db');

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

// POST /api/ml-fraud-scoring/score { tx:{amount, hour_of_day, day_of_week, round_number:bool, vendor_age_days, country_risk:1..5} }
router.post('/score', async (req, res) => {
  try {
    const t = req.body?.tx || {};
    const z = -3
      + 0.0006 * Number(t.amount || 0)
      + (Number(t.hour_of_day) < 6 || Number(t.hour_of_day) > 22 ? 0.4 : 0)
      + (t.round_number ? 0.3 : 0)
      + (Number(t.vendor_age_days) < 30 ? 0.6 : 0)
      + 0.25 * Number(t.country_risk || 1);
    const p = sigmoid(z);
    let label = 'low';
    if (p > 0.7) label = 'high';
    else if (p > 0.4) label = 'medium';
    return res.json({ probability_fraud: Math.round(p * 1000) / 1000, label });
  } catch (e) {
    return res.status(500).json({ error: 'score failed' });
  }
});

module.exports = router;
