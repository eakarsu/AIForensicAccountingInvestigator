import React, { useState } from 'react';
import api from '../services/api';
import AIAnalysisDisplay from '../components/AIAnalysisDisplay';

/**
 * Frontend for the new module `backend/src/routes/network.js` (mounted at /api/network):
 *   POST /api/network/analyze              — money-flow graph analysis
 *   POST /api/network/transaction-cluster  — cluster transactions by size/month/source
 *
 * Mirrors styling of FraudScoring.js / AnomalyDetection.js — same card,
 * btn, ai-analysis-container classNames.
 */

const SAMPLE_TRANSACTIONS = [
  { id: 'tx_001', from: 'Acme Holdings', to: 'Beta Vendor LLC', amount: 4500, date: '2026-03-04', source: 'AP' },
  { id: 'tx_002', from: 'Beta Vendor LLC', to: 'Gamma Trust', amount: 4400, date: '2026-03-05', source: 'AP' },
  { id: 'tx_003', from: 'Gamma Trust', to: 'Acme Holdings', amount: 4300, date: '2026-03-07', source: 'AR' },
  { id: 'tx_004', from: 'Acme Holdings', to: 'Delta Services', amount: 25000, date: '2026-03-08', source: 'AP' },
  { id: 'tx_005', from: 'Delta Services', to: 'Beta Vendor LLC', amount: 24000, date: '2026-03-09', source: 'AP' },
];

function TransactionsEditor({ transactions, onChange }) {
  const updateRow = (i, field, value) => {
    const next = transactions.slice();
    next[i] = { ...next[i], [field]: field === 'amount' ? Number(value) || 0 : value };
    onChange(next);
  };
  const addRow = () => onChange([...transactions, { id: `tx_${transactions.length + 1}`, from: '', to: '', amount: 0, date: '', source: '' }]);
  const removeRow = (i) => onChange(transactions.filter((_, idx) => idx !== i));

  return (
    <div className="card" style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <strong>Transactions</strong>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => onChange(SAMPLE_TRANSACTIONS)}>Load Sample</button>
          <button type="button" className="btn" onClick={addRow}>Add Row</button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th><th>From</th><th>To</th><th>Amount</th><th>Date</th><th>Source</th><th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => (
              <tr key={i}>
                <td><input value={t.id || ''} onChange={(e) => updateRow(i, 'id', e.target.value)} /></td>
                <td><input value={t.from || ''} onChange={(e) => updateRow(i, 'from', e.target.value)} /></td>
                <td><input value={t.to || ''} onChange={(e) => updateRow(i, 'to', e.target.value)} /></td>
                <td><input type="number" value={t.amount ?? ''} onChange={(e) => updateRow(i, 'amount', e.target.value)} style={{ width: '110px' }} /></td>
                <td><input type="date" value={t.date || ''} onChange={(e) => updateRow(i, 'date', e.target.value)} /></td>
                <td><input value={t.source || ''} onChange={(e) => updateRow(i, 'source', e.target.value)} /></td>
                <td>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeRow(i)}>×</button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: 'center', color: '#888' }}>No transactions — click "Load Sample" or "Add Row".</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NetworkAnalysisStats({ stats }) {
  if (!stats) return null;
  const items = [
    { label: 'Total parties', value: stats.party_count ?? '—' },
    { label: 'Total volume', value: stats.total_volume != null ? `$${Number(stats.total_volume).toLocaleString()}` : '—' },
    { label: 'Reciprocal edges', value: stats.reciprocal_edges ?? '—' },
    { label: 'Suspicious clusters', value: stats.suspicious_clusters ?? (stats.clusters?.length ?? '—') },
  ];
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
      {items.map((it, i) => (
        <div key={i} className="card" style={{ padding: '10px 14px', minWidth: '160px' }}>
          <div style={{ fontSize: '0.75rem', color: '#888' }}>{it.label}</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function NetworkAnalysis() {
  const [tab, setTab] = useState('analyze');
  const [transactions, setTransactions] = useState(SAMPLE_TRANSACTIONS);
  const [bucketBy, setBucketBy] = useState('size');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const run = async (path, payload) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post(path, payload);
      setResult(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Network Analysis</h1>
          <p className="page-subtitle">Money-flow graph analysis and transaction clustering.</p>
        </div>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button className={`btn ${tab === 'analyze' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('analyze'); setResult(null); setError(''); }}>
          Money-flow Analyze
        </button>
        <button className={`btn ${tab === 'cluster' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('cluster'); setResult(null); setError(''); }}>
          Transaction Cluster
        </button>
      </div>

      <TransactionsEditor transactions={transactions} onChange={setTransactions} />

      <div className="card" style={{ padding: '16px', marginTop: '16px' }}>
        {tab === 'analyze' && (
          <>
            <p style={{ marginTop: 0 }}>
              Sends transactions to <code>POST /api/network/analyze</code>. AI returns suspicious clusters (circular flows, layering, structuring, shell patterns).
            </p>
            <button className="btn btn-primary" disabled={loading || transactions.length === 0} onClick={() => run('/network/analyze', { transactions })}>
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </>
        )}

        {tab === 'cluster' && (
          <>
            <p style={{ marginTop: 0 }}>
              Sends transactions to <code>POST /api/network/transaction-cluster</code>. AI labels each cluster with risk + next steps.
            </p>
            <div className="form-group" style={{ maxWidth: '240px' }}>
              <label>Bucket by</label>
              <select value={bucketBy} onChange={(e) => setBucketBy(e.target.value)}>
                <option value="size">Amount size</option>
                <option value="month">Month</option>
                <option value="source">Source</option>
              </select>
            </div>
            <button className="btn btn-primary" disabled={loading || transactions.length === 0} onClick={() => run('/network/transaction-cluster', { transactions, bucket_by: bucketBy })}>
              {loading ? 'Clustering...' : 'Run Clustering'}
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="card" style={{ padding: '12px', marginTop: '16px', borderColor: '#dc2626', color: '#b91c1c' }}>
          Error: {error}
        </div>
      )}

      {result && !loading && (
        <div style={{ marginTop: '16px' }}>
          <NetworkAnalysisStats stats={result.stats || result.network_stats} />
          {result.ai_analysis ? (
            <AIAnalysisDisplay analysis={result.ai_analysis} />
          ) : (
            <div className="card" style={{ padding: '12px', marginTop: '12px' }}>
              <div className="ai-analysis-header">
                <span className="ai-badge">AI</span>
                <h3>Result</h3>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
