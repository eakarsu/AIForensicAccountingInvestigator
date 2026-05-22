import React, { useEffect, useState } from 'react';

function ShellCompanyLinkage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/shell-company-linkage', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    })
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ error: 'Unable to load shell company linkage.' }));
  }, []);

  if (!data) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="dashboard-header">
        <h1>Shell Company Linkage</h1>
        <p>Beneficial ownership, payment rail, and invoice-template linkage for forensic triage.</p>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><span>Linkage Score</span><strong>{data.summary?.linkageScore}</strong></div>
        <div className="stat-card"><span>Related Vendors</span><strong>{data.summary?.relatedVendors}</strong></div>
        <div className="stat-card"><span>Shared Attributes</span><strong>{data.summary?.sharedAttributes}</strong></div>
        <div className="stat-card"><span>Escalation</span><strong>{data.summary?.escalation}</strong></div>
      </div>
      <div className="dashboard-grid">
        {data.signals?.map((signal) => (
          <div className="dashboard-card fraud" key={signal.entity}>
            <h2>{signal.entity}</h2>
            <p>{signal.signal}</p>
            <div className="card-stats"><div className="card-stat"><span className="card-stat-value">{Math.round(signal.confidence * 100)}%</span><span className="card-stat-label">Confidence</span></div></div>
          </div>
        ))}
      </div>
      <div className="dashboard-card reports">
        <h2>Next Steps</h2>
        <ul>{data.nextSteps?.map((step) => <li key={step}>{step}</li>)}</ul>
      </div>
    </div>
  );
}

export default ShellCompanyLinkage;
