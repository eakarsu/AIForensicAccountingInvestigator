import React, { useEffect, useState } from 'react';
import api from '../services/api';

const BLANK = {
  name: '',
  type: 'anomaly_threshold',
  metric: '',
  operator: '>',
  threshold: 0,
  threshold_max: '',
  severity: 'medium',
  enabled: true,
};

function DetectionRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api.get('/custom-views/detection-rules');
      setRules(res.data.rules || []);
    } catch (e) {
      setErr(e.message || 'failed to load');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (r) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      type: r.type,
      metric: r.metric,
      operator: r.operator,
      threshold: r.threshold,
      threshold_max: r.threshold_max != null ? r.threshold_max : '',
      severity: r.severity,
      enabled: !!r.enabled,
    });
  };

  const reset = () => { setEditingId(null); setForm(BLANK); };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      threshold: Number(form.threshold),
      threshold_max: form.threshold_max === '' ? undefined : Number(form.threshold_max),
    };
    try {
      if (editingId) {
        await api.put(`/custom-views/detection-rules/${editingId}`, payload);
      } else {
        await api.post('/custom-views/detection-rules', payload);
      }
      reset();
      load();
    } catch (er) {
      setErr(er.response?.data?.error || er.message);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/custom-views/detection-rules/${id}`);
      load();
    } catch (er) {
      setErr(er.message);
    }
  };

  return (
    <div className="cv-card" data-testid="cv-rules-editor">
      <h3>Detection Rules Editor</h3>
      <p className="cv-meta">CRUD for anomaly thresholds & Benford rules. Persists to the backend.</p>
      {err && <div className="cv-status cv-error">{err}</div>}

      <form onSubmit={submit} className="cv-form">
        <input placeholder="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="anomaly_threshold">anomaly_threshold</option>
          <option value="benford">benford</option>
        </select>
        <input placeholder="Metric (e.g. z_score)" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} required />
        <select value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })}>
          <option value=">">&gt;</option>
          <option value=">=">&gt;=</option>
          <option value="<">&lt;</option>
          <option value="<=">&lt;=</option>
          <option value="==">==</option>
          <option value="between">between</option>
        </select>
        <input type="number" step="any" placeholder="Threshold" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} required />
        <input type="number" step="any" placeholder="Threshold max (optional)" value={form.threshold_max} onChange={(e) => setForm({ ...form, threshold_max: e.target.value })} />
        <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
        <label className="cv-check">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> enabled
        </label>
        <div className="cv-form-actions">
          <button type="submit" className="cv-btn cv-btn-primary">{editingId ? 'Update' : 'Add'} Rule</button>
          {editingId && <button type="button" className="cv-btn" onClick={reset}>Cancel</button>}
        </div>
      </form>

      <table className="cv-table">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Type</th><th>Metric</th><th>Op</th><th>Threshold</th><th>Severity</th><th>Enabled</th><th></th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan="9">Loading...</td></tr>}
          {!loading && rules.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.name}</td>
              <td>{r.type}</td>
              <td>{r.metric}</td>
              <td>{r.operator}</td>
              <td>{r.threshold}{r.threshold_max != null ? ` .. ${r.threshold_max}` : ''}</td>
              <td><span className={`cv-pill cv-pill-${r.severity}`}>{r.severity}</span></td>
              <td>{r.enabled ? 'yes' : 'no'}</td>
              <td>
                <button className="cv-btn cv-btn-small" onClick={() => startEdit(r)}>Edit</button>
                <button className="cv-btn cv-btn-small cv-btn-danger" onClick={() => remove(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {!loading && !rules.length && <tr><td colSpan="9">No rules yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default DetectionRulesEditor;
