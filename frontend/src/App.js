import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import './App.css';

import Batch03Features from './pages/Batch03Features';
import CustomViewsPage from './pages/CustomViewsPage';

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
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <div className="nav-logo">AI</div>
            <span className="nav-title">Forensic Accounting Investigator</span>
          </div>
          <div className="nav-right">
            <span className="nav-user">{user?.name}</span>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </nav>
        <div className="main-content">
          <Routes>
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
            <Route path="/ai-center" element={<AICenter />} />
            <Route path="/extras" element={<ExtrasTools />} />{/* Apply pass 5 */}
            <Route path="/custom-views" element={<CustomViewsPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
