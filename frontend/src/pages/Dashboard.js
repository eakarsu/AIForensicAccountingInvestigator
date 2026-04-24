import React from 'react';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    id: 'benford',
    title: "Benford's Law Analysis",
    description: 'Detect anomalies in financial data using first-digit distribution analysis. Identify fabricated numbers and manipulated records through statistical validation.',
    icon: '#',
    path: '/benford',
    color: 'benford',
    stats: [
      { value: '15', label: 'Analyses' },
      { value: '6', label: 'Critical' },
    ]
  },
  {
    id: 'anomaly',
    title: 'Transaction Anomaly Detection',
    description: 'AI-powered detection of suspicious transactions including structuring, shell company payments, ghost employees, and threshold avoidance patterns.',
    icon: '!',
    path: '/anomalies',
    color: 'anomaly',
    stats: [
      { value: '15', label: 'Anomalies' },
      { value: '5', label: 'Critical' },
    ]
  },
  {
    id: 'embezzlement',
    title: 'Embezzlement Pattern Recognition',
    description: 'Identify and track embezzlement schemes including skimming, billing fraud, ghost employees, kickbacks, and asset misappropriation patterns.',
    icon: '&',
    path: '/embezzlement',
    color: 'embezzlement',
    stats: [
      { value: '15', label: 'Cases' },
      { value: '$12M+', label: 'Total Loss' },
    ]
  },
  {
    id: 'fraud',
    title: 'Financial Statement Fraud Scoring',
    description: 'Comprehensive fraud risk scoring using Beneish M-Score, Altman Z-Score, and AI analysis to identify financial statement manipulation.',
    icon: '%',
    path: '/fraud',
    color: 'fraud',
    stats: [
      { value: '15', label: 'Companies' },
      { value: '4', label: 'Critical' },
    ]
  },
  {
    id: 'ratios',
    title: 'Financial Ratios Calculator',
    description: 'Calculate and analyze key financial ratios including liquidity, profitability, leverage, and efficiency metrics to assess financial health.',
    icon: '\u00F7',
    path: '/ratios',
    color: 'ratios',
    stats: [
      { value: '14', label: 'Ratios' },
      { value: '4', label: 'Categories' },
    ]
  },
  {
    id: 'reports',
    title: 'Investigation Reports',
    description: 'Create, manage, and track forensic investigation reports with findings, recommendations, and evidence documentation.',
    icon: '\u00A7',
    path: '/reports',
    color: 'reports',
    stats: [
      { value: '8', label: 'Reports' },
      { value: '3', label: 'Active' },
    ]
  },
  {
    id: 'import',
    title: 'Data Import',
    description: 'Import transaction data from CSV files for analysis. Validate, preview, and bulk-import financial records into the system.',
    icon: '\u2191',
    path: '/import',
    color: 'import',
    stats: [
      { value: 'CSV', label: 'Format' },
      { value: 'Bulk', label: 'Import' },
    ]
  },
  {
    id: 'audit',
    title: 'Audit Log',
    description: 'Track all system activities including data modifications, exports, imports, and user actions for compliance and accountability.',
    icon: '\u2630',
    path: '/audit',
    color: 'audit',
    stats: [
      { value: '100+', label: 'Events' },
      { value: '24/7', label: 'Tracking' },
    ]
  }
];

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="dashboard-header">
        <h1>Investigation Dashboard</h1>
        <p>AI-powered forensic accounting analysis and fraud detection platform</p>
      </div>

      <div className="dashboard-grid">
        {features.map((feature) => (
          <div
            key={feature.id}
            className={`dashboard-card ${feature.color}`}
            onClick={() => navigate(feature.path)}
          >
            <div className={`card-icon ${feature.color}`}>
              {feature.icon}
            </div>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
            <div className="card-stats">
              {feature.stats.map((stat, i) => (
                <div key={i} className="card-stat">
                  <span className="card-stat-value">{stat.value}</span>
                  <span className="card-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
