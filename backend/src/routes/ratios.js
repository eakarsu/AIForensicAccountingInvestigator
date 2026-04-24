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

module.exports = router;
