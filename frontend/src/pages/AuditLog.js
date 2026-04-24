import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:3001/api';

function AuditLog({ token }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 50;

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async (p) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/audit?page=${p}&limit=${limit}`, { headers });
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setItems(data);
      setHasMore(data.length === limit);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(page); }, [page]);

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return d.toLocaleString();
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn-back" onClick={() => navigate('/')}>&#8592;</button>
          <h1>Audit Log</h1>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx} onClick={() => setSelectedItem(item)}>
                <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{formatTimestamp(item.timestamp || item.created_at)}</td>
                <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{item.user || item.user_name || '-'}</td>
                <td>{item.action}</td>
                <td>{item.entity_type}</td>
                <td style={{ fontFamily: 'monospace' }}>{item.entity_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px', alignItems: 'center' }}>
        <button
          className="btn-cancel"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{ opacity: page === 1 ? 0.5 : 1 }}
        >
          Previous
        </button>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>Page {page}</span>
        <button
          className="btn-cancel"
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
          style={{ opacity: !hasMore ? 0.5 : 1 }}
        >
          Next
        </button>
      </div>

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Audit Log Detail</h2>
              <button className="btn-close" onClick={() => setSelectedItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Timestamp</span>
                  <span className="detail-value">{formatTimestamp(selectedItem.timestamp || selectedItem.created_at)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">User</span>
                  <span className="detail-value">{selectedItem.user || selectedItem.user_name || '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Action</span>
                  <span className="detail-value">{selectedItem.action}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Entity Type</span>
                  <span className="detail-value">{selectedItem.entity_type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Entity ID</span>
                  <span className="detail-value">{selectedItem.entity_id}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Full Details</span>
                  <pre style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '16px',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '400px',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(selectedItem, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-close" onClick={() => setSelectedItem(null)} style={{ padding: '8px 24px' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLog;
