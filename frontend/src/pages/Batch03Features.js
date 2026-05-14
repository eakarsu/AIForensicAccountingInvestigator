// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated frontend page (lean v0). Wires Custom Feature Suggestions
// and Gap endpoints (AI counterparts + non-AI features) to backend routes.
import React, { useState } from 'react';

const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || 'http://localhost:4000/api';

const FEATURES = [
  { kind: 'cfs', slug: 'cf-agentic-investigator', label: 'Agentic investigator', desc: 'NL prompt + transaction data → multi-analysis report', endpoint: '/cf-agentic-investigator' },
  { kind: 'cfs', slug: 'cf-visualisation', label: 'Visualisation', desc: 'Network graph of suspicious transactions/parties', endpoint: '/cf-visualisation' },
  { kind: 'cfs', slug: 'cf-ml-fraud-detection', label: 'ML fraud detection', desc: 'Train on historical fraud, score new transactions', endpoint: '/cf-ml-fraud-detection' },
  { kind: 'cfs', slug: 'cf-time-series-anomaly', label: 'Time-series anomaly', desc: 'Detect sudden pattern shifts', endpoint: '/cf-time-series-anomaly' },
  { kind: 'cfs', slug: 'cf-related-party-analysis', label: 'Related-party analysis', desc: 'Surface hidden relationships', endpoint: '/cf-related-party-analysis' },
  { kind: 'cfs', slug: 'cf-restatement-prediction', label: 'Restatement prediction', desc: 'Flag firms likely to restate', endpoint: '/cf-restatement-prediction' },
  { kind: 'cfs', slug: 'cf-regulatory-filing-diff', label: 'Regulatory-filing diff', desc: 'Compare filings across periods', endpoint: '/cf-regulatory-filing-diff' },
  { kind: 'gap-ai', slug: 'gap-ai-no-agentic-investigator-chaining-benford-ratios-network', label: 'No agentic investigator chaining Benford → ratios → network', desc: 'No agentic investigator chaining Benford → ratios → network analysis', endpoint: '/gap-no-agentic-investigator-chaining-benford-ratios-network' },
  { kind: 'gap-ai', slug: 'gap-ai-no-related-party-discovery-agent', label: 'No related-party-discovery agent', desc: 'No related-party-discovery agent', endpoint: '/gap-no-related-party-discovery-agent' },
  { kind: 'gap-ai', slug: 'gap-ai-no-restatement-prediction-model', label: 'No restatement-prediction model', desc: 'No restatement-prediction model', endpoint: '/gap-no-restatement-prediction-model' },
  { kind: 'gap-ai', slug: 'gap-ai-no-regulatory-filing-diff-agent', label: 'No regulatory-filing diff agent', desc: 'No regulatory-filing diff agent', endpoint: '/gap-no-regulatory-filing-diff-agent' },
  { kind: 'gap-non', slug: 'gap-non-no-webhooks', label: 'No webhooks', desc: 'No webhooks', endpoint: '/gap-no-webhooks' },
  { kind: 'gap-non', slug: 'gap-non-no-notifications-subsystem', label: 'No notifications subsystem', desc: 'No notifications subsystem', endpoint: '/gap-no-notifications-subsystem' },
  { kind: 'gap-non', slug: 'gap-non-no-investigation-case-management-lifecycle-only-flat-report', label: 'No investigation case management lifecycle (only flat report', desc: 'No investigation case management lifecycle (only flat reports)', endpoint: '/gap-no-investigation-case-management-lifecycle-only-flat-report' },
  { kind: 'gap-non', slug: 'gap-non-no-evidence-chain-custody-module', label: 'No evidence-chain custody module', desc: 'No evidence-chain custody module', endpoint: '/gap-no-evidence-chain-custody-module' },
  { kind: 'gap-non', slug: 'gap-non-no-expert-witness-report-templating', label: 'No expert-witness report templating', desc: 'No expert-witness report templating', endpoint: '/gap-no-expert-witness-report-templating' },
  { kind: 'gap-non', slug: 'gap-non-no-data-visualisation-endpoints-only-raw-report-exports', label: 'No data-visualisation endpoints (only raw report exports)', desc: 'No data-visualisation endpoints (only raw report exports)', endpoint: '/gap-no-data-visualisation-endpoints-only-raw-report-exports' },
];

function authHeaders() {
  const t = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export default function Batch03Features() {
  const [active, setActive] = useState(FEATURES[0]?.slug);
  const [input, setInput] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const current = FEATURES.find(f => f.slug === active) || FEATURES[0];

  async function run() {
    if (!current) return;
    setLoading(true); setError(null);
    try {
      let parsed;
      try { parsed = input ? JSON.parse(input) : {}; } catch { parsed = { input }; }
      const r = await fetch(`${API_BASE}${current.endpoint}`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(parsed)
      });
      let body; try { body = await r.json(); } catch { body = { raw: await r.text() }; }
      if (!r.ok) setError(body.error || `HTTP ${r.status}`);
      setResults(prev => ({ ...prev, [current.slug]: body }));
    } catch (e) {
      setError(String(e.message || e));
    } finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Batch 03 Features <small style={{ color: '#64748b', fontWeight: 400 }}>(AIForensicAccountingInvestigator)</small></h2>
      <p style={{ color: '#475569', maxWidth: 720 }}>
        Audit-driven AI counterparts, non-AI feature gaps, and custom feature suggestions.
        Backend endpoints prefixed <code>/api/cf-*</code> (custom features) and <code>/api/gap-*</code> (gap fills).
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
        {FEATURES.map(f => (
          <button key={f.slug} onClick={() => setActive(f.slug)}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1',
                     background: active === f.slug ? '#1e40af' : '#f8fafc',
                     color: active === f.slug ? 'white' : '#0f172a', cursor: 'pointer', fontSize: 12 }}>
            <span style={{ opacity: 0.7, marginRight: 4 }}>[{f.kind}]</span>{f.label}
          </button>
        ))}
      </div>
      {current && (
        <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: 8 }}>
            <strong>{current.label}</strong>
            <div style={{ color: '#475569', fontSize: 13 }}>{current.desc}</div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>POST <code>{current.endpoint}</code></div>
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder='Optional JSON input (e.g. {"query":"..."})'
            style={{ width: '100%', minHeight: 80, padding: 8, fontFamily: 'monospace', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }} />
          <div style={{ marginTop: 8 }}>
            <button onClick={run} disabled={loading}
              style={{ padding: '8px 16px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Running…' : 'Run'}
            </button>
          </div>
          {error && (<div style={{ marginTop: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: 13 }}>{error}</div>)}
          {results[current.slug] && (
            <pre style={{ marginTop: 12, padding: 10, background: '#0b1020', color: '#cbd5e1', borderRadius: 4, overflow: 'auto', maxHeight: 360, fontSize: 12 }}>
              {typeof results[current.slug] === 'string' ? results[current.slug] : JSON.stringify(results[current.slug], null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
