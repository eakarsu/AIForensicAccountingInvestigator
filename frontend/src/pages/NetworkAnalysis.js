import GeneratedAiResponse from './GeneratedAiResponse';
import React, { useRef, useState } from 'react';
import api from '../services/api';
import AIAnalysisDisplay from '../components/AIAnalysisDisplay';
import NativeAIControls from '../components/NativeAIControls';
import useNativeAIRequest from '../components/useNativeAIRequest';

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

const networkHistoryKey = () => {
  try { return `forensic-network-history:${JSON.parse(localStorage.getItem('user') || '{}').id || 'anonymous'}`; }
  catch { return 'forensic-network-history:anonymous'; }
};
const readNetworkHistory = () => {
  try { const value = JSON.parse(localStorage.getItem(networkHistoryKey()) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
};

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
  const nativeAIRequest = useNativeAIRequest();
  const [tab, setTab] = useState('analyze');
  const [transactions, setTransactions] = useState(SAMPLE_TRANSACTIONS);
  const [bucketBy, setBucketBy] = useState('size');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(readNetworkHistory);
  const lastRequest = useRef(null);
  const presets = ['Small ledger', 'Circular flow', 'Detailed review'].map((name, index) => ({
    name,
    fill: () => {
      const rows = SAMPLE_TRANSACTIONS.slice(0, [2, 3, 5][index]).map((row, position) => ({
        ...row, id: `example_${index + 1}_${position + 1}`,
        amount: row.amount * [1, 1.1, 1.25][index],
      }));
      setTransactions(rows);
      setBucketBy(['size', 'month', 'source'][index]);
      setError(''); setResult(null);
      return { filled: rows.length * 6 + 1 };
    },
  }));

  const run = async (path, payload) => {
    const request = { path, payload };
    lastRequest.current = request;
    setLoading(true);
    setError('');
    setNotice('');
    setResult(null);
    try {
      const res = await nativeAIRequest.run((signal) => api.post(path, payload, { signal }));
      setResult(res.data);
      const entry = { id: `${Date.now()}-${path}`, tool: path.endsWith('transaction-cluster') ? 'Transaction Cluster' : 'Money-flow Analysis', generatedAt: new Date().toISOString(), response: res.data };
      setHistory((currentHistory) => {
        const next = [entry, ...currentHistory].slice(0, 12);
        try { localStorage.setItem(networkHistoryKey(), JSON.stringify(next)); } catch (_) { /* storage may be unavailable */ }
        return next;
      });
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') setNotice('Generation cancelled. No output was saved.');
      else setError(err?.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <NativeAIControls presets={presets} busy={nativeAIRequest.busy} onCancel={() => { nativeAIRequest.cancel(); setLoading(false); }} context="transaction graph review">
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Network Analysis</h1>
          <p className="page-subtitle">Money-flow graph analysis and transaction clustering.</p>
          <p className="page-subtitle">Examples contain fictional ledger entries. Replace them with your evidence before a real investigation.</p>
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
            <div className="ai-request-actions">
              <button className="btn btn-primary" disabled={loading || transactions.length === 0} onClick={() => run('/network/analyze', { transactions })}>
                {loading ? 'Generating…' : 'Generate with OpenRouter'}
              </button>
              {loading && <button type="button" className="btn-cancel" onClick={() => nativeAIRequest.cancel()}>Cancel</button>}
            </div>
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
            <div className="ai-request-actions">
              <button className="btn btn-primary" disabled={loading || transactions.length === 0} onClick={() => run('/network/transaction-cluster', { transactions, bucket_by: bucketBy })}>
                {loading ? 'Generating…' : 'Generate with OpenRouter'}
              </button>
              {loading && <button type="button" className="btn-cancel" onClick={() => nativeAIRequest.cancel()}>Cancel</button>}
            </div>
          </>
        )}
      </div>

      {notice && <div className="card" role="status" style={{ padding: '12px', marginTop: '16px' }}>{notice}</div>}
      {error && (
        <div className="card" role="alert" style={{ padding: '12px', marginTop: '16px', borderColor: '#dc2626', color: '#fca5a5' }}>
          Error: {error} {lastRequest.current && <button type="button" disabled={loading} onClick={() => run(lastRequest.current.path, lastRequest.current.payload)}>Retry</button>}
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
              <GeneratedAiResponse response={result} />
            </div>
          )}
        </div>
      )}
      <section className="ai-history" aria-label="Network AI history">
        <div className="ai-history-heading"><div><h2>Generation history</h2><p>Successful browser-local outputs. Examples are fictional and every output requires verification.</p></div>{history.length > 0 && <button type="button" onClick={() => { setHistory([]); try { localStorage.removeItem(networkHistoryKey()); } catch (_) { /* ignore */ } }}>Clear history</button>}</div>
        {history.length === 0 ? <p>No successful generations yet.</p> : history.map((entry) => <details key={entry.id} className="ai-history-item"><summary><strong>{entry.tool}</strong><span>{new Date(entry.generatedAt).toLocaleString()}</span></summary><GeneratedAiResponse response={entry.response} /></details>)}
      </section>
    </div>
    </NativeAIControls>
  );
}
