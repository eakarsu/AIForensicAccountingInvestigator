import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AIAnalysisDisplay from '../components/AIAnalysisDisplay';

const API = 'http://localhost:3001/api';

function FraudScoring({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      // Backend now returns { data, total, page, totalPages, limit }.
      const res = await axios.get(`${API}/fraud`, { headers, params: { limit: 100 } });
      setItems(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this fraud score record?')) return;
    try {
      await axios.delete(`${API}/fraud/${id}`, { headers });
      setSelectedItem(null); fetchData();
    } catch (err) { alert('Delete failed'); }
  };

  const handleAIAnalyze = async (id) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await axios.post(`${API}/fraud/${id}/analyze`, {}, { headers });
      setAiResult(res.data.ai_analysis);
    } catch (err) {
      setAiResult({ error: err.response?.data?.error || 'AI analysis failed' });
    }
    setAiLoading(false);
  };

  const handleSave = async (formData) => {
    try {
      if (editItem) {
        await axios.put(`${API}/fraud/${editItem.id}`, formData, { headers });
      } else {
        await axios.post(`${API}/fraud`, formData, { headers });
      }
      setShowForm(false); setEditItem(null); fetchData();
    } catch (err) { alert('Save failed: ' + (err.response?.data?.error || err.message)); }
  };

  const openEdit = (item) => { setSelectedItem(null); setEditItem(item); setShowForm(true); };
  const openNew = () => { setEditItem(null); setShowForm(true); };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn-back" onClick={() => navigate('/')}>&#8592;</button>
          <h1>Financial Statement Fraud Scoring</h1>
        </div>
        <button className="btn-new" onClick={openNew}>+ New Score</button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Fiscal Year</th>
              <th>Overall Score</th>
              <th>Revenue</th>
              <th>Expense</th>
              <th>Asset</th>
              <th>Beneish M</th>
              <th>Altman Z</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(item.ai_analysis); }}>
                <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{item.company_name}</td>
                <td>{item.fiscal_year}</td>
                <td>
                  <div>{(item.overall_score * 100).toFixed(0)}%</div>
                  <div className="score-bar-container">
                    <div className={`score-bar ${item.risk_level}`} style={{ width: `${item.overall_score * 100}%` }}></div>
                  </div>
                </td>
                <td>{(item.revenue_manipulation_score * 100).toFixed(0)}%</td>
                <td>{(item.expense_manipulation_score * 100).toFixed(0)}%</td>
                <td>{(item.asset_misstatement_score * 100).toFixed(0)}%</td>
                <td style={{ fontFamily: 'monospace' }}>{item.beneish_m_score?.toFixed(1)}</td>
                <td style={{ fontFamily: 'monospace' }}>{item.altman_z_score?.toFixed(1)}</td>
                <td><span className={`badge badge-${item.risk_level}`}>{item.risk_level}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="modal-overlay" onClick={() => { setSelectedItem(null); setAiResult(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.company_name} - {selectedItem.fiscal_year}</h2>
              <button className="btn-close" onClick={() => { setSelectedItem(null); setAiResult(null); }}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Overall Fraud Score</span>
                  <span className="detail-value" style={{ fontSize: '24px', fontWeight: 700 }}>{(selectedItem.overall_score * 100).toFixed(0)}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Risk Level</span>
                  <span className={`badge badge-${selectedItem.risk_level}`}>{selectedItem.risk_level}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Revenue Manipulation</span>
                  <span className="detail-value">{(selectedItem.revenue_manipulation_score * 100).toFixed(0)}%</span>
                  <div className="score-bar-container">
                    <div className={`score-bar ${selectedItem.revenue_manipulation_score > 0.7 ? 'critical' : selectedItem.revenue_manipulation_score > 0.5 ? 'high' : 'medium'}`} style={{ width: `${selectedItem.revenue_manipulation_score * 100}%` }}></div>
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Expense Manipulation</span>
                  <span className="detail-value">{(selectedItem.expense_manipulation_score * 100).toFixed(0)}%</span>
                  <div className="score-bar-container">
                    <div className={`score-bar ${selectedItem.expense_manipulation_score > 0.7 ? 'critical' : selectedItem.expense_manipulation_score > 0.5 ? 'high' : 'medium'}`} style={{ width: `${selectedItem.expense_manipulation_score * 100}%` }}></div>
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Asset Misstatement</span>
                  <span className="detail-value">{(selectedItem.asset_misstatement_score * 100).toFixed(0)}%</span>
                  <div className="score-bar-container">
                    <div className={`score-bar ${selectedItem.asset_misstatement_score > 0.7 ? 'critical' : selectedItem.asset_misstatement_score > 0.5 ? 'high' : 'medium'}`} style={{ width: `${selectedItem.asset_misstatement_score * 100}%` }}></div>
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Disclosure Score</span>
                  <span className="detail-value">{(selectedItem.disclosure_score * 100).toFixed(0)}%</span>
                  <div className="score-bar-container">
                    <div className={`score-bar ${selectedItem.disclosure_score > 0.7 ? 'critical' : selectedItem.disclosure_score > 0.5 ? 'high' : 'medium'}`} style={{ width: `${selectedItem.disclosure_score * 100}%` }}></div>
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Beneish M-Score</span>
                  <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '18px' }}>{selectedItem.beneish_m_score?.toFixed(2)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Altman Z-Score</span>
                  <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '18px' }}>{selectedItem.altman_z_score?.toFixed(2)}</span>
                </div>
                {selectedItem.red_flags && selectedItem.red_flags.length > 0 && (
                  <div className="detail-item full-width">
                    <span className="detail-label">Red Flags</span>
                    <ul className="ai-list">
                      {selectedItem.red_flags.map((flag, i) => (
                        <li key={i} style={{ borderLeftColor: '#ef4444' }}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="detail-item full-width">
                  <span className="detail-label">Notes</span>
                  <span className="detail-value">{selectedItem.notes}</span>
                </div>
              </div>
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
        <FraudForm item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} />
      )}
    </div>
  );
}

