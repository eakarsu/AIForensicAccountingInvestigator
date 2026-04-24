import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:3001/api';

const SAMPLE_CSV = `transaction_id,account_name,amount,transaction_date,category,counterparty,anomaly_type,anomaly_score,description
TXN-001,Operating Account,15000.00,2024-01-15,Revenue,Acme Corp,none,0.1,Monthly service payment
TXN-002,Payroll Account,8500.50,2024-01-16,Payroll,John Smith,none,0.05,Bi-weekly salary
TXN-003,Operating Account,125000.00,2024-01-17,Vendor Payment,Shell Corp LLC,shell_company,0.85,Large vendor payment - suspicious
TXN-004,Petty Cash,4999.00,2024-01-18,Expense,Cash Withdrawal,structuring,0.72,Just below reporting threshold
TXN-005,Operating Account,3200.00,2024-01-19,Consulting,Global Advisors,round_amount,0.45,Consulting fee payment`;

const EXPECTED_HEADERS = ['transaction_id', 'account_name', 'amount', 'transaction_date', 'category', 'counterparty', 'anomaly_type', 'anomaly_score', 'description'];

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [], error: 'CSV must have at least a header row and one data row.' };

  const headerLine = lines[0].trim();
  const headers = parseLine(headerLine);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return { headers, rows, error: null };
}

function parseLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  values.push(current.trim());
  return values;
}

function DataImport({ token }) {
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [validation, setValidation] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleParse = () => {
    const result = parseCSV(csvText);
    if (result.error) {
      alert(result.error);
      return;
    }
    setParsed(result);
    setValidation(null);
    setImportResult(null);
  };

  const handleValidate = async () => {
    if (!parsed) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/import/validate`, { transactions: parsed.rows }, { headers });
      setValidation(res.data);
    } catch (err) {
      alert('Validation failed: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/import/transactions`, { transactions: parsed.rows }, { headers });
      setImportResult(res.data);
    } catch (err) {
      alert('Import failed: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  const loadSample = () => {
    setCsvText(SAMPLE_CSV);
    setParsed(null);
    setValidation(null);
    setImportResult(null);
  };

  const sectionStyle = {
    background: 'rgba(15, 23, 42, 0.4)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px'
  };

  const isValidated = validation && validation.error_count === 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn-back" onClick={() => navigate('/')}>&#8592;</button>
          <h1>Data Import</h1>
        </div>
        <button className="btn-new" onClick={loadSample}>Load Sample Data</button>
      </div>

      <div style={sectionStyle}>
        <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '12px' }}>
          Paste CSV data below. Expected columns: <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{EXPECTED_HEADERS.join(', ')}</span>
        </div>
        <textarea
          value={csvText}
          onChange={(e) => { setCsvText(e.target.value); setParsed(null); setValidation(null); setImportResult(null); }}
          rows={10}
          style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '8px',
            color: '#e2e8f0',
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '12px',
            resize: 'vertical'
          }}
          placeholder="Paste your CSV data here..."
        />
        <div style={{ marginTop: '12px' }}>
          <button className="btn-save" onClick={handleParse} disabled={!csvText.trim()}>Parse CSV</button>
        </div>
      </div>

      {parsed && (
        <div style={sectionStyle}>
          <h3 style={{ color: '#f1f5f9', marginBottom: '12px' }}>Preview (first 10 rows of {parsed.rows.length} total)</h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {parsed.headers.map((h, i) => <th key={i}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 10).map((row, idx) => (
                  <tr key={idx}>
                    {parsed.headers.map((h, i) => (
                      <td key={i} style={{ fontSize: '13px' }}>{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
            <button className="btn-edit" onClick={handleValidate} disabled={loading}>
              {loading ? 'Validating...' : 'Validate'}
            </button>
          </div>
        </div>
      )}

      {validation && (
        <div style={sectionStyle}>
          <h3 style={{ color: '#f1f5f9', marginBottom: '12px' }}>Validation Results</h3>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Valid: </span>
              <span style={{ color: '#10b981', fontWeight: 600, fontSize: '18px' }}>{validation.valid_count}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Errors: </span>
              <span style={{ color: validation.error_count > 0 ? '#ef4444' : '#10b981', fontWeight: 600, fontSize: '18px' }}>{validation.error_count}</span>
            </div>
          </div>
          {validation.errors && validation.errors.length > 0 && (
            <div>
              <h4 style={{ color: '#f87171', marginBottom: '8px' }}>Error Details</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {validation.errors.map((err, i) => (
                  <li key={i} style={{
                    padding: '8px 12px',
                    marginBottom: '4px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderLeft: '3px solid #ef4444',
                    borderRadius: '4px',
                    color: '#fca5a5',
                    fontSize: '13px'
                  }}>
                    {typeof err === 'string' ? err : `Row ${err.row}: ${err.message || err.error}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {isValidated && (
            <div style={{ marginTop: '12px' }}>
              <button className="btn-save" onClick={handleImport} disabled={loading}>
                {loading ? 'Importing...' : `Import ${validation.valid_count} Records`}
              </button>
            </div>
          )}
        </div>
      )}

      {importResult && (
        <div style={{
          ...sectionStyle,
          borderLeft: '4px solid #10b981'
        }}>
          <h3 style={{ color: '#10b981', marginBottom: '8px' }}>Import Successful</h3>
          <p style={{ color: '#e2e8f0', fontSize: '16px' }}>
            Successfully imported <strong>{importResult.imported_count || importResult.count || parsed.rows.length}</strong> records.
          </p>
        </div>
      )}
    </div>
  );
}

export default DataImport;
