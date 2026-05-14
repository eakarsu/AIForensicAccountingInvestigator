import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AIAnalysisDisplay from '../components/AIAnalysisDisplay';
import Pagination from '../components/Pagination';
import { resourceApi } from '../services/api';

const benfordApi = resourceApi('benford');

function BenfordAnalysis() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [localStats, setLocalStats] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await benfordApi.list({ page, limit: 12, search });
      // Backend now returns { data, total, page, totalPages, limit }
      setItems(res.data?.data || res.data || []);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Debounce search input → reset to page 1.
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchData(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this analysis?')) return;
    try {
      await benfordApi.remove(id);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleAIAnalyze = async (id) => {
    setAiLoading(true);
    setAiResult(null);
    setLocalStats(null);
    try {
      const res = await benfordApi.analyze(id);
      setAiResult(res.data.ai_analysis);
      setLocalStats(res.data.local_stats);
    } catch (err) {
      setAiResult({ error: err.response?.data?.error || 'AI analysis failed' });
    }
    setAiLoading(false);
  };

  const handleSave = async (formData) => {
    try {
      if (editItem) {
        await benfordApi.update(editItem.id, formData);
      } else {
        await benfordApi.create(formData);
      }
      setShowForm(false);
      setEditItem(null);
      fetchData();
    } catch (err) {
      alert('Save failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const openEdit = (item) => { setSelectedItem(null); setEditItem(item); setShowForm(true); };
  const openNew = () => { setEditItem(null); setShowForm(true); };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn-back" onClick={() => navigate('/')}>&#8592;</button>
          <h1>Benford's Law Analysis</h1>
        </div>
        <button className="btn-new" onClick={openNew}>+ New Analysis</button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Search by company, dataset type, risk level..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', width: '100%', maxWidth: 420 }}
        />
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Dataset Type</th>
              <th>Transactions</th>
              <th>Deviation Score</th>
              <th>Conformity</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(item.ai_analysis); setLocalStats(item.ai_analysis?.local_stats || null); }}>
                <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{item.company_name}</td>
                <td>{item.dataset_type}</td>
                <td>{item.total_transactions?.toLocaleString()}</td>
                <td>
                  <div>{item.deviation_score?.toFixed?.(2) ?? item.deviation_score}</div>
                  <div className="score-bar-container">
                    <div className={`score-bar ${item.risk_level}`} style={{ width: `${Math.min((item.deviation_score || 0) * 100, 100)}%` }}></div>
                  </div>
                </td>
                <td>{item.conformity_level}</td>
                <td><span className={`badge badge-${item.risk_level}`}>{item.risk_level}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {selectedItem && (
        <div className="modal-overlay" onClick={() => { setSelectedItem(null); setAiResult(null); setLocalStats(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.company_name}</h2>
              <button className="btn-close" onClick={() => { setSelectedItem(null); setAiResult(null); setLocalStats(null); }}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">Dataset Type</span><span className="detail-value">{selectedItem.dataset_type}</span></div>
                <div className="detail-item"><span className="detail-label">Total Transactions</span><span className="detail-value">{selectedItem.total_transactions?.toLocaleString()}</span></div>
                <div className="detail-item"><span className="detail-label">Deviation Score</span><span className="detail-value">{selectedItem.deviation_score}</span></div>
                <div className="detail-item"><span className="detail-label">Conformity Level</span><span className="detail-value">{selectedItem.conformity_level}</span></div>
                <div className="detail-item"><span className="detail-label">Risk Level</span><span className={`badge badge-${selectedItem.risk_level}`}>{selectedItem.risk_level}</span></div>
                <div className="detail-item"><span className="detail-label">Status</span><span className={`badge badge-${selectedItem.status}`}>{selectedItem.status}</span></div>
                <div className="detail-item full-width"><span className="detail-label">Notes</span><span className="detail-value">{selectedItem.notes}</span></div>
              </div>

              {localStats && (
                <div className="detail-section" style={{ marginTop: '1rem', padding: '1rem', background: '#0f172a', borderRadius: 8 }}>
                  <h3 style={{ marginTop: 0 }}>Local Statistical Tests</h3>
                  <p>χ² statistic: <strong>{localStats.chi_square.statistic}</strong> (df {localStats.chi_square.df}) — {localStats.chi_square.significance}</p>
                  {localStats.suspicious_digits && localStats.suspicious_digits.length > 0 && (
                    <p>Suspicious digits (|z| ≥ 2): {localStats.suspicious_digits.map(s => `${s.digit} (z=${s.z_score})`).join(', ')}</p>
                  )}
                </div>
              )}

              <AIAnalysisDisplay analysis={aiResult} />
            </div>
            <div className="modal-actions">
              <button className="btn-ai" onClick={() => handleAIAnalyze(selectedItem.id)} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : 'Run AI Analysis'}
              </button>
              <button className="btn-edit" onClick={() => openEdit(selectedItem)}>Edit</button>
              <button className="btn-delete" onClick={() => handleDelete(selectedItem.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <BenfordForm
          item={editItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

function BenfordForm({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    company_name: item?.company_name || '',
    dataset_type: item?.dataset_type || '',
    total_transactions: item?.total_transactions || '',
    deviation_score: item?.deviation_score || '',
    conformity_level: item?.conformity_level || 'Conforming',
    risk_level: item?.risk_level || 'low',
    notes: item?.notes || '',
    digit_distribution: item?.digit_distribution || {"1":0.30,"2":0.18,"3":0.13,"4":0.10,"5":0.08,"6":0.07,"7":0.06,"8":0.05,"9":0.04},
    expected_distribution: item?.expected_distribution || {"1":0.301,"2":0.176,"3":0.125,"4":0.097,"5":0.079,"6":0.067,"7":0.058,"8":0.051,"9":0.046}
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      total_transactions: parseInt(form.total_transactions),
      deviation_score: parseFloat(form.deviation_score)
    });
  };

  return (
    <div className="modal-overlay form-modal" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item ? 'Edit Analysis' : 'New Benford Analysis'}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group"><label>Company Name</label><input value={form.company_name} onChange={(e) => setForm({...form, company_name: e.target.value})} required /></div>
              <div className="form-group"><label>Dataset Type</label><input value={form.dataset_type} onChange={(e) => setForm({...form, dataset_type: e.target.value})} required /></div>
              <div className="form-group"><label>Total Transactions</label><input type="number" value={form.total_transactions} onChange={(e) => setForm({...form, total_transactions: e.target.value})} required /></div>
              <div className="form-group"><label>Deviation Score (0-1)</label><input type="number" step="0.01" min="0" max="1" value={form.deviation_score} onChange={(e) => setForm({...form, deviation_score: e.target.value})} required /></div>
              <div className="form-group">
                <label>Conformity Level</label>
                <select value={form.conformity_level} onChange={(e) => setForm({...form, conformity_level: e.target.value})}>
                  <option value="Conforming">Conforming</option>
                  <option value="Marginally conforming">Marginally Conforming</option>
                  <option value="Non-conforming">Non-conforming</option>
                </select>
              </div>
              <div className="form-group">
                <label>Risk Level</label>
                <select value={form.risk_level} onChange={(e) => setForm({...form, risk_level: e.target.value})}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group full-width"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-save">{item ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default BenfordAnalysis;
