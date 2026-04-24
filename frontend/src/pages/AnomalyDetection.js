import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AIAnalysisDisplay from '../components/AIAnalysisDisplay';

const API = 'http://localhost:3001/api';

function AnomalyDetection({ token }) {
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
      const res = await axios.get(`${API}/anomalies`, { headers });
      setItems(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this anomaly record?')) return;
    try {
      await axios.delete(`${API}/anomalies/${id}`, { headers });
      setSelectedItem(null);
      fetchData();
    } catch (err) { alert('Delete failed'); }
  };

  const handleAIAnalyze = async (id) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await axios.post(`${API}/anomalies/${id}/analyze`, {}, { headers });
      setAiResult(res.data.ai_analysis);
    } catch (err) {
      setAiResult({ error: err.response?.data?.error || 'AI analysis failed' });
    }
    setAiLoading(false);
  };

  const handleSave = async (formData) => {
    try {
      if (editItem) {
        await axios.put(`${API}/anomalies/${editItem.id}`, formData, { headers });
      } else {
        await axios.post(`${API}/anomalies`, formData, { headers });
      }
      setShowForm(false); setEditItem(null); fetchData();
    } catch (err) { alert('Save failed: ' + (err.response?.data?.error || err.message)); }
  };

  const openEdit = (item) => { setSelectedItem(null); setEditItem(item); setShowForm(true); };
  const openNew = () => { setEditItem(null); setShowForm(true); };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn-back" onClick={() => navigate('/')}>&#8592;</button>
          <h1>Transaction Anomaly Detection</h1>
        </div>
        <button className="btn-new" onClick={openNew}>+ New Anomaly</button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Account</th>
              <th>Amount</th>
              <th>Counterparty</th>
              <th>Anomaly Type</th>
              <th>Score</th>
              <th>Risk</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(item.ai_analysis); }}>
                <td style={{ fontWeight: 600, color: '#f1f5f9', fontFamily: 'monospace' }}>{item.transaction_id}</td>
                <td>{item.account_name}</td>
                <td className="amount negative">{formatCurrency(item.amount)}</td>
                <td>{item.counterparty}</td>
                <td>{item.anomaly_type}</td>
                <td>
                  <div>{(item.anomaly_score * 100).toFixed(0)}%</div>
                  <div className="score-bar-container">
                    <div className={`score-bar ${item.risk_level}`} style={{ width: `${item.anomaly_score * 100}%` }}></div>
                  </div>
                </td>
                <td><span className={`badge badge-${item.risk_level}`}>{item.risk_level}</span></td>
                <td><span className={`badge badge-${item.status}`}>{item.status?.replace('_', ' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="modal-overlay" onClick={() => { setSelectedItem(null); setAiResult(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.transaction_id}</h2>
              <button className="btn-close" onClick={() => { setSelectedItem(null); setAiResult(null); }}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Account</span>
                  <span className="detail-value">{selectedItem.account_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Amount</span>
                  <span className="detail-value amount negative">{formatCurrency(selectedItem.amount)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date</span>
                  <span className="detail-value">{new Date(selectedItem.transaction_date).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{selectedItem.category}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Counterparty</span>
                  <span className="detail-value">{selectedItem.counterparty}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Anomaly Type</span>
                  <span className="detail-value">{selectedItem.anomaly_type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Anomaly Score</span>
                  <span className="detail-value">{(selectedItem.anomaly_score * 100).toFixed(0)}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Risk Level</span>
                  <span className={`badge badge-${selectedItem.risk_level}`}>{selectedItem.risk_level}</span>
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
        <AnomalyForm item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} />
      )}
    </div>
  );
}

function AnomalyForm({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    transaction_id: item?.transaction_id || `TXN-${Date.now()}`,
    account_name: item?.account_name || '',
    amount: item?.amount || '',
    transaction_date: item?.transaction_date ? new Date(item.transaction_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    category: item?.category || '',
    counterparty: item?.counterparty || '',
    anomaly_type: item?.anomaly_type || '',
    anomaly_score: item?.anomaly_score || '',
    description: item?.description || '',
    status: item?.status || 'flagged',
    risk_level: item?.risk_level || 'medium'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, amount: parseFloat(form.amount), anomaly_score: parseFloat(form.anomaly_score) });
  };

  return (
    <div className="modal-overlay form-modal" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item ? 'Edit Anomaly' : 'New Transaction Anomaly'}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Transaction ID</label>
                <input value={form.transaction_id} onChange={(e) => setForm({...form, transaction_id: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Account Name</label>
                <input value={form.account_name} onChange={(e) => setForm({...form, account_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Amount ($)</label>
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Transaction Date</label>
                <input type="date" value={form.transaction_date} onChange={(e) => setForm({...form, transaction_date: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Counterparty</label>
                <input value={form.counterparty} onChange={(e) => setForm({...form, counterparty: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Anomaly Type</label>
                <select value={form.anomaly_type} onChange={(e) => setForm({...form, anomaly_type: e.target.value})} required>
                  <option value="">Select type</option>
                  <option value="Structuring">Structuring</option>
                  <option value="Ghost Employee">Ghost Employee</option>
                  <option value="Shell Company">Shell Company</option>
                  <option value="Threshold Avoidance">Threshold Avoidance</option>
                  <option value="Velocity Anomaly">Velocity Anomaly</option>
                  <option value="Layering">Layering</option>
                  <option value="Duplicate Payment">Duplicate Payment</option>
                  <option value="Revenue Fabrication">Revenue Fabrication</option>
                  <option value="Round-trip">Round-trip</option>
                  <option value="Related Party">Related Party</option>
                  <option value="Fictitious Vendor">Fictitious Vendor</option>
                  <option value="Expense Inflation">Expense Inflation</option>
                  <option value="Price Manipulation">Price Manipulation</option>
                  <option value="Conflict of Interest">Conflict of Interest</option>
                  <option value="Charitable Fraud">Charitable Fraud</option>
                </select>
              </div>
              <div className="form-group">
                <label>Anomaly Score (0-1)</label>
                <input type="number" step="0.01" min="0" max="1" value={form.anomaly_score} onChange={(e) => setForm({...form, anomaly_score: e.target.value})} required />
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
                  <option value="flagged">Flagged</option>
                  <option value="under_review">Under Review</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="dismissed">Dismissed</option>
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

export default AnomalyDetection;
