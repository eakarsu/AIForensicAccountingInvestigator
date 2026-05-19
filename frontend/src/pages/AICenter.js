import React, { useState } from 'react';
import api from '../services/api';

/**
 * AI Center — apply pass 4 (mechanical backlog).
 *
 * Five tabs that wrap the new POST /api/ai/* endpoints:
 *   - expert-witness-narrative
 *   - report-template
 *   - findings-summarize
 *   - evidence-chain-of-custody
 *   - case-strategy
 *
 * Auth: api client injects JWT bearer from localStorage automatically.
 * Errors:
 *   - HTTP 503 (no OpenRouter key) is rendered as a clear "AI not configured"
 *     banner instead of a generic toast.
 *   - HTTP 502 / 4xx / 5xx falls through to the standard error box.
 */

const TABS = [
  { id: 'expert-witness-narrative', label: 'Expert Witness' },
  { id: 'report-template', label: 'Report Template' },
  { id: 'findings-summarize', label: 'Summarize Findings' },
  { id: 'evidence-chain-of-custody', label: 'Chain of Custody' },
  { id: 'case-strategy', label: 'Case Strategy' },
];

function ResultPanel({ result, error, status, loading }) {
  if (loading) {
    return (
      <div className="card" style={{ padding: '12px', marginTop: '16px' }}>
        Working...
      </div>
    );
  }
  if (status === 503) {
    return (
      <div
        className="card"
        style={{ padding: '12px', marginTop: '16px', borderColor: '#f59e0b', color: '#92400e' }}
      >
        AI not configured: this server is missing <code>OPENROUTER_API_KEY</code>.
        Set it in the backend <code>.env</code> and restart, then retry.
      </div>
    );
  }
  if (error) {
    return (
      <div
        className="card"
        style={{ padding: '12px', marginTop: '16px', borderColor: '#dc2626', color: '#b91c1c' }}
      >
        Error: {error}
      </div>
    );
  }
  if (!result) return null;
  return (
    <div className="card" style={{ padding: '12px', marginTop: '16px' }}>
      <div className="ai-analysis-header">
        <span className="ai-badge">AI</span>
        <h3>Result</h3>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

function useRunner(path) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(0);
  const [result, setResult] = useState(null);

  const run = async (payload) => {
    setLoading(true);
    setError('');
    setStatus(0);
    setResult(null);
    try {
      const res = await api.post(`/ai/${path}`, payload);
      setResult(res.data);
    } catch (err) {
      setStatus(err?.response?.status || 0);
      setError(err?.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, status, result, run };
}

function ExpertWitnessTab() {
  const r = useRunner('expert-witness-narrative');
  const [caseTitle, setCaseTitle] = useState('Acme Holdings vs SEC');
  const [jurisdiction, setJurisdiction] = useState('SDNY');
  const [creds, setCreds] = useState('CPA, CFE, 18 yrs forensic experience');
  const [scope, setScope] = useState('Quantum of damages from inventory misstatement');
  const [findingsText, setFindingsText] = useState(
    '- Inventory overstated by $4.2M FY2024\n- 14 channel-stuffing transactions late-Q4'
  );
  const [exhibitsText, setExhibitsText] = useState('Exhibit A: GL extract\nExhibit B: Email chain');
  const [rebuttalsText, setRebuttalsText] = useState('Defense argues normal seasonal variance');

  const submit = () => {
    r.run({
      case_title: caseTitle,
      jurisdiction,
      expert_credentials: creds,
      scope,
      findings: findingsText.split('\n').map((s) => s.trim()).filter(Boolean),
      exhibits: exhibitsText.split('\n').map((s) => s.trim()).filter(Boolean),
      opposing_arguments: rebuttalsText.split('\n').map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <div>
      <div className="form-group">
        <label>Case Title</label>
        <input value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Jurisdiction</label>
        <input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Expert Credentials</label>
        <input value={creds} onChange={(e) => setCreds(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Scope of Opinion</label>
        <input value={scope} onChange={(e) => setScope(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Findings (one per line)</label>
        <textarea rows={4} value={findingsText} onChange={(e) => setFindingsText(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Exhibits (one per line)</label>
        <textarea rows={3} value={exhibitsText} onChange={(e) => setExhibitsText(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Opposing Arguments (one per line)</label>
        <textarea
          rows={3}
          value={rebuttalsText}
          onChange={(e) => setRebuttalsText(e.target.value)}
        />
      </div>
      <button className="btn btn-primary" disabled={r.loading || !caseTitle} onClick={submit}>
        {r.loading ? 'Drafting...' : 'Draft Narrative'}
      </button>
      <ResultPanel {...r} />
    </div>
  );
}

function ReportTemplateTab() {
  const r = useRunner('report-template');
  const [template, setTemplate] = useState('executive_summary');
  const [entity, setEntity] = useState('Acme Holdings');
  const [period, setPeriod] = useState('FY2024');
  const [exposure, setExposure] = useState('4200000');
  const [findingsText, setFindingsText] = useState(
    '- Inventory overstatement\n- Channel stuffing\n- Disclosure gaps'
  );
  const [recsText, setRecsText] = useState('- Restate FY24\n- Strengthen month-end controls');

  const submit = () => {
    r.run({
      template,
      case_data: { entity_name: entity, period, total_exposure: Number(exposure) || 0 },
      findings: findingsText.split('\n').map((s) => s.trim()).filter(Boolean),
      recommendations: recsText.split('\n').map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <div>
      <div className="form-group">
        <label>Template</label>
        <select value={template} onChange={(e) => setTemplate(e.target.value)}>
          <option value="executive_summary">Executive Summary</option>
          <option value="sec_form">SEC Form</option>
          <option value="audit_committee">Audit Committee</option>
          <option value="litigation_support">Litigation Support</option>
        </select>
      </div>
      <div className="form-group">
        <label>Entity</label>
        <input value={entity} onChange={(e) => setEntity(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Period</label>
        <input value={period} onChange={(e) => setPeriod(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Total Exposure ($)</label>
        <input type="number" value={exposure} onChange={(e) => setExposure(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Findings (one per line)</label>
        <textarea rows={4} value={findingsText} onChange={(e) => setFindingsText(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Recommendations (one per line)</label>
        <textarea rows={3} value={recsText} onChange={(e) => setRecsText(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={r.loading} onClick={submit}>
        {r.loading ? 'Generating...' : 'Generate Report'}
      </button>
      <ResultPanel {...r} />
    </div>
  );
}

function FindingsSummarizeTab() {
  const r = useRunner('findings-summarize');
  const [audience, setAudience] = useState('executive');
  const [findingsJson, setFindingsJson] = useState(
    JSON.stringify(
      [
        { category: 'benford', description: 'High deviation in vendor payments', severity: 'high', dollar_amount: 0 },
        { category: 'embezzlement', description: 'Suspect: J. Doe', severity: 'critical', dollar_amount: 240000 },
      ],
      null,
      2,
    ),
  );
  const [parseError, setParseError] = useState('');

  const submit = () => {
    let findings;
    try {
      findings = JSON.parse(findingsJson);
      setParseError('');
    } catch (e) {
      setParseError(e.message);
      return;
    }
    r.run({ findings, audience });
  };

  return (
    <div>
      <div className="form-group">
        <label>Audience</label>
        <select value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="executive">Executive</option>
          <option value="auditor">Auditor</option>
          <option value="legal">Legal</option>
        </select>
      </div>
      <div className="form-group">
        <label>Findings (JSON array)</label>
        <textarea
          rows={10}
          value={findingsJson}
          onChange={(e) => setFindingsJson(e.target.value)}
          style={{ fontFamily: 'monospace' }}
        />
        {parseError && <div style={{ color: '#b91c1c' }}>JSON: {parseError}</div>}
      </div>
      <button className="btn btn-primary" disabled={r.loading} onClick={submit}>
        {r.loading ? 'Summarizing...' : 'Summarize'}
      </button>
      <ResultPanel {...r} />
    </div>
  );
}

function ChainOfCustodyTab() {
  const r = useRunner('evidence-chain-of-custody');
  const [caseId, setCaseId] = useState('CASE-2026-001');
  const [evidenceJson, setEvidenceJson] = useState(
    JSON.stringify(
      [
        { id: 'EV-001', description: 'GL extract', collected_by: 'Smith', collected_at: '2026-04-12', location: 'HQ', hash: 'abc123' },
        { id: 'EV-002', description: 'Email PST', collected_by: 'Smith', collected_at: '2026-04-13', location: 'HQ', hash: 'def456' },
      ],
      null,
      2,
    ),
  );
  const [parseError, setParseError] = useState('');

  const submit = () => {
    let evidence;
    try {
      evidence = JSON.parse(evidenceJson);
      setParseError('');
    } catch (e) {
      setParseError(e.message);
      return;
    }
    r.run({ case_id: caseId, evidence });
  };

  return (
    <div>
      <div className="form-group">
        <label>Case ID</label>
        <input value={caseId} onChange={(e) => setCaseId(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Evidence (JSON array)</label>
        <textarea
          rows={10}
          value={evidenceJson}
          onChange={(e) => setEvidenceJson(e.target.value)}
          style={{ fontFamily: 'monospace' }}
        />
        {parseError && <div style={{ color: '#b91c1c' }}>JSON: {parseError}</div>}
      </div>
      <button className="btn btn-primary" disabled={r.loading} onClick={submit}>
        {r.loading ? 'Reviewing...' : 'Review Chain of Custody'}
      </button>
      <ResultPanel {...r} />
    </div>
  );
}

function CaseStrategyTab() {
  const r = useRunner('case-strategy');
  const [summary, setSummary] = useState(
    'Suspected revenue recognition fraud at mid-cap public issuer; tip from internal whistleblower.',
  );
  const [suspectsText, setSuspectsText] = useState('CFO\nController');
  const [evidenceSummary, setEvidenceSummary] = useState(
    'Initial review of Q4 2024 GL shows unusual journal entries totaling $6.1M.',
  );
  const [constraintsText, setConstraintsText] = useState('60-day deadline\nNo on-site visit until week 3');

  const submit = () => {
    r.run({
      case_summary: summary,
      suspect_profiles: suspectsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((p) => ({ role: p })),
      evidence_summary: evidenceSummary,
      constraints: constraintsText.split('\n').map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <div>
      <div className="form-group">
        <label>Case Summary</label>
        <textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Suspect Profiles (one per line)</label>
        <textarea
          rows={3}
          value={suspectsText}
          onChange={(e) => setSuspectsText(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Evidence Summary</label>
        <textarea
          rows={3}
          value={evidenceSummary}
          onChange={(e) => setEvidenceSummary(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Constraints (one per line)</label>
        <textarea
          rows={3}
          value={constraintsText}
          onChange={(e) => setConstraintsText(e.target.value)}
        />
      </div>
      <button className="btn btn-primary" disabled={r.loading || !summary} onClick={submit}>
        {r.loading ? 'Planning...' : 'Plan Strategy'}
      </button>
      <ResultPanel {...r} />
    </div>
  );
}

export default function AICenter() {
  const [tab, setTab] = useState('expert-witness-narrative');

  let body = null;
  if (tab === 'expert-witness-narrative') body = <ExpertWitnessTab />;
  else if (tab === 'report-template') body = <ReportTemplateTab />;
  else if (tab === 'findings-summarize') body = <FindingsSummarizeTab />;
  else if (tab === 'evidence-chain-of-custody') body = <ChainOfCustodyTab />;
  else if (tab === 'case-strategy') body = <CaseStrategyTab />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Center</h1>
          <p className="page-subtitle">
            Forensic AI helpers for narrative reports, templates, and case planning.
          </p>
        </div>
      </div>

      <div
        className="tabs"
        style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`btn ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '16px' }}>{body}</div>
    </div>
  );
}
