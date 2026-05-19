const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter, parseAIJson } = require('../services/openrouter');

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/network/analyze
 *
 * Trace money flows between parties to surface hidden relationships,
 * shell companies, and circular transactions.
 *
 * Body:
 *   transactions: [{ id, from_party, to_party, amount, date, memo? }]
 *   parties_metadata?: [{ party, role, address, country, kyc_score? }]
 *   max_hops?: number (default 3)
 */
router.post('/analyze', async (req, res) => {
  try {
    const { transactions = [], parties_metadata = [], max_hops = 3 } = req.body || {};
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'transactions array required' });
    }

    // Local graph stats: party degree, total inflow/outflow, simple cycle hint
    const inflow = new Map();
    const outflow = new Map();
    const edgeCount = new Map();
    for (const t of transactions) {
      const f = String(t.from_party || '').trim();
      const to = String(t.to_party || '').trim();
      if (!f || !to) continue;
      outflow.set(f, (outflow.get(f) || 0) + Number(t.amount || 0));
      inflow.set(to, (inflow.get(to) || 0) + Number(t.amount || 0));
      const ek = `${f}->${to}`;
      edgeCount.set(ek, (edgeCount.get(ek) || 0) + 1);
    }

    const allParties = new Set([...inflow.keys(), ...outflow.keys()]);
    const partyStats = [...allParties].map(p => ({
      party: p,
      inflow_total: parseFloat((inflow.get(p) || 0).toFixed(2)),
      outflow_total: parseFloat((outflow.get(p) || 0).toFixed(2)),
      net: parseFloat(((inflow.get(p) || 0) - (outflow.get(p) || 0)).toFixed(2)),
    }));

    const reciprocalPairs = [];
    for (const [k, c] of edgeCount.entries()) {
      const [a, b] = k.split('->');
      const reverse = `${b}->${a}`;
      if (edgeCount.has(reverse)) {
        if (a < b) reciprocalPairs.push({ pair: [a, b], a_to_b_count: c, b_to_a_count: edgeCount.get(reverse) });
      }
    }

    const systemPrompt = 'You are a forensic accountant. Analyze money flows between parties for circular transactions, shell company patterns, layering, and structuring. Return STRICT JSON only.';
    const userMessage = `Analyze the following transaction graph (max_hops=${max_hops}).

PARTY STATS (${partyStats.length}):
${JSON.stringify(partyStats.slice(0, 50), null, 2)}

RECIPROCAL EDGES (${reciprocalPairs.length}):
${JSON.stringify(reciprocalPairs.slice(0, 30), null, 2)}

PARTIES METADATA:
${JSON.stringify(parties_metadata.slice(0, 50), null, 2)}

SAMPLE TRANSACTIONS (top 50):
${JSON.stringify(transactions.slice(0, 50), null, 2)}

Return STRICT JSON:
{
  "summary": "...",
  "suspicious_clusters": [
    { "parties": ["..."], "pattern": "circular|layering|structuring|shell|other", "evidence": "string", "risk_level": "low|medium|high" }
  ],
  "high_risk_parties": [{ "party": "string", "reason": "string" }],
  "circular_flows": [{ "cycle_parties": ["..."], "estimated_round_trip_amount": 0 }],
  "recommended_investigations": ["..."],
  "disclaimer": "AI-generated; not legal advice."
}`;

    let analysis;
    try {
      const aiText = await callOpenRouter(systemPrompt, userMessage, { temperature: 0.2 });
      analysis = parseAIJson(aiText) || { raw: aiText };
    } catch (aiErr) {
      analysis = {
        summary: 'AI unavailable; returning local graph stats only.',
        error: aiErr.message,
      };
    }

    res.json({
      stats: { parties: partyStats.length, transactions: transactions.length, reciprocal_pairs: reciprocalPairs.length },
      party_stats: partyStats,
      reciprocal_pairs: reciprocalPairs,
      analysis,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Network analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/network/transaction-cluster
 *
 * Cluster transactions by behavioral similarity to surface "rings" of
 * suspicious activity. Lightweight buckets locally + AI rationale.
 */
router.post('/transaction-cluster', async (req, res) => {
  try {
    const { transactions = [] } = req.body || {};
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'transactions array required' });
    }

    // Local bucketization
    const buckets = new Map();
    for (const t of transactions) {
      const amt = Number(t.amount || 0);
      const sizeBucket = amt < 1000 ? 'small' : amt < 10000 ? 'medium' : amt < 100000 ? 'large' : 'huge';
      const dateBucket = (t.date || '').slice(0, 7); // YYYY-MM
      const fromBucket = (t.from_party || 'UNKNOWN').slice(0, 12);
      const key = `${sizeBucket}|${dateBucket}|${fromBucket}`;
      const arr = buckets.get(key) || [];
      arr.push(t);
      buckets.set(key, arr);
    }
    const clusters = [...buckets.entries()]
      .filter(([, arr]) => arr.length >= 2)
      .map(([key, arr]) => ({
        key,
        size: arr.length,
        sample_ids: arr.slice(0, 5).map(t => t.id),
        total_amount: arr.reduce((s, t) => s + Number(t.amount || 0), 0),
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 30);

    const systemPrompt = 'You are a forensic accountant grouping transactions into behavioral clusters. Return STRICT JSON only.';
    const userMessage = `Review the following local clusters and label suspicious ones.

CLUSTERS:
${JSON.stringify(clusters, null, 2)}

Return JSON:
{
  "summary": "...",
  "labeled_clusters": [
    { "key": "string", "label": "string", "risk_level": "low|medium|high", "rationale": "string", "next_steps": ["..."] }
  ],
  "ignored_clusters": ["..."],
  "disclaimer": "AI-generated; review manually."
}`;

    let analysis;
    try {
      const aiText = await callOpenRouter(systemPrompt, userMessage, { temperature: 0.2 });
      analysis = parseAIJson(aiText) || { raw: aiText };
    } catch (aiErr) {
      analysis = { summary: 'AI unavailable; returning local clusters.', error: aiErr.message };
    }

    res.json({
      cluster_count: clusters.length,
      clusters,
      analysis,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Transaction cluster error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
