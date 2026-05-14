const express = require('express');
const { InvestigationReport } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { paginate } = require('../utils/pagination');
const { parseAIJson } = require('../services/openrouter');

const router = express.Router();
router.use(authenticateToken);

// Get next report number
router.get('/next-number', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const prefix = `RPT-${year}-`;

    const latest = await InvestigationReport.findOne({
      where: { report_number: { [require('sequelize').Op.like]: `${prefix}%` } },
      order: [['report_number', 'DESC']]
    });

    let nextNum = 1;
    if (latest) {
      const currentNum = parseInt(latest.report_number.replace(prefix, ''));
      nextNum = currentNum + 1;
    }

    const report_number = `${prefix}${String(nextNum).padStart(3, '0')}`;
    res.json({ report_number });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all (paginated)
router.get('/', async (req, res) => {
  try {
    const result = await paginate(InvestigationReport, req.query, {
      searchable: ['report_number', 'title', 'investigator_name', 'status', 'priority', 'entity_name'],
      allowedSort: ['createdAt', 'report_number', 'priority', 'status', 'total_amount_at_risk']
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get by id
router.get('/:id', async (req, res) => {
  try {
    const item = await InvestigationReport.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    const item = await InvestigationReport.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const item = await InvestigationReport.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const item = await InvestigationReport.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reports/:id/generate — AI-generated narrative investigation report
router.post('/:id/generate', async (req, res) => {
  try {
    const report = await InvestigationReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Not found' });

    const { BenfordAnalysis, AnomalyDetection, EmbezzlementPattern, FraudScore } = require('../models');

    // Aggregate linked evidence by entity_name match or just fetch recent records
    const [benfordRecords, anomalyRecords, embezzlementRecords, fraudRecords] = await Promise.all([
      BenfordAnalysis.findAll({ order: [['createdAt', 'DESC']], limit: 10 }),
      AnomalyDetection.findAll({ order: [['createdAt', 'DESC']], limit: 10 }),
      EmbezzlementPattern.findAll({ order: [['createdAt', 'DESC']], limit: 10 }),
      FraudScore.findAll({ order: [['createdAt', 'DESC']], limit: 10 })
    ]);

    const { callOpenRouter } = require('../services/openrouter');

    const systemPrompt = `You are a senior forensic accountant preparing a court-ready investigation report. Synthesize all provided evidence into a comprehensive narrative investigation report. Return JSON:
{
  "executive_summary": "<2-3 paragraph summary>",
  "evidence_timeline": [
    { "date": "YYYY-MM-DD", "event": "<description>", "significance": "high|medium|low", "dollar_amount": <number or null> }
  ],
  "findings": [
    { "category": "benford|anomaly|embezzlement|fraud", "finding": "<description>", "risk_level": "critical|high|medium|low" }
  ],
  "total_exposure_estimate": <number>,
  "conclusions": "<formal legal-quality conclusion paragraph>",
  "recommended_actions": ["action1", "action2"],
  "confidence_level": "high|medium|low"
}`;

    const userMessage = `Generate investigation report for: ${report.title}
Case: ${report.report_number}
Entity: ${report.entity_name || 'Unknown'}
Period: ${report.investigation_period || 'N/A'}

Benford Analyses (${benfordRecords.length}):
${benfordRecords.map(b => `- ${b.company_name}: deviation_score=${b.deviation_score}, conformity=${b.conformity_level}`).join('\n') || 'None'}

Transaction Anomalies (${anomalyRecords.length}):
${anomalyRecords.map(a => `- $${a.amount} ${a.anomaly_type} (score: ${a.anomaly_score}) — ${a.account_name}`).join('\n') || 'None'}

Embezzlement Patterns (${embezzlementRecords.length}):
${embezzlementRecords.map(e => `- ${e.suspect_name} in ${e.department}: $${e.estimated_loss} (${e.pattern_type})`).join('\n') || 'None'}

Fraud Scores (${fraudRecords.length}):
${fraudRecords.map(f => `- ${f.company_name} FY${f.fiscal_year}: overall=${f.overall_score}, Beneish=${f.beneish_m_score}, Altman=${f.altman_z_score}`).join('\n') || 'None'}`;

    const result = await callOpenRouter(systemPrompt, userMessage);

    if (result.error) {
      return res.status(502).json({ error: result.error });
    }

    // Parse structured JSON via the 3-strategy parser. If `result` already
    // looks like a parsed object (the new openrouter helper does that for us)
    // skip re-parsing; otherwise extract from `.analysis` or stringify.
    let parsed = null;
    let rawContent;
    if (result && typeof result === 'object' && !result.analysis && !result.error) {
      parsed = result;
      rawContent = JSON.stringify(result);
    } else {
      rawContent = result.analysis || JSON.stringify(result);
      const candidate = parseAIJson(rawContent);
      if (candidate && candidate.parsed !== false) parsed = candidate;
    }

    // Update the report with the AI-generated narrative
    const narrative = parsed?.executive_summary || rawContent;
    await report.update({
      ai_narrative: narrative,
      ai_analysis: rawContent,
      status: report.status === 'draft' ? 'under_review' : report.status
    });

    res.json({ report, ai_report: parsed || rawContent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
