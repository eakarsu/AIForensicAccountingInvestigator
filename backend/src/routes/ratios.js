const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

function calculateRatios(data) {
  const ratios = {};
  const red_flags = [];

  // Liquidity ratios
  ratios.liquidity = {};
  if (data.current_assets && data.current_liabilities) {
    ratios.liquidity.current_ratio = parseFloat((data.current_assets / data.current_liabilities).toFixed(4));
  }
  if (data.current_assets && data.inventory && data.current_liabilities) {
    ratios.liquidity.quick_ratio = parseFloat(((data.current_assets - data.inventory) / data.current_liabilities).toFixed(4));
  }
  if (data.cash && data.current_liabilities) {
    ratios.liquidity.cash_ratio = parseFloat((data.cash / data.current_liabilities).toFixed(4));
  }

  // Profitability ratios
  ratios.profitability = {};
  if (data.gross_profit && data.revenue) {
    ratios.profitability.gross_margin = parseFloat((data.gross_profit / data.revenue).toFixed(4));
  }
  if (data.operating_income && data.revenue) {
    ratios.profitability.operating_margin = parseFloat((data.operating_income / data.revenue).toFixed(4));
  }
  if (data.net_income && data.revenue) {
    ratios.profitability.net_margin = parseFloat((data.net_income / data.revenue).toFixed(4));
  }
  if (data.net_income && data.shareholders_equity) {
    ratios.profitability.roe = parseFloat((data.net_income / data.shareholders_equity).toFixed(4));
  }
  if (data.net_income && data.total_assets) {
    ratios.profitability.roa = parseFloat((data.net_income / data.total_assets).toFixed(4));
  }

  // Leverage ratios
  ratios.leverage = {};
  if (data.total_debt && data.shareholders_equity) {
    ratios.leverage.debt_to_equity = parseFloat((data.total_debt / data.shareholders_equity).toFixed(4));
  }
  if (data.total_debt && data.total_assets) {
    ratios.leverage.debt_to_assets = parseFloat((data.total_debt / data.total_assets).toFixed(4));
  }
  if (data.operating_income && data.interest_expense) {
    ratios.leverage.interest_coverage = parseFloat((data.operating_income / data.interest_expense).toFixed(4));
  }

  // Efficiency ratios
  ratios.efficiency = {};
  if (data.revenue && data.total_assets) {
    ratios.efficiency.asset_turnover = parseFloat((data.revenue / data.total_assets).toFixed(4));
  }
  if (data.cost_of_goods_sold && data.inventory) {
    ratios.efficiency.inventory_turnover = parseFloat((data.cost_of_goods_sold / data.inventory).toFixed(4));
  }
  if (data.revenue && data.accounts_receivable) {
    ratios.efficiency.receivables_turnover = parseFloat((data.revenue / data.accounts_receivable).toFixed(4));
  }

  // Risk assessment
  let riskScore = 0;
  let riskFactors = 0;

  if (ratios.liquidity.current_ratio !== undefined) {
    riskFactors++;
    if (ratios.liquidity.current_ratio < 1.0) {
      riskScore += 3;
      red_flags.push('Current ratio below 1.0 - potential liquidity crisis');
    } else if (ratios.liquidity.current_ratio < 1.5) {
      riskScore += 1;
    }
  }

  if (ratios.profitability.net_margin !== undefined) {
    riskFactors++;
    if (ratios.profitability.net_margin < 0) {
      riskScore += 3;
      red_flags.push('Negative net margin - company is losing money');
    } else if (ratios.profitability.net_margin < 0.05) {
      riskScore += 1;
    }
  }

  if (ratios.leverage.debt_to_equity !== undefined) {
    riskFactors++;
    if (ratios.leverage.debt_to_equity > 3.0) {
      riskScore += 3;
      red_flags.push('Debt-to-equity ratio above 3.0 - heavily leveraged');
    } else if (ratios.leverage.debt_to_equity > 2.0) {
      riskScore += 2;
      red_flags.push('Debt-to-equity ratio above 2.0 - high leverage');
    }
  }

  if (ratios.leverage.interest_coverage !== undefined) {
    riskFactors++;
    if (ratios.leverage.interest_coverage < 1.5) {
      riskScore += 3;
      red_flags.push('Interest coverage below 1.5 - may struggle to service debt');
    }
  }

  if (ratios.profitability.roe !== undefined) {
    riskFactors++;
    if (ratios.profitability.roe > 0.5) {
      riskScore += 2;
      red_flags.push('ROE above 50% - unusually high, verify legitimacy');
    } else if (ratios.profitability.roe < 0) {
      riskScore += 2;
      red_flags.push('Negative ROE - company destroying shareholder value');
    }
  }

  let risk_assessment = 'low';
  if (riskFactors > 0) {
    const avgRisk = riskScore / riskFactors;
    if (avgRisk >= 2.5) risk_assessment = 'critical';
    else if (avgRisk >= 1.5) risk_assessment = 'high';
    else if (avgRisk >= 0.5) risk_assessment = 'medium';
  }

  return { ratios, risk_assessment, red_flags };
}

