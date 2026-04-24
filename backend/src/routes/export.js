const express = require('express');
const { BenfordAnalysis, TransactionAnomaly, EmbezzlementPattern, FraudScore, InvestigationReport } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

function escapeCSVValue(val) {
  if (val === null || val === undefined) return '';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCSV(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map(row => {
    const json = row.toJSON();
    return columns.map(col => escapeCSVValue(json[col])).join(',');
  });
  return header + '\n' + lines.join('\n');
}

function sendCSV(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

router.get('/benford', async (req, res) => {
  try {
    const rows = await BenfordAnalysis.findAll({ order: [['createdAt', 'DESC']] });
    const columns = ['id', 'company_name', 'dataset_type', 'total_transactions', 'deviation_score', 'conformity_level', 'digit_distribution', 'expected_distribution', 'analysis_date', 'status', 'risk_level', 'notes', 'createdAt', 'updatedAt'];
    sendCSV(res, 'benford_analyses.csv', toCSV(rows, columns));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/anomalies', async (req, res) => {
  try {
    const rows = await TransactionAnomaly.findAll({ order: [['createdAt', 'DESC']] });
    const columns = ['id', 'transaction_id', 'account_name', 'amount', 'transaction_date', 'category', 'counterparty', 'anomaly_type', 'anomaly_score', 'description', 'status', 'risk_level', 'createdAt', 'updatedAt'];
    sendCSV(res, 'transaction_anomalies.csv', toCSV(rows, columns));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/embezzlement', async (req, res) => {
  try {
    const rows = await EmbezzlementPattern.findAll({ order: [['createdAt', 'DESC']] });
    const columns = ['id', 'case_id', 'suspect_name', 'department', 'pattern_type', 'estimated_loss', 'detection_date', 'period_start', 'period_end', 'evidence_count', 'confidence_score', 'status', 'description', 'risk_level', 'createdAt', 'updatedAt'];
    sendCSV(res, 'embezzlement_patterns.csv', toCSV(rows, columns));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/fraud', async (req, res) => {
  try {
    const rows = await FraudScore.findAll({ order: [['createdAt', 'DESC']] });
    const columns = ['id', 'company_name', 'fiscal_year', 'overall_score', 'revenue_manipulation_score', 'expense_manipulation_score', 'asset_misstatement_score', 'disclosure_score', 'altman_z_score', 'beneish_m_score', 'risk_level', 'red_flags', 'status', 'notes', 'createdAt', 'updatedAt'];
    sendCSV(res, 'fraud_scores.csv', toCSV(rows, columns));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const rows = await InvestigationReport.findAll({ order: [['createdAt', 'DESC']] });
    const columns = ['id', 'report_number', 'title', 'investigator_name', 'status', 'priority', 'summary', 'findings', 'recommendations', 'related_cases', 'evidence_summary', 'period_start', 'period_end', 'total_amount_at_risk', 'createdAt', 'updatedAt'];
    sendCSV(res, 'investigation_reports.csv', toCSV(rows, columns));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
