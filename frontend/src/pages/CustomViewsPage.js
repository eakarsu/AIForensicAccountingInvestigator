import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import AnomalyScatterChart from '../components/AnomalyScatterChart';
import EntityRiskHeatmap from '../components/EntityRiskHeatmap';
import ForensicReportPanel from '../components/ForensicReportPanel';
import DetectionRulesEditor from '../components/DetectionRulesEditor';
import './CustomViews.css';

function CustomViewsPage() {
  const [scatter, setScatter] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, h] = await Promise.all([
          api.get('/custom-views/anomaly-scatter'),
          api.get('/custom-views/entity-risk-heatmap'),
        ]);
        if (!alive) return;
        setScatter(s.data);
        setHeatmap(h.data);
      } catch (e) {
        if (!alive) return;
        setLoadErr(e.message || 'failed to load');
      }
    })();
    return () => { alive = false; };
  }, []);

  const sidebarLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/benford', label: "Benford's Law" },
    { to: '/anomalies', label: 'Anomalies' },
    { to: '/embezzlement', label: 'Embezzlement' },
    { to: '/fraud', label: 'Fraud Scoring' },
    { to: '/ratios', label: 'Financial Ratios' },
    { to: '/reports', label: 'Reports' },
    { to: '/network', label: 'Network' },
    { to: '/ai-center', label: 'AI Center' },
    { to: '/custom-views', label: 'Forensic Views' },
  ];

  return (
    <div className="cv-layout" data-testid="custom-views-page">
      <aside className="cv-sidebar" data-testid="forensic-views-sidebar">
        <h4>Forensic Views</h4>
        {sidebarLinks.map((l) => (
          <Link key={l.to} to={l.to} className={location.pathname === l.to ? 'cv-active' : ''}>
            {l.label}
          </Link>
        ))}
      </aside>
      <main className="cv-main">
        <h1>Forensic Views</h1>
        <p className="cv-meta">
          Two visualizations and two operational tools that compose into a single forensic console:
          transaction-anomaly scatter, entity x risk-category heatmap, PDF report export, and a
          detection-rules editor.
        </p>
        {loadErr && <div className="cv-status cv-error">Load error: {loadErr}</div>}
        <div className="cv-grid">
          {scatter && <AnomalyScatterChart data={scatter} />}
          {heatmap && <EntityRiskHeatmap data={heatmap} />}
          <ForensicReportPanel />
          <DetectionRulesEditor />
        </div>
      </main>
    </div>
  );
}

export default CustomViewsPage;
