import React, { useState } from 'react';
import api from '../services/api';

/**
 * Apply pass 5 (FE) — surface the additive `/api/extras/*` endpoints.
 *
 * Backend: backend/src/routes/extras.js (mounted under /api/extras).
 * Endpoints covered:
 *   - POST /api/extras/ml-fraud-detector/score   (TOO-RISKY heuristic stub)
 *   - POST /api/extras/timeseries-anomaly/detect (MECHANICAL z-score)
 *   - POST /api/extras/restatement-predict       (MECHANICAL signals)
 *   - POST /api/extras/external-screening        (NEEDS-CREDS)
 *   - POST /api/extras/sec-edgar/pull            (NEEDS-CREDS)
 *
 * Auth: api client injects JWT bearer.
 * 503 banner is rendered for endpoints whose required env var is unset.
 */

const TABS = [
  { id: 'ml-fraud-detector/score', label: 'ML Fraud Score' },
  { id: 'timeseries-anomaly/detect', label: 'Time Series Anomaly' },
  { id: 'restatement-predict', label: 'Restatement Predict' },
  { id: 'external-screening', label: 'External Screening' },
  { id: 'sec-edgar/pull', label: 'SEC EDGAR' },
];

const SAMPLE_BY_TAB = {
  'ml-fraud-detector/score': {
    transactions: [
      { id: 't1', amount: 9999, vendor: 'Acme', date: '2025-01-15' },
      { id: 't2', amount: 9990, vendor: 'Acme', date: '2025-01-16' },
    ],
  },
  'timeseries-anomaly/detect': {
    series: [100, 102, 101, 99, 98, 250, 102, 101, 99],
    window: 5,
  },
  'restatement-predict': {
    company: 'Acme Holdings',
    ratios: { gross_margin: 0.62, dso: 92, accruals_to_assets: 0.18 },
    auditor_changes: 1,
  },
  'external-screening': { entity_name: 'John Doe', entity_type: 'individual' },
  'sec-edgar/pull': { cik: '0000320193', form: '10-K' },
};

export default function ExtrasTools() {
  const [tab, setTab] = useState(TABS[0].id);
  const [body, setBody] = useState(JSON.stringify(SAMPLE_BY_TAB[TABS[0].id], null, 2));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const onTabChange = (id) => {
    setTab(id);
    setBody(JSON.stringify(SAMPLE_BY_TAB[id] || {}, null, 2));
    setResult(null);
    setError('');
    setStatus(0);
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    setStatus(0);
    setResult(null);
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch (e) {
      setLoading(false);
      setError('Body is not valid JSON: ' + e.message);
      return;
    }
    try {
      const res = await api.post(`/extras/${tab}`, payload);
      setResult(res.data);
    } catch (err) {
      setStatus(err?.response?.status || 0);
      setError(err?.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1>Extras Tools</h1>
      <p style={{ color: '#475569', maxWidth: '720px' }}>
        Backlog endpoints from Apply pass 5. Heavy/external integrations
        (external screening, SEC EDGAR) return HTTP 503 with{' '}
        <code>missing</code> when their required env var is unset.
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '16px 0' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? 'btn btn-primary' : 'btn'}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="form-group">
        <label>Request body (JSON)</label>
        <textarea
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ fontFamily: 'monospace', width: '100%' }}
        />
      </div>

      <button className="btn btn-primary" disabled={loading} onClick={submit}>
        {loading ? 'Running...' : `POST /api/extras/${tab}`}
      </button>

      {status === 503 && (
        <div
          className="card"
          style={{ padding: '12px', marginTop: '16px', borderColor: '#f59e0b', color: '#92400e' }}
        >
          Service not configured. {error}
        </div>
      )}
      {status !== 503 && error && (
        <div
          className="card"
          style={{ padding: '12px', marginTop: '16px', borderColor: '#dc2626', color: '#b91c1c' }}
        >
          Error: {error}
        </div>
      )}
      {result && (
        <div className="card" style={{ padding: '12px', marginTop: '16px' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
