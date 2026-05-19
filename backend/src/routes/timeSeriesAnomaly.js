// Time-series anomaly: detect sudden pattern shifts.
const express = require('express');
const router = express.Router();
const pool = require('../db');

function stddev(arr) {
  if (!arr.length) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) * (b - m), 0) / arr.length);
}

// GET /api/time-series-anomaly/:case_id?metric=daily_amount&window=14
router.get('/:case_id', async (req, res) => {
  try {
    const window = Math.min(parseInt(req.query.window) || 14, 90);
    const r = await pool.query(
      `SELECT date_trunc('day', date) AS day, SUM(amount) AS amount
       FROM transactions WHERE case_id = $1 GROUP BY 1 ORDER BY 1 ASC LIMIT 365`,
      [req.params.case_id]
    ).catch(() => ({ rows: [] }));
    const values = r.rows.map(x => Number(x.amount));
    const anomalies = [];
    for (let i = window; i < values.length; i++) {
      const past = values.slice(i - window, i);
      const mean = past.reduce((a, b) => a + b, 0) / past.length;
      const sd = stddev(past);
      const z = sd ? (values[i] - mean) / sd : 0;
      if (Math.abs(z) > 3) anomalies.push({ day: r.rows[i].day, amount: values[i], z_score: Math.round(z * 100) / 100 });
    }
    return res.json({ case_id: req.params.case_id, window, anomaly_count: anomalies.length, anomalies });
  } catch (e) {
    return res.status(500).json({ error: 'anomaly failed' });
  }
});

module.exports = router;
