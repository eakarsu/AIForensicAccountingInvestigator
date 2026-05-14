/**
 * AI Center routes — apply pass 4 (mechanical backlog).
 *
 * Five forensic-accounting AI helpers that take a request body, call
 * OpenRouter via the existing helper, and return structured JSON. None of
 * these mutate persistent state — they're pure synthesis utilities to
 * back the report templating / expert-witness narrative gaps in the audit
 * note's mechanical backlog.
 *
 * 503-on-no-key: if `OPENROUTER_API_KEY` is unset, the underlying helper
 * returns `{ error: 'OPENROUTER_API_KEY not configured' }`. We translate
 * that to HTTP 503 so the FE can show a clear "AI not configured" state
 * instead of a generic 500.
 */
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../services/openrouter');

const router = express.Router();
router.use(authenticateToken);

function aiResponseOrError(res, result) {
  if (result && result.error) {
    if (typeof result.error === 'string' && result.error.includes('OPENROUTER_API_KEY not configured')) {
      return res.status(503).json({ error: 'AI not configured (OPENROUTER_API_KEY missing)' });
    }
    return res.status(502).json({ error: result.error });
  }
  return res.json({ ai: result, generated_at: new Date().toISOString() });
}

/**
 * POST /api/ai/expert-witness-narrative
 *
 * Body:
 *   case_title, jurisdiction?, expert_credentials?, scope?, findings[],
 *   exhibits[]?, opposing_arguments[]?
 */
