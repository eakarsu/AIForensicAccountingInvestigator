const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

async function callOpenRouter(systemPrompt, userMessage) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Forensic Accounting Investigator'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenRouter error:', data.error);
      return { error: data.error.message || 'AI analysis failed' };
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { error: 'No response from AI' };
    }

    // Try to parse as JSON if the response looks like JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Not JSON, return as structured text
    }

    return { analysis: content, model: OPENROUTER_MODEL };
  } catch (error) {
    console.error('OpenRouter call failed:', error.message);
    return { error: error.message };
  }
}

// Benford's Law Analysis
async function analyzeBenford(data) {
  const systemPrompt = `You are an expert forensic accountant specializing in Benford's Law analysis. Analyze the provided digit distribution data and return a JSON response with these fields:
  - summary: Brief overall assessment
  - conformity_assessment: How well the data conforms to Benford's Law
  - suspicious_digits: Array of digits that deviate significantly
  - risk_indicators: Array of specific risk indicators found
  - recommendation: Recommended next steps
  - confidence: Your confidence level (high/medium/low)
  - detailed_findings: Array of detailed finding strings`;

  const userMessage = `Analyze this Benford's Law data for company "${data.company_name}":
  Dataset type: ${data.dataset_type}
  Total transactions: ${data.total_transactions}
  Deviation score: ${data.deviation_score}
  Observed digit distribution: ${JSON.stringify(data.digit_distribution)}
  Expected Benford distribution: ${JSON.stringify(data.expected_distribution)}
  Current conformity level: ${data.conformity_level}`;

  return callOpenRouter(systemPrompt, userMessage);
}

// Transaction Anomaly Detection
async function analyzeAnomaly(data) {
  const systemPrompt = `You are an expert forensic accountant specializing in transaction anomaly detection. Analyze the provided transaction and return a JSON response with these fields:
  - summary: Brief overall assessment
  - anomaly_classification: Type of anomaly detected
  - severity: critical/high/medium/low
  - risk_indicators: Array of specific risk indicators
  - similar_patterns: Known fraud patterns this matches
  - recommendation: Recommended investigation steps
  - confidence: Your confidence level (high/medium/low)
  - detailed_findings: Array of detailed finding strings`;

  const userMessage = `Analyze this suspicious transaction:
  Transaction ID: ${data.transaction_id}
  Account: ${data.account_name}
  Amount: $${data.amount}
  Date: ${data.transaction_date}
  Category: ${data.category}
  Counterparty: ${data.counterparty}
  Anomaly type: ${data.anomaly_type}
  Anomaly score: ${data.anomaly_score}
  Description: ${data.description}`;

  return callOpenRouter(systemPrompt, userMessage);
}

// Embezzlement Pattern Recognition
async function analyzeEmbezzlement(data) {
  const systemPrompt = `You are an expert forensic investigator specializing in embezzlement detection and pattern recognition. Analyze the provided case data and return a JSON response with these fields:
  - summary: Brief overall assessment
  - pattern_analysis: Detailed analysis of the embezzlement pattern
  - scheme_type: Classification of the embezzlement scheme
  - risk_indicators: Array of red flags identified
  - estimated_total_exposure: Estimated total financial exposure
  - evidence_strength: Assessment of evidence strength
  - recommendation: Recommended investigation and legal steps
  - confidence: Your confidence level (high/medium/low)
  - detailed_findings: Array of detailed finding strings`;

  const userMessage = `Analyze this potential embezzlement case:
  Case ID: ${data.case_id}
  Suspect: ${data.suspect_name}
  Department: ${data.department}
  Pattern type: ${data.pattern_type}
  Estimated loss: $${data.estimated_loss}
  Period: ${data.period_start} to ${data.period_end}
  Evidence count: ${data.evidence_count}
  Confidence score: ${data.confidence_score}
  Description: ${data.description}`;

  return callOpenRouter(systemPrompt, userMessage);
}

// Financial Statement Fraud Scoring
async function analyzeFraud(data) {
  const systemPrompt = `You are an expert forensic accountant specializing in financial statement fraud detection. Analyze the provided fraud scoring data and return a JSON response with these fields:
  - summary: Brief overall assessment
  - fraud_likelihood: Assessment of fraud likelihood
  - key_concerns: Array of primary concerns
  - beneish_interpretation: Interpretation of the Beneish M-Score
  - altman_interpretation: Interpretation of the Altman Z-Score
  - manipulation_areas: Areas most likely being manipulated
  - recommendation: Recommended audit and investigation steps
  - confidence: Your confidence level (high/medium/low)
  - detailed_findings: Array of detailed finding strings`;

  const userMessage = `Analyze this financial statement fraud scoring:
  Company: ${data.company_name}
  Fiscal Year: ${data.fiscal_year}
  Overall fraud score: ${data.overall_score}
  Revenue manipulation score: ${data.revenue_manipulation_score}
  Expense manipulation score: ${data.expense_manipulation_score}
  Asset misstatement score: ${data.asset_misstatement_score}
  Disclosure score: ${data.disclosure_score}
  Altman Z-Score: ${data.altman_z_score}
  Beneish M-Score: ${data.beneish_m_score}
  Red flags: ${JSON.stringify(data.red_flags)}`;

  return callOpenRouter(systemPrompt, userMessage);
}

module.exports = {
  analyzeBenford,
  analyzeAnomaly,
  analyzeEmbezzlement,
  analyzeFraud
};
