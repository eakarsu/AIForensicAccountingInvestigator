import React, { useMemo } from 'react';

const SEVERITY_COLOR = {
  low: '#3aa0ff',
  medium: '#f5d35a',
  high: '#f59e0b',
  critical: '#ef4444',
};

function AnomalyScatterChart({ data }) {
  const { scatter = [], line = [], x_label, y_label } = data || {};
  const W = 720;
  const H = 360;
  const pad = { l: 60, r: 20, t: 30, b: 40 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (!scatter.length) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
    const xs = scatter.map((d) => d.x);
    const ys = scatter.map((d) => d.y);
    return {
      xMin: Math.min(...xs),
      xMax: Math.max(...xs),
      yMin: Math.min(...ys),
      yMax: Math.max(...ys),
    };
  }, [scatter]);

  const sx = (x) => pad.l + ((x - xMin) / Math.max(1, xMax - xMin)) * iw;
  const sy = (y) => pad.t + ih - ((y - yMin) / Math.max(0.0001, yMax - yMin)) * ih;

  const linePoints = useMemo(() => {
    if (!line.length) return '';
    const max = Math.max(...line.map((d) => d.mean_score));
    const min = Math.min(...line.map((d) => d.mean_score));
    return line
      .map((d, i) => {
        const lx = pad.l + (i / Math.max(1, line.length - 1)) * iw;
        const ly = pad.t + ih - ((d.mean_score - min) / Math.max(0.0001, max - min)) * ih;
        return `${lx.toFixed(1)},${ly.toFixed(1)}`;
      })
      .join(' ');
  }, [line, iw, ih, pad.l, pad.t]);

  return (
    <div className="cv-card" data-testid="cv-anomaly-scatter">
      <h3>Transaction Anomaly Scatter</h3>
      <svg width={W} height={H} role="img" aria-label="Anomaly scatter">
        <rect x={pad.l} y={pad.t} width={iw} height={ih} fill="#0f172a" stroke="#334155" />
        <line x1={pad.l} y1={pad.t + ih} x2={pad.l + iw} y2={pad.t + ih} stroke="#475569" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ih} stroke="#475569" />
        {scatter.map((p, i) => (
          <circle
            key={i}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={4 + (p.z || 0) / 40}
            fill={SEVERITY_COLOR[p.severity] || '#94a3b8'}
            opacity={0.85}
          >
            <title>{`${p.transaction_id} • $${p.x.toLocaleString()} • z=${p.y}`}</title>
          </circle>
        ))}
        {linePoints && (
          <polyline points={linePoints} fill="none" stroke="#22d3ee" strokeWidth={2} opacity={0.7} />
        )}
        <text x={pad.l + iw / 2} y={H - 8} fill="#cbd5e1" fontSize="12" textAnchor="middle">{x_label || 'Amount'}</text>
        <text x={14} y={pad.t + ih / 2} fill="#cbd5e1" fontSize="12" transform={`rotate(-90 14 ${pad.t + ih / 2})`} textAnchor="middle">{y_label || 'Z-Score'}</text>
      </svg>
      <div className="cv-legend">
        {Object.entries(SEVERITY_COLOR).map(([k, v]) => (
          <span key={k} className="cv-legend-item">
            <span className="cv-swatch" style={{ background: v }} /> {k}
          </span>
        ))}
        <span className="cv-legend-item" style={{ marginLeft: 12 }}>
          <span className="cv-swatch" style={{ background: '#22d3ee' }} /> daily mean (line)
        </span>
      </div>
      <p className="cv-meta">Points: {scatter.length} • Series days: {line.length}</p>
    </div>
  );
}

export default AnomalyScatterChart;
