// Related-party analysis: surface hidden relationships.
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/related-party-analysis/:case_id
router.get('/:case_id', async (req, res) => {
  try {
    // Find parties with shared metadata (address, phone, bank account, beneficial owner).
    const r = await pool.query(
      `SELECT a.party AS party_a, b.party AS party_b, a.field, a.value
       FROM party_metadata a INNER JOIN party_metadata b ON a.field = b.field AND a.value = b.value AND a.party <> b.party
       WHERE a.case_id = $1 LIMIT 200`,
      [req.params.case_id]
    ).catch(() => ({ rows: [] }));
    const links = r.rows.map(row => ({ a: row.party_a, b: row.party_b, shared: row.field, value: row.value }));
    return res.json({ case_id: req.params.case_id, link_count: links.length, links });
  } catch (e) {
    return res.status(500).json({ error: 'related-party failed' });
  }
});

module.exports = router;