function FraudForm({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    company_name: item?.company_name || '',
    fiscal_year: item?.fiscal_year || 'FY2024',
    overall_score: item?.overall_score || '',
    revenue_manipulation_score: item?.revenue_manipulation_score || '',
    expense_manipulation_score: item?.expense_manipulation_score || '',
    asset_misstatement_score: item?.asset_misstatement_score || '',
    disclosure_score: item?.disclosure_score || '',
    altman_z_score: item?.altman_z_score || '',
    beneish_m_score: item?.beneish_m_score || '',
    risk_level: item?.risk_level || 'medium',
    red_flags: item?.red_flags || [],
    notes: item?.notes || ''
  });
  const [newFlag, setNewFlag] = useState('');

  const addFlag = () => {
    if (newFlag.trim()) {
      setForm({ ...form, red_flags: [...form.red_flags, newFlag.trim()] });
      setNewFlag('');
    }
  };

  const removeFlag = (idx) => {
    setForm({ ...form, red_flags: form.red_flags.filter((_, i) => i !== idx) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      overall_score: parseFloat(form.overall_score),
      revenue_manipulation_score: parseFloat(form.revenue_manipulation_score),
      expense_manipulation_score: parseFloat(form.expense_manipulation_score),
      asset_misstatement_score: parseFloat(form.asset_misstatement_score),
      disclosure_score: parseFloat(form.disclosure_score),
      altman_z_score: parseFloat(form.altman_z_score),
      beneish_m_score: parseFloat(form.beneish_m_score)
    });
  };

  return (
    <div className="modal-overlay form-modal" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item ? 'Edit Fraud Score' : 'New Fraud Score'}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name</label>
                <input value={form.company_name} onChange={(e) => setForm({...form, company_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Fiscal Year</label>
                <input value={form.fiscal_year} onChange={(e) => setForm({...form, fiscal_year: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Overall Score (0-1)</label>
                <input type="number" step="0.01" min="0" max="1" value={form.overall_score} onChange={(e) => setForm({...form, overall_score: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Revenue Manipulation (0-1)</label>
                <input type="number" step="0.01" min="0" max="1" value={form.revenue_manipulation_score} onChange={(e) => setForm({...form, revenue_manipulation_score: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Expense Manipulation (0-1)</label>
                <input type="number" step="0.01" min="0" max="1" value={form.expense_manipulation_score} onChange={(e) => setForm({...form, expense_manipulation_score: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Asset Misstatement (0-1)</label>
                <input type="number" step="0.01" min="0" max="1" value={form.asset_misstatement_score} onChange={(e) => setForm({...form, asset_misstatement_score: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Disclosure Score (0-1)</label>
                <input type="number" step="0.01" min="0" max="1" value={form.disclosure_score} onChange={(e) => setForm({...form, disclosure_score: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Altman Z-Score</label>
                <input type="number" step="0.01" value={form.altman_z_score} onChange={(e) => setForm({...form, altman_z_score: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Beneish M-Score</label>
                <input type="number" step="0.01" value={form.beneish_m_score} onChange={(e) => setForm({...form, beneish_m_score: e.target.value})} />
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
              <div className="form-group full-width">
                <label>Red Flags</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input value={newFlag} onChange={(e) => setNewFlag(e.target.value)} placeholder="Add a red flag..." onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFlag())} />
                  <button type="button" className="btn-save" style={{ padding: '8px 16px', whiteSpace: 'nowrap' }} onClick={addFlag}>Add</button>
                </div>
                {form.red_flags.map((flag, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', padding: '6px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', fontSize: '13px' }}>
                    <span style={{ flex: 1 }}>{flag}</span>
                    <button type="button" onClick={() => removeFlag(i)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px' }}>&times;</button>
                  </div>
                ))}
              </div>
              <div className="form-group full-width">
                <label>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
              </div>
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

export default FraudScoring;
