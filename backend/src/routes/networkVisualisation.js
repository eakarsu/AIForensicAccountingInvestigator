// Visualisation: network graph of suspicious transactions / parties.
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/network-visualisation/:case_id?min_amount=1000
router.get('/:case_id', async (req, res) => {
  try {
    const minAmount = Number(req.query.min_amount || 1000);
    const r = await pool.query(`SELECT id, sender, receiver, amount, date FROM transactions WHERE case_id = $1 AND amount >= $2`, [req.params.case_id, minAmount]).catch(() => ({ rows: [] }));
    const nodes = new Map();
    const edges = [];
    for (const t of r.rows) {
      if (!nodes.has(t.sender)) nodes.set(t.sender, { id: t.sender, type: 'party' });
      if (!nodes.has(t.receiver)) nodes.set(t.receiver, { id: t.receiver, type: 'party' });
      edges.push({ source: t.sender, target: t.receiver, weight: Number(t.amount), tx_id: t.id, date: t.date });
    }
    return res.json({ case_id: req.params.case_id, nodes: Array.from(nodes.values()), edges, edge_count: edges.length });
  } catch (e) {
    return res.status(500).json({ error: 'graph failed' });
  }
});

module.exports = router;
