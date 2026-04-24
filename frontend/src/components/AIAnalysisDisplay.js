import React from 'react';

function AIAnalysisDisplay({ analysis }) {
  if (!analysis) return null;

  if (analysis.error) {
    return (
      <div className="ai-analysis-container">
        <div className="ai-analysis-header">
          <span className="ai-badge">AI</span>
          <h3>Analysis Result</h3>
        </div>
        <div className="ai-error">{analysis.error}</div>
      </div>
    );
  }

  // If it's just a text analysis
  if (analysis.analysis && !analysis.summary) {
    return (
      <div className="ai-analysis-container">
        <div className="ai-analysis-header">
          <span className="ai-badge">AI</span>
          <h3>Analysis Result</h3>
        </div>
        <div className="ai-text">{analysis.analysis}</div>
      </div>
    );
  }

  const renderArray = (arr) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
    return (
      <ul className="ai-list">
        {arr.map((item, i) => (
          <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>
        ))}
      </ul>
    );
  };

  const renderField = (label, value) => {
    if (!value) return null;
    if (Array.isArray(value)) {
      return (
        <div className="ai-section">
          <div className="ai-section-title">{label}</div>
          {renderArray(value)}
        </div>
      );
    }
    return (
      <div className="ai-section">
        <div className="ai-section-title">{label}</div>
        <div className="ai-summary">{String(value)}</div>
      </div>
    );
  };

  return (
    <div className="ai-analysis-container">
      <div className="ai-analysis-header">
        <span className="ai-badge">AI</span>
        <h3>AI-Powered Analysis</h3>
      </div>

      {analysis.summary && (
        <div className="ai-summary">{analysis.summary}</div>
      )}

      {analysis.confidence && (
        <div className="ai-section">
          <div className="ai-section-title">Confidence Level</div>
          <span className={`ai-confidence ${analysis.confidence}`}>
            {analysis.confidence === 'high' ? 'HIGH' : analysis.confidence === 'medium' ? 'MEDIUM' : 'LOW'} Confidence
          </span>
        </div>
      )}

      {renderField('Conformity Assessment', analysis.conformity_assessment)}
      {renderField('Anomaly Classification', analysis.anomaly_classification)}
      {renderField('Pattern Analysis', analysis.pattern_analysis)}
      {renderField('Scheme Type', analysis.scheme_type)}
      {renderField('Fraud Likelihood', analysis.fraud_likelihood)}
      {renderField('Severity', analysis.severity)}
      {renderField('Evidence Strength', analysis.evidence_strength)}
      {renderField('Estimated Total Exposure', analysis.estimated_total_exposure)}
      {renderField('Suspicious Digits', analysis.suspicious_digits)}
      {renderField('Risk Indicators', analysis.risk_indicators)}
      {renderField('Key Concerns', analysis.key_concerns)}
      {renderField('Similar Patterns', analysis.similar_patterns)}
      {renderField('Manipulation Areas', analysis.manipulation_areas)}
      {renderField('Beneish M-Score Interpretation', analysis.beneish_interpretation)}
      {renderField('Altman Z-Score Interpretation', analysis.altman_interpretation)}
      {renderField('Detailed Findings', analysis.detailed_findings)}
      {renderField('Recommendation', analysis.recommendation)}
    </div>
  );
}

export default AIAnalysisDisplay;
