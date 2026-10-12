'use strict';

const express = require('express');
const { authenticateToken } = require('../src/middleware/auth');
const { callOpenRouter } = require('../src/services/openrouter');

const router = express.Router();
router.use(authenticateToken);

const FEATURES = [
  ['gap-no-agentic-investigator-chaining-benford-ratios-network', 'Chained forensic review', 'Plan a review across Benford, ratios, and network evidence without treating an AI inference as a finding.'],
  ['gap-no-related-party-discovery-agent', 'Related-party discovery', 'Review supplied relationship evidence and identify verification steps.'],
  ['gap-no-restatement-prediction-model', 'Restatement risk review', 'Assess supplied indicators as an uncalibrated planning aid.'],
  ['gap-no-regulatory-filing-diff-agent', 'Regulatory filing comparison', 'Compare user-supplied filing excerpts without inventing filing contents.'],
  ['gap-no-webhooks', 'Webhook design review', 'Draft a webhook implementation and control plan; do not claim delivery.'],
  ['gap-no-notifications-subsystem', 'Notification design review', 'Draft a notification implementation and approval plan; do not claim messages were sent.'],
  ['gap-no-investigation-case-management-lifecycle-only-flat-report', 'Case lifecycle review', 'Draft a governed case-lifecycle plan with evidence and approval gates.'],
  ['gap-no-evidence-chain-custody-module', 'Evidence custody review', 'Review only supplied custody facts; identify missing hashes, dates, and custodians.'],
  ['gap-no-expert-witness-report-templating', 'Expert report planning', 'Draft a report plan without inventing credentials, exhibits, or opinions.'],
  ['gap-no-data-visualisation-endpoints-only-raw-report-exports', 'Visualization planning', 'Draft a visualization plan tied to supplied data references.'],
  ['cf-agentic-investigator', 'Agentic investigator', 'Produce a staged, reviewable forensic analysis plan.'],
  ['cf-visualisation', 'Forensic visualization', 'Recommend a source-indexed graph or chart design.'],
  ['cf-ml-fraud-detection', 'ML fraud detection', 'Describe an evaluation workflow; scores remain uncalibrated until validated.'],
  ['cf-time-series-anomaly', 'Time-series anomaly', 'Review supplied series context and distinguish observations from hypotheses.'],
  ['cf-related-party-analysis', 'Related-party analysis', 'Identify possible links and the evidence needed to verify each one.'],
  ['cf-restatement-prediction', 'Restatement prediction', 'Provide a risk-review draft, not a prediction represented as fact.'],
  ['cf-regulatory-filing-diff', 'Regulatory filing diff', 'Compare supplied excerpts and cite the source reference for every observation.'],
];

function providerStatus(result) {
  if (!result?.error) return null;
  return String(result.error).includes('OPENROUTER_API_KEY not configured') ? 503 : 502;
}

function buildHandler(label, guidance) {
  return async (req, res) => {
    try {
      const { objective, source_record, context, constraints, desired_output } = req.body || {};
      if (!String(objective || '').trim()) return res.status(400).json({ error: 'objective is required' });
      if (!source_record?.id || !source_record?.report_number) return res.status(400).json({ error: 'a saved source record is required' });
      if (!String(context || '').trim() || !String(constraints || '').trim() || !String(desired_output || '').trim()) {
        return res.status(400).json({ error: 'context, constraints, and desired_output are required' });
      }

      const systemPrompt = `You are a forensic accounting planning assistant. ${guidance} Return strict JSON with summary, source_references, observations, assumptions, missing_information, risks, and next_steps. Keep every conclusion explicitly subject to independent human verification.`;
      const userMessage = JSON.stringify({
        feature: label,
        objective,
        source_record,
        context,
        constraints,
        desired_output,
      }, null, 2);
      const result = await callOpenRouter(systemPrompt, userMessage, { temperature: 0.2, maxTokens: 1800 });
      const status = providerStatus(result);
      if (status) {
        return res.status(status).json({
          error: status === 503 ? 'AI not configured (OPENROUTER_API_KEY missing)' : result.error,
        });
      }
      return res.json({
        title: label,
        result,
        source_record,
        generated_at: new Date().toISOString(),
        disclaimer: 'AI-generated planning draft. Verify source records, evidence, and conclusions before use.',
      });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'AI request failed' });
    }
  };
}

for (const [path, label, guidance] of FEATURES) {
  router.post(`/${path}`, buildHandler(label, guidance));
}

module.exports = router;
