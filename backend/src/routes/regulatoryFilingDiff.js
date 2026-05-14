// Regulatory-filing diff: compare filings across periods.
const express = require('express');
const router = express.Router();
const { callOpenRouter } = require('../services/openrouter');

// POST /api/regulatory-filing-diff/compare { filing_a_text, filing_b_text }
router.post('/compare', async (req, res) => {
  try {
    const { filing_a_text, filing_b_text } = req.body || {};
    if (!filing_a_text || !filing_b_text) return res.status(400).json({ error: 'filing_a_text + filing_b_text required' });
    const system = 'Diff two regulatory filings. Output JSON {"material_changes":["..."],"new_risks":["..."],"removed_items":["..."],"summary":"..."}.';
    let parsed;
    try {
      const raw = await callOpenRouter([
        { role: 'system', content: system },
        { role: 'user', content: `Filing A:\n${filing_a_text.slice(0, 5000)}\n\nFiling B:\n${filing_b_text.slice(0, 5000)}` },
      ]);
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { raw }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable' });
    }
    return res.json({ diff: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'compare failed' });
  }
});

module.exports = router;