router.post('/expert-witness-narrative', async (req, res) => {
  try {
    const {
      case_title,
      jurisdiction = '',
      expert_credentials = '',
      scope = '',
      findings = [],
      exhibits = [],
      opposing_arguments = [],
    } = req.body || {};
    if (!case_title) return res.status(400).json({ error: 'case_title required' });

    const systemPrompt = 'You are a forensic accountant drafting an expert witness narrative for court testimony. Output STRICT JSON only. Use measured, defensible language; avoid speculation.';
    const userMessage = `Draft an expert witness narrative.

CASE: ${case_title}
JURISDICTION: ${jurisdiction || 'unspecified'}
EXPERT CREDENTIALS: ${expert_credentials || 'unspecified'}
SCOPE OF OPINION: ${scope || 'unspecified'}

FINDINGS (${findings.length}):
${JSON.stringify(findings.slice(0, 30), null, 2)}

EXHIBITS (${exhibits.length}):
${JSON.stringify(exhibits.slice(0, 30), null, 2)}

OPPOSING ARGUMENTS (${opposing_arguments.length}):
${JSON.stringify(opposing_arguments.slice(0, 20), null, 2)}

Return JSON:
{
  "qualifications_statement": "string",
  "scope_of_opinion": "string",
  "methodology": "string",
  "narrative": "string (3-6 paragraphs)",
  "exhibit_references": [{ "exhibit_id": "string", "purpose": "string" }],
  "rebuttal_points": [{ "argument": "string", "response": "string" }],
  "opinion": "string",
  "limitations": ["string"],
  "disclaimer": "AI-generated draft; review before filing."
}`;

    const result = await callOpenRouter(systemPrompt, userMessage, { temperature: 0.2, maxTokens: 2500 });
    return aiResponseOrError(res, result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/report-template
 *
 * Generate a forensic report from one of several templates.
 *
 * Body:
 *   template: 'executive_summary'|'sec_form'|'audit_committee'|'litigation_support'
 *   case_data: { entity_name, period, total_exposure?, ... }
 *   findings[], recommendations[]
 */
router.post('/report-template', async (req, res) => {
  try {
    const {
      template = 'executive_summary',
      case_data = {},
      findings = [],
      recommendations = [],
    } = req.body || {};

    const allowed = ['executive_summary', 'sec_form', 'audit_committee', 'litigation_support'];
    if (!allowed.includes(template)) {
      return res.status(400).json({ error: `template must be one of ${allowed.join(', ')}` });
    }

    const systemPrompt = `You are a forensic accountant generating a ${template.replace(/_/g, ' ')} report. Output STRICT JSON only.`;
    const userMessage = `Generate a ${template} report.

CASE DATA:
${JSON.stringify(case_data, null, 2)}

FINDINGS (${findings.length}):
${JSON.stringify(findings.slice(0, 30), null, 2)}

RECOMMENDATIONS (${recommendations.length}):
${JSON.stringify(recommendations.slice(0, 20), null, 2)}

Return JSON:
{
  "template": "${template}",
  "title": "string",
  "sections": [
    { "heading": "string", "body": "string", "bullets": ["string"] }
  ],
  "key_metrics": [{ "label": "string", "value": "string" }],
  "risk_rating": "low|medium|high|critical",
  "next_steps": ["string"],
  "disclaimer": "AI-generated draft."
}`;

    const result = await callOpenRouter(systemPrompt, userMessage, { temperature: 0.3, maxTokens: 2500 });
    return aiResponseOrError(res, result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/findings-summarize
 *
 * Body:
 *   findings: [{ category, description, severity?, dollar_amount? }]
 *   audience?: 'executive'|'auditor'|'legal'
 */
router.post('/findings-summarize', async (req, res) => {
  try {
    const { findings = [], audience = 'executive' } = req.body || {};
    if (!Array.isArray(findings) || findings.length === 0) {
      return res.status(400).json({ error: 'findings array required' });
    }

    const systemPrompt = 'You are a forensic accountant summarizing investigation findings. Output STRICT JSON only.';
    const userMessage = `Summarize the following findings for a ${audience} audience.

FINDINGS:
${JSON.stringify(findings.slice(0, 50), null, 2)}

Return JSON:
{
  "headline": "string",
  "bullets": ["string"],
  "severity_breakdown": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "total_exposure": 0,
  "key_risks": ["string"],
  "open_questions": ["string"],
  "disclaimer": "AI-generated; verify all dollar figures."
}`;

    const result = await callOpenRouter(systemPrompt, userMessage, { temperature: 0.2, maxTokens: 1500 });
    return aiResponseOrError(res, result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/evidence-chain-of-custody
 *
 * Body:
 *   evidence: [{ id, description, collected_by?, collected_at?, location?, hash? }]
 *   case_id?
 */
router.post('/evidence-chain-of-custody', async (req, res) => {
  try {
    const { evidence = [], case_id = '' } = req.body || {};
    if (!Array.isArray(evidence) || evidence.length === 0) {
      return res.status(400).json({ error: 'evidence array required' });
    }

    const systemPrompt = 'You are a forensic accountant generating a chain-of-custody narrative for evidence handling. Output STRICT JSON only. Flag any breaks in the chain.';
    const userMessage = `Generate a chain-of-custody review for case ${case_id || '(unspecified)'}.

EVIDENCE (${evidence.length}):
${JSON.stringify(evidence.slice(0, 50), null, 2)}

Return JSON:
{
  "case_id": "string",
  "items": [
    {
      "evidence_id": "string",
      "narrative": "string",
      "custodians": ["string"],
      "integrity_status": "intact|broken|unknown",
      "concerns": ["string"]
    }
  ],
  "broken_chain_count": 0,
  "recommendations": ["string"],
  "disclaimer": "AI-generated; legal review required."
}`;

    const result = await callOpenRouter(systemPrompt, userMessage, { temperature: 0.2, maxTokens: 2000 });
    return aiResponseOrError(res, result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/case-strategy
 *
 * Body:
 *   case_summary, suspect_profiles[]?, evidence_summary?, constraints[]?
 */
router.post('/case-strategy', async (req, res) => {
  try {
    const {
      case_summary,
      suspect_profiles = [],
      evidence_summary = '',
      constraints = [],
    } = req.body || {};
    if (!case_summary) return res.status(400).json({ error: 'case_summary required' });

    const systemPrompt = 'You are a senior forensic investigator producing an investigation strategy plan. Output STRICT JSON only.';
    const userMessage = `Produce an investigation strategy.

CASE SUMMARY:
${case_summary}

SUSPECT PROFILES (${suspect_profiles.length}):
${JSON.stringify(suspect_profiles.slice(0, 20), null, 2)}

EVIDENCE SUMMARY:
${evidence_summary || '(none provided)'}

CONSTRAINTS:
${JSON.stringify(constraints, null, 2)}

Return JSON:
{
  "objectives": ["string"],
  "phases": [
    { "phase": "string", "actions": ["string"], "deliverables": ["string"], "estimated_duration_days": 0 }
  ],
  "interview_targets": [{ "person": "string", "topics": ["string"] }],
  "data_requests": ["string"],
  "expert_consults": ["string"],
  "risks": ["string"],
  "success_criteria": ["string"],
  "disclaimer": "AI-generated; tailor before execution."
}`;

    const result = await callOpenRouter(systemPrompt, userMessage, { temperature: 0.3, maxTokens: 2500 });
    return aiResponseOrError(res, result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
