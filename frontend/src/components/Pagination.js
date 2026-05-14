import React from 'react';

/**
 * Pagination controls used by every paginated list in the Forensic Accounting
 * frontend. Receives `page`, `totalPages`, and an `onPageChange(newPage)` callback.
 *
 * Renders a windowed page list when totalPages is large so the UI doesn't
 * blow up at 100+ pages of audit logs or anomalies.
 */
function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const window = 2; // pages around current
  const pages = [];
  const start = Math.max(1, page - window);
  const end = Math.min(totalPages, page + window);
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="pagination" style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={() => onPageChange(1)} disabled={page === 1} aria-label="First page">«</button>
      <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page">‹</button>
      {start > 1 && <span style={{ padding: '0 0.4rem' }}>...</span>}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          aria-current={p === page ? 'page' : undefined}
          style={{
            fontWeight: p === page ? 700 : 400,
            background: p === page ? '#0b78e3' : undefined,
            color: p === page ? '#fff' : undefined,
          }}
        >
          {p}
        </button>
      ))}
      {end < totalPages && <span style={{ padding: '0 0.4rem' }}>...</span>}
      <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Next page">›</button>
      <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages} aria-label="Last page">»</button>
      <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>Page {page} / {totalPages}</span>
    </div>
  );
}

export default Pagination;