router.post('/calculate', (req, res) => {
  try {
    const result = calculateRatios(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ratios/interpret — AI interpretation of financial ratio combinations
router.post('/interpret', async (req, res) => {
  try {
    const ratioData = calculateRatios(req.body);
    const { callOpenRouter } = require('../services/openrouter');

    const systemPrompt = `You are a forensic accounting expert specializing in financial ratio analysis and fraud detection. Analyze the provided financial ratios and return a JSON risk narrative:
{
  "risk_narrative": "<2-3 paragraph forensic interpretation>",
  "red_flags": ["flag1", "flag2"],
  "manipulation_indicators": ["indicator1"],
  "peer_comparison": "<comparison to industry norms>",
  "dso_analysis": "<accounts receivable days analysis if data available>",
  "overall_risk_rating": "critical|high|medium|low",
  "investigation_priority": "immediate|high|normal",
  "recommended_audit_procedures": ["procedure1", "procedure2"],
  "confidence": "high|medium|low"
}`;

    const userMessage = `Interpret these financial ratios for forensic accounting purposes:

Input Data: ${JSON.stringify(req.body)}

Calculated Ratios:
Liquidity: ${JSON.stringify(ratioData.ratios.liquidity)}
Profitability: ${JSON.stringify(ratioData.ratios.profitability)}
Leverage: ${JSON.stringify(ratioData.ratios.leverage)}
Efficiency: ${JSON.stringify(ratioData.ratios.efficiency)}

Initial Risk Assessment: ${ratioData.risk_assessment}
Red Flags Detected: ${ratioData.red_flags.join(', ') || 'None'}`;

    const result = await callOpenRouter(systemPrompt, userMessage);

    if (result.error) {
      return res.status(502).json({ error: result.error, ratios: ratioData });
    }

    res.json({ ratios: ratioData, ai_interpretation: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ratios/cross-case-correlation — AI cross-case pattern correlation engine
router.post('/cross-case-correlation', async (req, res) => {
  try {
    const { case_ids } = req.body;
    if (!case_ids || !Array.isArray(case_ids) || case_ids.length < 2) {
      return res.status(400).json({ error: 'At least 2 case_ids required for cross-case correlation' });
    }

    const { BenfordAnalysis, AnomalyDetection, EmbezzlementPattern, FraudScore } = require('../models');
    const { Op } = require('sequelize');
    const { callOpenRouter } = require('../services/openrouter');

    // Fetch all recent records to find correlations
    const [benfordAll, anomalyAll, embezzlementAll, fraudAll] = await Promise.all([
      BenfordAnalysis.findAll({ order: [['createdAt', 'DESC']], limit: 50 }),
      AnomalyDetection.findAll({ order: [['createdAt', 'DESC']], limit: 50 }),
      EmbezzlementPattern.findAll({ order: [['createdAt', 'DESC']], limit: 50 }),
      FraudScore.findAll({ order: [['createdAt', 'DESC']], limit: 50 })
    ]);

    const systemPrompt = `You are a senior forensic investigator specializing in cross-case pattern correlation. Identify shared patterns, suspects, accounts, and behavioral indicators across multiple investigations. Return JSON:
{
  "shared_suspects": ["name1", "name2"],
  "shared_accounts": ["account1"],
  "common_time_periods": ["period1"],
  "behavioral_patterns": ["pattern1", "pattern2"],
  "correlation_strength": "strong|moderate|weak",
  "linked_scheme_type": "<type of fraud scheme if detectable>",
  "total_estimated_exposure": <number>,
  "key_correlations": [
    { "finding": "<correlation>", "cases_involved": ["case1"], "significance": "high|medium|low" }
  ],
  "recommended_investigation_steps": ["step1", "step2"],
  "summary": "<narrative of cross-case connections>"
}`;

    const userMessage = `Perform cross-case correlation analysis for ${case_ids.length} investigations.

Benford Analyses: ${JSON.stringify(benfordAll.map(b => ({ company: b.company_name, score: b.deviation_score, conformity: b.conformity_level })))}

Anomaly Detections: ${JSON.stringify(anomalyAll.map(a => ({ account: a.account_name, amount: a.amount, type: a.anomaly_type, counterparty: a.counterparty })))}

Embezzlement Patterns: ${JSON.stringify(embezzlementAll.map(e => ({ suspect: e.suspect_name, department: e.department, amount: e.estimated_loss, period: `${e.period_start} to ${e.period_end}` })))}

Fraud Scores: ${JSON.stringify(fraudAll.map(f => ({ company: f.company_name, year: f.fiscal_year, score: f.overall_score, beneish: f.beneish_m_score })))}`;

    const result = await callOpenRouter(systemPrompt, userMessage);

    if (result.error) {
      return res.status(502).json({ error: result.error });
    }

    res.json({ correlation: result, cases_analyzed: case_ids.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
