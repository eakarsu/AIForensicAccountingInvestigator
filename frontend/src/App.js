import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BenfordAnalysis from './pages/BenfordAnalysis';
import AnomalyDetection from './pages/AnomalyDetection';
import EmbezzlementPatterns from './pages/EmbezzlementPatterns';
import FraudScoring from './pages/FraudScoring';
import FinancialRatios from './pages/FinancialRatios';
import InvestigationReports from './pages/InvestigationReports';
import AuditLog from './pages/AuditLog';
import DataImport from './pages/DataImport';
import NetworkAnalysis from './pages/NetworkAnalysis';
import AICenter from './pages/AICenter';
import ExtrasTools from './pages/ExtrasTools'; // Apply pass 5
import ShellCompanyLinkage from './pages/ShellCompanyLinkage';
import './App.css';

import Batch03Features from './pages/Batch03Features';
import CustomViewsPage from './pages/CustomViewsPage';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

const navSections = [
  {
    title: 'Overview',
    links: [
      { to: '/', label: 'Dashboard', end: true },
    ],
  },
  {
    title: 'Core Analysis',
    links: [
      { to: '/benford', label: 'Benford Analysis' },
      { to: '/anomalies', label: 'Transaction Anomalies' },
      { to: '/embezzlement', label: 'Embezzlement Patterns' },
      { to: '/fraud', label: 'Fraud Scoring' },
      { to: '/ratios', label: 'Financial Ratios' },
    ],
  },
  {
    title: 'Investigation Ops',
    links: [
      { to: '/reports', label: 'Investigation Reports' },
      { to: '/import', label: 'Data Import' },
      { to: '/audit', label: 'Audit Log' },
    ],
  },
  {
    title: 'Graph & Entity',
    links: [
      { to: '/network', label: 'Network Analysis' },
      { to: '/shell-company-linkage', label: 'Shell Company Linkage' },
      { to: '/insights/timeline', label: 'Investigation Timeline' },
      { to: '/custom-views', label: 'Custom Views' },
    ],
  },
  {
    title: 'AI Workbench',
    links: [
      { to: '/ai-center', label: 'AI Center' },
      { to: '/extras', label: 'Extras Tools' },
      { to: '/batch03', label: 'Batch 03 Features' },
    ],
  },
  {
    title: 'Codex Lab',
    links: [
      { to: '/codex/custom-viz', label: 'Custom Visualization' },
      { to: '/codex/operations', label: 'Operations' },
    ],
  },
];

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-logo">AI</div>
            <div>
              <div className="sidebar-title">Forensic Accounting</div>
              <div className="sidebar-subtitle">Investigator</div>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Application navigation">
            {navSections.map((section) => (
              <div className="sidebar-section" key={section.title}>
                <div className="sidebar-section-title">{section.title}</div>
                {section.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  >
                    <span className="sidebar-link-dot" />
                    <span>{link.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <div className="content-shell">
          <header className="topbar">
            <div>
              <div className="topbar-kicker">AI Forensic Accounting Investigator</div>
              <h1>Investigation Workspace</h1>
            </div>
            <div className="nav-right">
            <span className="nav-user">{user?.name}</span>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
          </header>

          <main className="main-content">
          <Routes>
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

          <Route path="/batch03" element={<Batch03Features />} />
            <Route path="/" element={<Dashboard />} />
            {/* token is no longer threaded as a prop — pages use the central
                src/services/api client which injects it from localStorage. */}
            <Route path="/benford" element={<BenfordAnalysis token={token} />} />
            <Route path="/anomalies" element={<AnomalyDetection token={token} />} />
            <Route path="/embezzlement" element={<EmbezzlementPatterns token={token} />} />
            <Route path="/fraud" element={<FraudScoring token={token} />} />
            <Route path="/ratios" element={<FinancialRatios token={token} />} />
            <Route path="/reports" element={<InvestigationReports token={token} />} />
            <Route path="/audit" element={<AuditLog token={token} />} />
            <Route path="/import" element={<DataImport token={token} />} />
            <Route path="/network" element={<NetworkAnalysis />} />
            <Route path="/shell-company-linkage" element={<ShellCompanyLinkage />} />
            <Route path="/ai-center" element={<AICenter />} />
            <Route path="/extras" element={<ExtrasTools />} />{/* Apply pass 5 */}
            <Route path="/custom-views" element={<CustomViewsPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
