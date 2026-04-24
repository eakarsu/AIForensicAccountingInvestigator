import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:3001/api';

const sectionStyle = {
  background: 'rgba(15, 23, 42, 0.4)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px'
};

const sectionTitleStyle = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#94a3b8',
  marginBottom: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const ratioItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
};

const ratioLabelStyle = {
  color: '#94a3b8',
  fontSize: '14px'
};

const ratioValueStyle = {
  color: '#f1f5f9',
  fontSize: '18px',
  fontWeight: 600,
  fontFamily: 'monospace'
};

function FinancialRatios({ token }) {
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  const [form, setForm] = useState({
    current_assets: '',
    cash: '',
    inventory: '',
    total_assets: '',
    current_liabilities: '',
    total_liabilities: '',
    total_equity: '',
    revenue: '',
    cost_of_goods_sold: '',
    operating_income: '',
    net_income: '',
    interest_expense: '',
    accounts_receivable: '',
    average_inventory: ''
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {};
      Object.keys(form).forEach(k => {
        payload[k] = parseFloat(form[k]) || 0;
      });
      const res = await axios.post(`${API}/ratios/calculate`, payload, { headers });
      setResults(res.data);
    } catch (err) {
      alert('Calculation failed: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  const renderInput = (label, field) => (
    <div className="form-group" key={field}>
      <label>{label}</label>
      <input
        type="number"
        step="any"
        value={form[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder="0.00"
      />
    </div>
  );

  const renderRatio = (label, value) => (
    <div style={ratioItemStyle} key={label}>
      <span style={ratioLabelStyle}>{label}</span>
      <span style={ratioValueStyle}>{value != null ? (typeof value === 'number' ? value.toFixed(2) : value) : 'N/A'}</span>
    </div>
  );

  const renderPercentRatio = (label, value) => (
    <div style={ratioItemStyle} key={label}>
      <span style={ratioLabelStyle}>{label}</span>
      <span style={ratioValueStyle}>{value != null ? `${(value * 100).toFixed(2)}%` : 'N/A'}</span>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn-back" onClick={() => navigate('/')}>&#8592;</button>
          <h1>Financial Ratios Calculator</h1>
        </div>
      </div>

      <form onSubmit={handleCalculate}>
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Balance Sheet</div>
          <div className="form-grid">
            {renderInput('Current Assets', 'current_assets')}
            {renderInput('Cash', 'cash')}
            {renderInput('Inventory', 'inventory')}
            {renderInput('Total Assets', 'total_assets')}
            {renderInput('Current Liabilities', 'current_liabilities')}
            {renderInput('Total Liabilities', 'total_liabilities')}
            {renderInput('Total Equity', 'total_equity')}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Income Statement</div>
          <div className="form-grid">
            {renderInput('Revenue', 'revenue')}
            {renderInput('Cost of Goods Sold', 'cost_of_goods_sold')}
            {renderInput('Operating Income', 'operating_income')}
            {renderInput('Net Income', 'net_income')}
            {renderInput('Interest Expense', 'interest_expense')}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Activity</div>
          <div className="form-grid">
            {renderInput('Accounts Receivable', 'accounts_receivable')}
            {renderInput('Average Inventory', 'average_inventory')}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <button type="submit" className="btn-save" style={{ padding: '12px 32px', fontSize: '16px' }} disabled={loading}>
            {loading ? 'Calculating...' : 'Calculate Ratios'}
          </button>
        </div>
      </form>

      {results && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Liquidity Ratios</div>
              {renderRatio('Current Ratio', results.current_ratio)}
              {renderRatio('Quick Ratio', results.quick_ratio)}
              {renderRatio('Cash Ratio', results.cash_ratio)}
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Profitability Ratios</div>
              {renderPercentRatio('Gross Margin', results.gross_margin)}
              {renderPercentRatio('Operating Margin', results.operating_margin)}
              {renderPercentRatio('Net Margin', results.net_margin)}
              {renderPercentRatio('Return on Equity (ROE)', results.roe)}
              {renderPercentRatio('Return on Assets (ROA)', results.roa)}
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Leverage Ratios</div>
              {renderRatio('Debt to Equity', results.debt_to_equity)}
              {renderRatio('Debt to Assets', results.debt_to_assets)}
              {renderRatio('Interest Coverage', results.interest_coverage)}
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Efficiency Ratios</div>
              {renderRatio('Asset Turnover', results.asset_turnover)}
              {renderRatio('Inventory Turnover', results.inventory_turnover)}
              {renderRatio('Receivables Turnover', results.receivables_turnover)}
            </div>
          </div>

          {results.risk_assessment && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Risk Assessment</div>
              <span className={`badge badge-${results.risk_assessment}`}>{results.risk_assessment}</span>
            </div>
          )}

          {results.red_flags && results.red_flags.length > 0 && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Red Flags</div>
              <ul className="ai-list">
                {results.red_flags.map((flag, i) => (
                  <li key={i} style={{ borderLeftColor: '#ef4444' }}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FinancialRatios;
