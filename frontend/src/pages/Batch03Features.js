import React, { useEffect, useRef, useState } from 'react';
import GeneratedAiResponse from './GeneratedAiResponse';
import api from '../services/api';

const FEATURES = [
  ['cf-agentic-investigator', 'Agentic investigator', 'Staged forensic analysis plan'],
  ['cf-visualisation', 'Visualization', 'Source-indexed graph or chart plan'],
  ['cf-ml-fraud-detection', 'ML fraud detection', 'Validation and scoring review'],
  ['cf-time-series-anomaly', 'Time-series anomaly', 'Pattern-shift review'],
  ['cf-related-party-analysis', 'Related-party analysis', 'Relationship evidence review'],
  ['cf-restatement-prediction', 'Restatement risk', 'Uncalibrated risk review'],
  ['cf-regulatory-filing-diff', 'Regulatory filing diff', 'Source-cited filing comparison'],
  ['gap-no-agentic-investigator-chaining-benford-ratios-network', 'Chained review', 'Benford, ratio, and network plan'],
  ['gap-no-related-party-discovery-agent', 'Related-party discovery', 'Verification-first discovery plan'],
  ['gap-no-restatement-prediction-model', 'Restatement model review', 'Model readiness assessment'],
  ['gap-no-regulatory-filing-diff-agent', 'Filing diff review', 'Filing comparison controls'],
  ['gap-no-webhooks', 'Webhook design', 'Delivery design without delivery claims'],
  ['gap-no-notifications-subsystem', 'Notification design', 'Approval-aware notification plan'],
  ['gap-no-investigation-case-management-lifecycle-only-flat-report', 'Case lifecycle', 'Governed case lifecycle plan'],
  ['gap-no-evidence-chain-custody-module', 'Evidence custody', 'Custody control review'],
  ['gap-no-expert-witness-report-templating', 'Expert report', 'Credential-safe report plan'],
  ['gap-no-data-visualisation-endpoints-only-raw-report-exports', 'Data visualization', 'Source-linked visualization plan'],
].map(([slug, label, description]) => ({ slug, label, description, endpoint: `/${slug}` }));

const EXAMPLES = [
  {
    label: 'Scoping review',
    objective: 'Prepare a scoped review plan for the selected saved investigation report.',
    context: 'Fictional evaluation exercise. Distinguish stored report content from assumptions and identify missing source evidence.',
    constraints: 'Do not assert fraud, guilt, custody, approval, filing status, delivery, or financial loss beyond the selected record. Require independent human review.',
    desired_output: 'Executive summary, source-cited observations, missing information, risks, and prioritized next steps.',
  },
  {
    label: 'Evidence review',
    objective: 'Assess what evidence would be needed to test the selected report’s draft findings.',
    context: 'Fictional training workflow using the selected saved report only as a source reference, not as proof of misconduct.',
    constraints: 'Preserve the selected source. Do not invent exhibits, hashes, custodians, credentials, interviews, approvals, or provider receipts.',
    desired_output: 'Evidence matrix with claim, saved source reference, verification method, gap, owner role, and review gate.',
  },
  {
    label: 'Committee brief',
    objective: 'Draft a decision-ready briefing outline from the selected saved report.',
    context: 'Fictional audit-committee practice brief. Dollar values and conclusions remain unverified until reconciled to original records.',
    constraints: 'Use measured language, show assumptions, cite the selected source record, and keep consequential decisions under human control.',
    desired_output: 'Briefing outline with observations, alternatives, uncertainty, safeguards, and questions for management.',
  },
];

