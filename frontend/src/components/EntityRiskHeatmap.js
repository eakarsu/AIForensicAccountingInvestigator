import React from 'react';

function colorFor(value, min = 0, max = 100) {
  const stops = ['#0a3d2b', '#1f9d55', '#f5d35a', '#f59e0b', '#ef4444'];
  const t = Math.max(0, Math.min(1, (value - min) / Math.max(1, max - min)));
  const idx = Math.min(stops.length - 1, Math.floor(t * (stops.length - 1)));
  return stops[idx];
}

function EntityRiskHeatmap({ data }) {
  const { rows = [], columns = [], cells = [] } = data || {};
  const cellW = 110;
  const cellH = 34;
  const labelW = 160;
  const headerH = 60;
  const W = labelW + cellW * columns.length + 20;
  const H = headerH + cellH * rows.length + 20;

  const get = (r, c) => cells.find((x) => x.row === r && x.col === c);

  return (
    <div className="cv-card" data-testid="cv-entity-heatmap">
      <h3>Entity x Risk-Category Heatmap</h3>
      <div style={{ overflowX: 'auto' }}>
        <svg width={W} height={H} role="img" aria-label="Entity risk heatmap">
          {columns.map((c, i) => (
            <text
              key={c}
              x={labelW + i * cellW + cellW / 2}
              y={headerH - 12}
              fill="#cbd5e1"
              fontSize="11"
              textAnchor="middle"
              transform={`rotate(-18 ${labelW + i * cellW + cellW / 2} ${headerH - 12})`}
            >
              {c}
            </text>
          ))}
          {rows.map((r, ri) => (
            <g key={r}>
              <text x={labelW - 10} y={headerH + ri * cellH + cellH / 2 + 4} fill="#e2e8f0" fontSize="12" textAnchor="end">{r}</text>
              {columns.map((c, ci) => {
                const cell = get(ri, ci);
                const v = cell ? cell.value : 0;
                return (
                  <g key={`${ri}-${ci}`}>
                    <rect
                      x={labelW + ci * cellW + 1}
                      y={headerH + ri * cellH + 1}
                      width={cellW - 2}
                      height={cellH - 2}
                      fill={colorFor(v)}
                      stroke="#0f172a"
                    >
                      <title>{`${r} • ${c} = ${v}`}</title>
                    </rect>
                    <text
                      x={labelW + ci * cellW + cellW / 2}
                      y={headerH + ri * cellH + cellH / 2 + 4}
                      fill="#0f172a"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {v}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      <div className="cv-legend">
        {[0, 25, 50, 75, 100].map((v) => (
          <span key={v} className="cv-legend-item">
            <span className="cv-swatch" style={{ background: colorFor(v) }} /> {v}
          </span>
        ))}
      </div>
      <p className="cv-meta">Entities: {rows.length} • Risk categories: {columns.length}</p>
    </div>
  );
}

export default EntityRiskHeatmap;
