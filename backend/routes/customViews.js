// ============================================================
// Custom Views — Forensic Accounting Investigator
// Adds 4 endpoints used by the "Forensic Views" frontend page:
//   GET  /api/custom-views/anomaly-scatter
//   GET  /api/custom-views/entity-risk-heatmap
//   GET  /api/custom-views/forensic-report   (PDF)
//   GET|POST|PUT|DELETE /api/custom-views/detection-rules
// Mounted in src/server.js BEFORE any 404 / catch-all handler.
// ============================================================
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// ---------- Synthetic but stable forensic data ----------
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateAnomalies() {
  const rng = seededRand(42);
  const txTypes = ['wire', 'check', 'ach', 'cash', 'card'];
  const out = [];
  const start = new Date('2026-01-01').getTime();
  for (let i = 0; i < 80; i++) {
    const ts = new Date(start + Math.floor(rng() * 120) * 86400000);
    const amount = Math.round(rng() * 250000) + 100;
    const z = (rng() * 6 - 1.5).toFixed(2);
    const benfordDev = (rng() * 0.18).toFixed(3);
    const risk = Math.min(100, Math.max(0, Math.round(rng() * 100)));
    out.push({
      id: i + 1,
      transaction_id: `TXN-${10000 + i}`,
      date: ts.toISOString().slice(0, 10),
      amount,
      type: txTypes[Math.floor(rng() * txTypes.length)],
      z_score: parseFloat(z),
      benford_deviation: parseFloat(benfordDev),
      anomaly_score: risk,
      severity: risk > 75 ? 'critical' : risk > 50 ? 'high' : risk > 25 ? 'medium' : 'low',
    });
  }
  return out;
}

function generateEntities() {
  const rng = seededRand(7);
  const names = ['Acme Holdings', 'Northwind Co', 'Globex Ltd', 'Initech', 'Umbrella Corp',
    'Wayne Enterprises', 'Stark Industries', 'Wonka Inc', 'Cyberdyne', 'Tyrell Corp',
    'Soylent Group', 'Aperture Sci', 'Black Mesa', 'Massive Dynamic', 'Oscorp'];
  const categories = ['Benford Deviation', 'Velocity Anomaly', 'Round-Number Bias',
    'Threshold Avoidance', 'Related Party', 'Shell Indicator', 'Cash Density'];
  return names.map((n, i) => {
    const row = { entity: n, entity_id: i + 1, scores: {} };
    categories.forEach((c) => {
      row.scores[c] = Math.round(rng() * 100);
    });
    return row;
  });
}

const ANOMALIES = generateAnomalies();
const ENTITIES = generateEntities();
const RISK_CATEGORIES = Object.keys(ENTITIES[0].scores);

// ---------- Detection rules store ----------
const RULES_PATH = path.join(__dirname, '..', 'detection_rules.json');

function defaultRules() {
  return [
    { id: 1, name: 'High Z-Score Anomaly',         type: 'anomaly_threshold', metric: 'z_score',           operator: '>',  threshold: 3.0,   severity: 'critical', enabled: true },
    { id: 2, name: 'Benford First-Digit Drift',    type: 'benford',           metric: 'chi_square',        operator: '>',  threshold: 15.5,  severity: 'high',     enabled: true },
    { id: 3, name: 'CTR Threshold Avoidance',      type: 'anomaly_threshold', metric: 'amount',            operator: 'between', threshold: 9000,  threshold_max: 9999, severity: 'high', enabled: true },
    { id: 4, name: 'Benford Second-Digit Test',    type: 'benford',           metric: 'second_digit_dev',  operator: '>',  threshold: 0.05,  severity: 'medium',   enabled: true },
    { id: 5, name: 'Round-Number Frequency',       type: 'anomaly_threshold', metric: 'round_pct',         operator: '>',  threshold: 0.35,  severity: 'medium',   enabled: false },
  ];
}

function loadRules() {
  try {
    if (fs.existsSync(RULES_PATH)) {
      const data = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch (_) { /* fall through */ }
  const seeded = defaultRules();
  try { fs.writeFileSync(RULES_PATH, JSON.stringify(seeded, null, 2)); } catch (_) {}
  return seeded;
}

function saveRules(rules) {
  try { fs.writeFileSync(RULES_PATH, JSON.stringify(rules, null, 2)); } catch (_) {}
}

let RULES = loadRules();
let nextRuleId = RULES.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1;

// ============================================================
// VIZ 1 — Transaction Anomaly Scatter / Line series
// ============================================================
router.get('/anomaly-scatter', (req, res) => {
  // scatter: amount vs z_score (color by severity)
  const scatter = ANOMALIES.map((a) => ({
    x: a.amount,
    y: a.z_score,
    z: a.anomaly_score,
    severity: a.severity,
    transaction_id: a.transaction_id,
    date: a.date,
    type: a.type,
  }));

  // line: daily mean anomaly score
  const byDay = {};
  ANOMALIES.forEach((a) => {
    if (!byDay[a.date]) byDay[a.date] = { date: a.date, total: 0, count: 0, critical: 0 };
    byDay[a.date].total += a.anomaly_score;
    byDay[a.date].count += 1;
    if (a.severity === 'critical') byDay[a.date].critical += 1;
  });
  const line = Object.values(byDay)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ date: d.date, mean_score: +(d.total / d.count).toFixed(2), critical_count: d.critical }));

  res.json({
    title: 'Transaction Anomaly Distribution',
    x_label: 'Amount ($)',
    y_label: 'Z-Score',
    scatter,
    line,
    severities: ['low', 'medium', 'high', 'critical'],
    total: scatter.length,
  });
});

