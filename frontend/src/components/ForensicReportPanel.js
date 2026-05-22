import React, { useState } from 'react';

function ForensicReportPanel() {
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState('');

  const downloadPdf = async () => {
    setDownloading(true);
    setStatus('');
    try {
      const token = localStorage.getItem('token');
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';
      const res = await fetch(`${apiBase}/custom-views/forensic-report`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'forensic_investigation_report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('Report downloaded.');
    } catch (e) {
      setStatus(`Failed: ${e.message}`);
    }
    setDownloading(false);
  };

  return (
    <div className="cv-card" data-testid="cv-forensic-report">
      <h3>Forensic Investigation Report</h3>
      <p className="cv-meta">
        Generates a single-page PDF report covering executive summary, top risk entities,
        active detection rules, methodology, and recommendations.
      </p>
      <ul className="cv-bullets">
        <li>SECTION 1 — Executive Summary</li>
        <li>SECTION 2 — Top Risk Entities</li>
        <li>SECTION 3 — Active Detection Rules</li>
        <li>SECTION 4 — Methodology</li>
        <li>SECTION 5 — Recommendation</li>
      </ul>
      <button className="cv-btn cv-btn-primary" onClick={downloadPdf} disabled={downloading}>
        {downloading ? 'Generating...' : 'Download PDF Report'}
      </button>
      {status && <p className="cv-status">{status}</p>}
    </div>
  );
}

export default ForensicReportPanel;
