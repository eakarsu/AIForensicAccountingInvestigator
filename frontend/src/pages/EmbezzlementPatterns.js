import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AIAnalysisDisplay from '../components/AIAnalysisDisplay';

const API = 'http://localhost:3001/api';

function EmbezzlementPatterns({ token }) {
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
      const res = await axios.get(`${API}/embezzlement`, { headers, params: { limit: 100 } });
      setItems(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this case record?')) return;
    try {
      await axios.delete(`${API}/embezzlement/${id}`, { headers });
      setSelectedItem(null); fetchData();
    } catch (err) { alert('Delete failed'); }
  };

  const handleAIAnalyze = async (id) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await axios.post(`${API}/embezzlement/${id}/analyze`, {}, { headers });
      setAiResult(res.data.ai_analysis);
    } catch (err) {
      setAiResult({ error: err.response?.data?.error || 'AI analysis failed' });
    }
    setAiLoading(false);
  };

  const handleSave = async (formData) => {
    try {
      if (editItem) {
        await axios.put(`${API}/embezzlement/${editItem.id}`, formData, { headers });
      } else {
        await axios.post(`${API}/embezzlement`, formData, { headers });
      }
      setShowForm(false); setEditItem(null); fetchData();
    } catch (err) { alert('Save failed: ' + (err.response?.data?.error || err.message)); }
  };

  const openEdit = (item) => { setSelectedItem(null); setEditItem(item); setShowForm(true); };
  const openNew = () => { setEditItem(null); setShowForm(true); };

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (loading) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn-back" onClick={() => navigate('/')}>&#8592;</button>
          <h1>Embezzlement Pattern Recognition</h1>
        </div>
        <button className="btn-new" onClick={openNew}>+ New Case</button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Suspect</th>
              <th>Department</th>
              <th>Pattern Type</th>
              <th>Estimated Loss</th>
              <th>Confidence</th>
              <th>Risk</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(item.ai_analysis); }}>
                <td style={{ fontWeight: 600, color: '#f1f5f9', fontFamily: 'monospace' }}>{item.case_id}</td>
                <td>{item.suspect_name}</td>
                <td>{item.department}</td>
                <td>{item.pattern_type}</td>
                <td className="amount negative">{formatCurrency(item.estimated_loss)}</td>
                <td>
                  <div>{(item.confidence_score * 100).toFixed(0)}%</div>
                  <div className="score-bar-container">
                    <div className={`score-bar ${item.risk_level}`} style={{ width: `${item.confidence_score * 100}%` }}></div>
                  </div>
                </td>
                <td><span className={`badge badge-${item.risk_level}`}>{item.risk_level}</span></td>
                <td><span className={`badge badge-${item.status}`}>{item.status?.replace(/_/g, ' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="modal-overlay" onClick={() => { setSelectedItem(null); setAiResult(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.case_id} - {selectedItem.suspect_name}</h2>
              <button className="btn-close" onClick={() => { setSelectedItem(null); setAiResult(null); }}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Department</span>
                  <span className="detail-value">{selectedItem.department}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Pattern Type</span>
                  <span className="detail-value">{selectedItem.pattern_type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Estimated Loss</span>
                  <span className="detail-value amount negative">{formatCurrency(selectedItem.estimated_loss)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Confidence Score</span>
                  <span className="detail-value">{(selectedItem.confidence_score * 100).toFixed(0)}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Period</span>
                  <span className="detail-value">{new Date(selectedItem.period_start).toLocaleDateString()} - {new Date(selectedItem.period_end).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Evidence Count</span>
                  <span className="detail-value">{selectedItem.evidence_count} pieces</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Risk Level</span>
                  <span className={`badge badge-${selectedItem.risk_level}`}>{selectedItem.risk_level}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className={`badge badge-${selectedItem.status}`}>{selectedItem.status?.replace(/_/g, ' ')}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Description</span>
                  <span className="detail-value">{selectedItem.description}</span>
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
        <EmbezzlementForm item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} />
      )}
    </div>
  );
}

function EmbezzlementForm({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    case_id: item?.case_id || `EMB-${Date.now()}`,
    suspect_name: item?.suspect_name || '',
    department: item?.department || '',
    pattern_type: item?.pattern_type || '',
    estimated_loss: item?.estimated_loss || '',
    period_start: item?.period_start ? new Date(item.period_start).toISOString().split('T')[0] : '',
    period_end: item?.period_end ? new Date(item.period_end).toISOString().split('T')[0] : '',
    evidence_count: item?.evidence_count || 0,
    confidence_score: item?.confidence_score || '',
    status: item?.status || 'under_investigation',
    risk_level: item?.risk_level || 'medium',
    description: item?.description || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      estimated_loss: parseFloat(form.estimated_loss),
      evidence_count: parseInt(form.evidence_count),
      confidence_score: parseFloat(form.confidence_score)
    });
  };

  return (
    <div className="modal-overlay form-modal" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item ? 'Edit Case' : 'New Embezzlement Case'}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Case ID</label>
                <input value={form.case_id} onChange={(e) => setForm({...form, case_id: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Suspect Name</label>
                <input value={form.suspect_name} onChange={(e) => setForm({...form, suspect_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Pattern Type</label>
                <select value={form.pattern_type} onChange={(e) => setForm({...form, pattern_type: e.target.value})} required>
                  <option value="">Select type</option>
                  <option value="Skimming">Skimming</option>
                  <option value="Billing Scheme">Billing Scheme</option>
                  <option value="Ghost Employee">Ghost Employee</option>
                  <option value="Kickback Scheme">Kickback Scheme</option>
                  <option value="Check Tampering">Check Tampering</option>
                  <option value="Revenue Diversion">Revenue Diversion</option>
                  <option value="Data Manipulation">Data Manipulation</option>
                  <option value="Expense Padding">Expense Padding</option>
                  <option value="Asset Misappropriation">Asset Misappropriation</option>
                  <option value="Journal Entry Fraud">Journal Entry Fraud</option>
                  <option value="Purchase Order Fraud">Purchase Order Fraud</option>
                  <option value="Payroll Manipulation">Payroll Manipulation</option>
                  <option value="Wire Transfer Fraud">Wire Transfer Fraud</option>
                  <option value="Refund Fraud">Refund Fraud</option>
                  <option value="Executive Override">Executive Override</option>
                </select>
              </div>
              <div className="form-group">
                <label>Estimated Loss ($)</label>
                <input type="number" step="0.01" value={form.estimated_loss} onChange={(e) => setForm({...form, estimated_loss: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Evidence Count</label>
                <input type="number" value={form.evidence_count} onChange={(e) => setForm({...form, evidence_count: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Period Start</label>
                <input type="date" value={form.period_start} onChange={(e) => setForm({...form, period_start: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Period End</label>
                <input type="date" value={form.period_end} onChange={(e) => setForm({...form, period_end: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Confidence Score (0-1)</label>
                <input type="number" step="0.01" min="0" max="1" value={form.confidence_score} onChange={(e) => setForm({...form, confidence_score: e.target.value})} required />
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
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                  <option value="under_investigation">Under Investigation</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="dismissed">Dismissed</option>
                  <option value="prosecuted">Prosecuted</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
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

export default EmbezzlementPatterns;
