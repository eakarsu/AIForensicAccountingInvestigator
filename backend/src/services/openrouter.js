const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
// HTTP-Referer is env-driven so OpenRouter analytics show the right host.
const AI_REFERER = process.env.AI_HTTP_REFERER || process.env.CLIENT_URL || 'http://localhost:3000';

/**
 * Validate the OpenRouter key at boot. Throws in production, warns in dev.
 */
function assertOpenRouterConfigured() {
  if (!OPENROUTER_API_KEY) {
    const msg = 'OPENROUTER_API_KEY is not set — AI endpoints will fail.';
    if (process.env.NODE_ENV === 'production') throw new Error(msg);
    // eslint-disable-next-line no-console
    console.warn(msg);
  }
}

/**
 * 3-strategy JSON parser. The original implementation only ran a single greedy
 * regex which broke on multi-block responses. Now we try, in order:
 *   1. Direct JSON.parse on the raw string.
 *   2. Extract from a fenced ```json ... ``` block.
 *   3. Slice from first opener to last closer (object or array).
 * Returns `{ raw, parsed: false }` on failure so callers can decide how to
 * surface the unparsed content rather than crashing or saving garbage.
 */
function parseAIJson(text) {
  if (text == null) return { raw: text, parsed: false };
  const str = typeof text === 'string' ? text : String(text);

  try { return JSON.parse(str); } catch (_) { /* fall through */ }

  const fenceMatch = str.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch (_) { /* fall through */ }
  }

  const objStart = str.indexOf('{');
  const objEnd = str.lastIndexOf('}');
  const arrStart = str.indexOf('[');
  const arrEnd = str.lastIndexOf(']');
  let start = -1, end = -1;
  if (objStart !== -1 && (arrStart === -1 || objStart < arrStart)) {
    start = objStart; end = objEnd;
  } else if (arrStart !== -1) {
    start = arrStart; end = arrEnd;
  }
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(str.slice(start, end + 1)); } catch (_) { /* fall through */ }
  }

  return { raw: str, parsed: false };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Call OpenRouter with retry/backoff on 429 and 5xx. Returns the raw response
 * envelope shape the routes already expect:
 *   - On parse success: the parsed JSON object the model produced.
 *   - On parse failure: `{ analysis: <raw text>, model: <model id> }`.
 *   - On error: `{ error: <message> }` (matches original contract).
 */
async function callOpenRouter(systemPrompt, userMessage, opts = {}) {
  const { temperature = 0.3, maxTokens = 2000, maxRetries = 2 } = opts;

  if (!OPENROUTER_API_KEY) {
    return { error: 'OPENROUTER_API_KEY not configured' };
  }

  let attempt = 0;
  let lastErr;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': AI_REFERER,
          'X-Title': 'AI Forensic Accounting Investigator'
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature,
          max_tokens: maxTokens
        })
      });

      if (response.status === 429 || response.status >= 500) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10);
        const delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(8000, 500 * 2 ** attempt);
        lastErr = new Error(`OpenRouter HTTP ${response.status}`);
        if (attempt < maxRetries) {
          // eslint-disable-next-line no-console
          console.warn(`OpenRouter ${response.status} — retrying in ${delay}ms`);
          await sleep(delay);
          attempt += 1;
          continue;
        }
        return { error: lastErr.message };
      }

      const data = await response.json();
      if (data && data.error) {
        // eslint-disable-next-line no-console
        console.error('OpenRouter error:', data.error);
        return { error: data.error.message || 'AI analysis failed' };
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content) return { error: 'No response from AI' };

      // Parse with the 3-strategy parser. If parsing succeeds, return the
      // structured object directly. If not, wrap as `{ analysis, model }` so
      // callers still see the model output instead of silently storing garbage.
      const parsed = parseAIJson(content);
      const parseFailed = parsed && typeof parsed === 'object' && parsed.parsed === false;
      if (parsed && typeof parsed === 'object' && !parseFailed) {
        return parsed;
      }
      return { analysis: content, model: OPENROUTER_MODEL, parsed: false };
    } catch (error) {
      lastErr = error;
      if (attempt < maxRetries) {
        const delay = Math.min(8000, 500 * 2 ** attempt);
        // eslint-disable-next-line no-console
        console.warn(`OpenRouter call error: ${error.message} — retrying in ${delay}ms`);
        await sleep(delay);
        attempt += 1;
        continue;
      }
      // eslint-disable-next-line no-console
      console.error('OpenRouter call failed:', error.message);
      return { error: error.message };
    }
  }
  return { error: lastErr ? lastErr.message : 'OpenRouter call failed' };
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
  callOpenRouter,
  parseAIJson,
  assertOpenRouterConfigured,
  analyzeBenford,
  analyzeAnomaly,
  analyzeEmbezzlement,
  analyzeFraud
};