const emptyForm = { objective: '', sourceId: '', context: '', constraints: '', desired_output: '' };
const historyKey = () => {
  try { return `forensic-batch-history:${JSON.parse(localStorage.getItem('user') || '{}').id || 'anonymous'}`; }
  catch { return 'forensic-batch-history:anonymous'; }
};
const readHistory = () => {
  try { const value = JSON.parse(localStorage.getItem(historyKey()) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
};

export default function Batch03Features() {
  const [active, setActive] = useState(FEATURES[0].slug);
  const [form, setForm] = useState(emptyForm);
  const [sources, setSources] = useState([]);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [sourceError, setSourceError] = useState('');
  const [sourceRetry, setSourceRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(readHistory);
  const controllerRef = useRef(null);
  const lastRequest = useRef(null);
  const current = FEATURES.find((feature) => feature.slug === active) || FEATURES[0];

  useEffect(() => {
    let mounted = true;
    setSourceLoading(true);
    setSourceError('');
    api.get('/reports', { params: { limit: 100 } })
      .then((response) => {
        const rows = Array.isArray(response.data) ? response.data : response.data?.data;
        if (!Array.isArray(rows)) throw new Error('Saved reports returned an invalid response.');
        if (mounted) setSources(rows);
      })
      .catch((requestError) => {
        if (mounted) {
          setSources([]);
          setSourceError(requestError.response?.data?.error || requestError.message || 'Could not load saved reports.');
        }
      })
      .finally(() => { if (mounted) setSourceLoading(false); });
    return () => { mounted = false; };
  }, [sourceRetry]);

  const selectedSource = sources.find((source) => String(source.id) === form.sourceId);
  const fillExample = (example, index) => {
    const source = selectedSource || sources[index % sources.length];
    setForm({
      objective: example.objective,
      sourceId: source ? String(source.id) : '',
      context: example.context,
      constraints: example.constraints,
      desired_output: example.desired_output,
    });
    setError('');
    setResult(null);
    setNotice(source
      ? 'All editable fields filled. The currently selected saved source is preserved; Generate remains a separate action.'
      : 'Drafting fields filled, but a genuine saved report must load before generation.');
  };

  const runRequest = async (request) => {
    if (loading) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    lastRequest.current = request;
    setLoading(true);
    setError('');
    setNotice('');
    setResult(null);
    try {
      const response = await api.post(request.endpoint, request.payload, { signal: controller.signal });
      setResult(response.data);
      const entry = { id: `${Date.now()}-${request.slug}`, tool: request.label, generatedAt: new Date().toISOString(), response: response.data };
      setHistory((currentHistory) => {
        const next = [entry, ...currentHistory].slice(0, 12);
        try { localStorage.setItem(historyKey(), JSON.stringify(next)); } catch (_) { /* browser storage may be unavailable */ }
        return next;
      });
    } catch (requestError) {
      if (requestError.code === 'ERR_CANCELED' || requestError.name === 'CanceledError') {
        setNotice('Generation cancelled. No output was saved.');
      } else {
        setError(requestError.response?.data?.error || requestError.message || 'AI request failed.');
      }
    } finally {
      controllerRef.current = null;
      setLoading(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!selectedSource) { setError('Select a genuine saved report before generating.'); return; }
    const missing = ['objective', 'context', 'constraints', 'desired_output'].find((key) => !form[key].trim());
    if (missing) { setError('Complete every drafting field before generating.'); return; }
    runRequest({
      endpoint: current.endpoint,
      slug: current.slug,
      label: current.label,
      payload: {
        objective: form.objective,
        source_record: { id: selectedSource.id, report_number: selectedSource.report_number, title: selectedSource.title },
        context: form.context,
        constraints: form.constraints,
        desired_output: form.desired_output,
      },
    });
  };

  return (
    <div className="page">
      <h1>Governed AI Features</h1>
      <p>Generate reviewable OpenRouter planning drafts from a genuine saved report reference. No example starts a provider request.</p>
      <nav className="tabs" aria-label="Governed AI feature">
        {FEATURES.map((feature) => (
          <button type="button" key={feature.slug} disabled={loading} onClick={() => { setActive(feature.slug); setResult(null); setError(''); setNotice(''); }}>
            {feature.label}
          </button>
        ))}
      </nav>

      <form onSubmit={submit} className="card ai-feature-form">
        <h2>{current.label}</h2>
        <p>{current.description}</p>
        <div className="ai-preset-bar">
          <strong>Complete examples</strong>
          <p>Each example fills every editable field and preserves a source you already selected.</p>
          {EXAMPLES.map((example, index) => <button type="button" key={example.label} disabled={loading || sourceLoading} onClick={() => fillExample(example, index)}>{example.label}</button>)}
        </div>
        {sourceLoading && <p role="status">Loading saved report sources…</p>}
        {sourceError && <p role="alert">{sourceError} <button type="button" onClick={() => setSourceRetry((value) => value + 1)}>Retry saved reports</button></p>}
        <div className="form-group"><label htmlFor="batch-objective">Objective</label><textarea id="batch-objective" value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} /></div>
        <div className="form-group"><label htmlFor="batch-source">Saved report source</label><select id="batch-source" value={form.sourceId} disabled={sourceLoading || Boolean(sourceError)} onChange={(event) => setForm({ ...form, sourceId: event.target.value })}><option value="">Select a saved report</option>{sources.map((source) => <option key={source.id} value={String(source.id)}>{source.report_number} · {source.title}</option>)}</select></div>
        <div className="form-group"><label htmlFor="batch-context">Context</label><textarea id="batch-context" value={form.context} onChange={(event) => setForm({ ...form, context: event.target.value })} /></div>
        <div className="form-group"><label htmlFor="batch-constraints">Constraints and gates</label><textarea id="batch-constraints" value={form.constraints} onChange={(event) => setForm({ ...form, constraints: event.target.value })} /></div>
        <div className="form-group"><label htmlFor="batch-output">Desired output</label><textarea id="batch-output" value={form.desired_output} onChange={(event) => setForm({ ...form, desired_output: event.target.value })} /></div>
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error} {lastRequest.current && <button type="button" disabled={loading} onClick={() => runRequest(lastRequest.current)}>Retry</button>}</p>}
        <div className="ai-request-actions">
          <button type="submit" className="btn btn-primary" disabled={loading || sourceLoading || Boolean(sourceError)}>{loading ? 'Generating…' : 'Generate with OpenRouter'}</button>
          {loading && <button type="button" className="btn-cancel" onClick={() => controllerRef.current?.abort()}>Cancel</button>}
        </div>
      </form>

      {result !== null && <GeneratedAiResponse response={result} />}
      <section className="ai-history" aria-label="Governed AI history">
        <div className="ai-history-heading"><div><h2>Generation history</h2><p>Successful browser-local drafts. Every draft remains subject to source verification and human review.</p></div>{history.length > 0 && <button type="button" onClick={() => { setHistory([]); try { localStorage.removeItem(historyKey()); } catch (_) { /* ignore */ } }}>Clear history</button>}</div>
        {history.length === 0 ? <p>No successful generations yet.</p> : history.map((entry) => <details key={entry.id} className="ai-history-item"><summary><strong>{entry.tool}</strong><span>{new Date(entry.generatedAt).toLocaleString()}</span></summary><GeneratedAiResponse response={entry.response} /></details>)}
      </section>
    </div>
  );
}