// ============================================================
// VIZ 2 — Entity x Risk-Category Heatmap
// ============================================================
router.get('/entity-risk-heatmap', (req, res) => {
  const cells = [];
  ENTITIES.forEach((e, rowIdx) => {
    RISK_CATEGORIES.forEach((cat, colIdx) => {
      cells.push({
        entity: e.entity,
        entity_id: e.entity_id,
        category: cat,
        row: rowIdx,
        col: colIdx,
        value: e.scores[cat],
      });
    });
  });
  res.json({
    title: 'Entity Risk Heatmap',
    rows: ENTITIES.map((e) => e.entity),
    columns: RISK_CATEGORIES,
    cells,
    legend: { min: 0, max: 100, scale: ['#0a3d2b', '#1f9d55', '#f5d35a', '#f59e0b', '#ef4444'] },
  });
});

// ============================================================
// NON-VIZ 1 — Forensic Investigation Report (PDF)
// ============================================================
function buildPdf(title, lines) {
  // Minimal valid 1-page PDF (Helvetica) — wraps each line at ~90 chars.
  const wrapped = [];
  lines.forEach((ln) => {
    const text = String(ln == null ? '' : ln);
    if (!text.length) { wrapped.push(''); return; }
    for (let i = 0; i < text.length; i += 90) wrapped.push(text.slice(i, i + 90));
  });

  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const headerText = esc(title);
  let stream = `BT\n/F1 16 Tf\n72 760 Td\n(${headerText}) Tj\nET\n`;
  let y = 735;
  wrapped.forEach((w) => {
    stream += `BT\n/F1 10 Tf\n72 ${y} Td\n(${esc(w)}) Tj\nET\n`;
    y -= 14;
    if (y < 60) y = 60; // clamp; single-page demo
  });

  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  objects.push(`<< /Length ${Buffer.byteLength(stream, 'binary')} >>\nstream\n${stream}\nendstream`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, idx) => {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

router.get('/forensic-report', (req, res) => {
  const total = ANOMALIES.length;
  const critical = ANOMALIES.filter((a) => a.severity === 'critical').length;
  const high = ANOMALIES.filter((a) => a.severity === 'high').length;
  const topEntities = [...ENTITIES]
    .map((e) => ({ entity: e.entity, mean: Object.values(e.scores).reduce((s, v) => s + v, 0) / RISK_CATEGORIES.length }))
    .sort((a, b) => b.mean - a.mean)
    .slice(0, 5);
  const activeRules = RULES.filter((r) => r.enabled);

  const lines = [
    `Generated: ${new Date().toISOString()}`,
    '',
    'SECTION 1 - Executive Summary',
    `Total transactions scored: ${total}`,
    `Critical-severity anomalies: ${critical}`,
    `High-severity anomalies: ${high}`,
    `Active detection rules: ${activeRules.length} / ${RULES.length}`,
    '',
    'SECTION 2 - Top Risk Entities',
    ...topEntities.map((e, i) => `${i + 1}. ${e.entity} — composite risk ${e.mean.toFixed(1)} / 100`),
    '',
    'SECTION 3 - Active Detection Rules',
    ...activeRules.map((r) => `- [${r.severity.toUpperCase()}] ${r.name} (${r.type}) ${r.metric} ${r.operator} ${r.threshold}${r.threshold_max ? ' .. ' + r.threshold_max : ''}`),
    '',
    'SECTION 4 - Methodology',
    'Anomalies are scored via z-score on amount, Benford first-digit divergence,',
    'and CTR-threshold avoidance heuristics. Entity risk is the mean of seven',
    'category scores: Benford Deviation, Velocity Anomaly, Round-Number Bias,',
    'Threshold Avoidance, Related Party, Shell Indicator, Cash Density.',
    '',
    'SECTION 5 - Recommendation',
    'Escalate the top 5 entities to manual review. Tune the CTR Threshold',
    'Avoidance rule (rule #3) against the most recent 30 days of transactions.',
  ];

  const pdf = buildPdf('Forensic Investigation Report', lines);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="forensic_investigation_report.pdf"');
  res.send(pdf);
});

// ============================================================
// NON-VIZ 2 — Detection Rules CRUD
// ============================================================
router.get('/detection-rules', (req, res) => {
  res.json({ rules: RULES, count: RULES.length });
});

router.post('/detection-rules', (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.metric) return res.status(400).json({ error: 'name and metric are required' });
  const rule = {
    id: nextRuleId++,
    name: String(b.name),
    type: b.type || 'anomaly_threshold',
    metric: String(b.metric),
    operator: b.operator || '>',
    threshold: b.threshold == null ? 0 : Number(b.threshold),
    threshold_max: b.threshold_max != null ? Number(b.threshold_max) : undefined,
    severity: b.severity || 'medium',
    enabled: b.enabled !== false,
  };
  RULES.push(rule);
  saveRules(RULES);
  res.status(201).json(rule);
});

router.put('/detection-rules/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = RULES.findIndex((r) => r.id === id);
  if (idx < 0) return res.status(404).json({ error: 'rule not found' });
  const b = req.body || {};
  RULES[idx] = { ...RULES[idx], ...b, id };
  saveRules(RULES);
  res.json(RULES[idx]);
});

router.delete('/detection-rules/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = RULES.findIndex((r) => r.id === id);
  if (idx < 0) return res.status(404).json({ error: 'rule not found' });
  const removed = RULES.splice(idx, 1)[0];
  saveRules(RULES);
  res.json({ deleted: true, rule: removed });
});

module.exports = router;
