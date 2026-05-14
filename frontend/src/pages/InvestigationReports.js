import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:3001/api';

function InvestigationReports({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      // Backend now returns { data, total, page, totalPages, limit }.
      const res = await axios.get(`${API}/reports`, { headers, params: { limit: 100 } });
      setItems(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this investigation report?')) return;
    try {
      await axios.delete(`${API}/reports/${id}`, { headers });
      setSelectedItem(null); fetchData();
    } catch (err) { alert('Delete failed'); }
  };

  const handleSave = async (formData) => {
    try {
      if (editItem) {
        await axios.put(`${API}/reports/${editItem.id}`, formData, { headers });
      } else {
        await axios.post(`${API}/reports`, formData, { headers });
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
          <h1>Investigation Reports</h1>
        </div>
        <button className="btn-new" onClick={openNew}>+ New Report</button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Report #</th>
              <th>Title</th>
              <th>Investigator</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Amount at Risk</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => setSelectedItem(item)}>
                <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{item.report_number}</td>
                <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{item.title}</td>
                <td>{item.investigator_name}</td>
                <td><span className={`badge badge-${item.priority}`}>{item.priority}</span></td>
                <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                <td style={{ fontFamily: 'monospace' }}>{item.total_amount_at_risk != null ? `$${Number(item.total_amount_at_risk).toLocaleString()}` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.report_number} - {selectedItem.title}</h2>
              <button className="btn-close" onClick={() => setSelectedItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Report Number</span>
                  <span className="detail-value">{selectedItem.report_number}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Investigator</span>
                  <span className="detail-value">{selectedItem.investigator_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Priority</span>
                  <span className={`badge badge-${selectedItem.priority}`}>{selectedItem.priority}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className={`badge badge-${selectedItem.status}`}>{selectedItem.status}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Amount at Risk</span>
                  <span className="detail-value">{selectedItem.total_amount_at_risk != null ? `$${Number(selectedItem.total_amount_at_risk).toLocaleString()}` : '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Period</span>
                  <span className="detail-value">{selectedItem.period_start || '-'} to {selectedItem.period_end || '-'}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Summary</span>
                  <span className="detail-value">{selectedItem.summary}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Findings</span>
                  <span className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{selectedItem.findings}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Recommendations</span>
                  <span className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{selectedItem.recommendations}</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-edit" onClick={() => openEdit(selectedItem)}>Edit</button>
              <button className="btn-delete" onClick={() => handleDelete(selectedItem.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <ReportForm
          item={editItem}
          token={token}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

function ReportForm({ item, token, onSave, onClose }) {
  const headers = { Authorization: `Bearer ${token}` };
  const [form, setForm] = useState({
    report_number: item?.report_number || '',
    title: item?.title || '',
    investigator_name: item?.investigator_name || '',
    status: item?.status || 'draft',
    priority: item?.priority || 'medium',
    summary: item?.summary || '',
    findings: item?.findings || '',
    recommendations: item?.recommendations || '',
    period_start: item?.period_start || '',
    period_end: item?.period_end || '',
    total_amount_at_risk: item?.total_amount_at_risk || ''
  });

  useEffect(() => {
    if (!item) {
      axios.get(`${API}/reports/next-number`, { headers })
        .then(res => setForm(f => ({ ...f, report_number: res.data.next_number || res.data.report_number })))
        .catch(() => {});
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      total_amount_at_risk: form.total_amount_at_risk ? parseFloat(form.total_amount_at_risk) : null
    });
  };

  return (
    <div className="modal-overlay form-modal" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item ? 'Edit Report' : 'New Investigation Report'}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Report Number</label>
                <input value={form.report_number} readOnly style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group">
                <label>Title</label>
                <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Investigator Name</label>
                <input value={form.investigator_name} onChange={(e) => setForm({...form, investigator_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="final">Final</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label>Total Amount at Risk</label>
                <input type="number" step="0.01" value={form.total_amount_at_risk} onChange={(e) => setForm({...form, total_amount_at_risk: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Period Start</label>
                <input type="date" value={form.period_start} onChange={(e) => setForm({...form, period_start: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Period End</label>
                <input type="date" value={form.period_end} onChange={(e) => setForm({...form, period_end: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Summary</label>
                <textarea value={form.summary} onChange={(e) => setForm({...form, summary: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Findings</label>
                <textarea value={form.findings} onChange={(e) => setForm({...form, findings: e.target.value})} rows={4} />
              </div>
              <div className="form-group full-width">
                <label>Recommendations</label>
                <textarea value={form.recommendations} onChange={(e) => setForm({...form, recommendations: e.target.value})} rows={4} />
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

export default InvestigationReports;
