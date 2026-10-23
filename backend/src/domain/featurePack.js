'use strict';
// Feature pack wave 35B — pure helpers (no DB/network), unit-testable.
const REPORT_COLUMNS = ['id', 'report_number', 'title', 'investigator_name', 'status', 'priority', 'entity_name', 'total_amount_at_risk'];
const norm = (v) => String(v ?? '').trim().toLowerCase();
function filterReports(records, filters = {}) {
  const list = Array.isArray(records) ? records : [];
  const search = norm(filters.search); const status = norm(filters.status); const priority = norm(filters.priority);
  return list.filter((r) => {
    if (status && norm(r.status) !== status) return false;
    if (priority && norm(r.priority) !== priority) return false;
    if (search && ![r.report_number, r.title, r.investigator_name, r.entity_name, r.status].map(norm).join(' ').includes(search)) return false;
    return true;
  });
}
function esc(v) { if (v === null || v === undefined) return ''; const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function toCsv(records, columns = REPORT_COLUMNS) { const list = Array.isArray(records) ? records : []; return [columns.join(','), ...list.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n'); }
function toJsonExport(records) { return { exported_at: new Date().toISOString(), count: (records || []).length, data: records || [] }; }
function renderAiSections(result) {
  if (!result || typeof result !== 'object') return [];
  return Object.entries(result).filter(([k]) => k !== 'source' && k !== 'label').map(([key, value]) => {
    let display;
    if (value === null || value === undefined) display = '';
    else if (Array.isArray(value)) display = value.length ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('; ') : '(none)';
    else if (typeof value === 'object') display = JSON.stringify(value);
    else display = String(value);
    return { label: key, value: display };
  });
}
function hasAiKey(env = process.env) { return Boolean(env.OPENROUTER_API_KEY || env.OPENAI_API_KEY); }
function buildFallback(feature, records) {
  const list = Array.isArray(records) ? records : [];
  const base = { source: 'fallback', aiGenerated: false, label: 'Deterministic fallback (no AI provider configured)' };
  if (feature === 'exposure-summary') {
    return { ...base, feature, total_reports: list.length, total_amount_at_risk: list.reduce((s, r) => s + Number(r.total_amount_at_risk || 0), 0), zero_exposure_count: list.filter((r) => Number(r.total_amount_at_risk || 0) === 0).length, has_zero_exposure: list.some((r) => Number(r.total_amount_at_risk || 0) === 0) };
  }
  if (feature === 'priority-triage') {
    const high = list.filter((r) => norm(r.priority) === 'high' || norm(r.priority) === 'critical');
    return { ...base, feature, total_reports: list.length, high_priority_count: high.length, needs_attention: high.length > 0, items: high.map((r) => `${r.report_number || r.id}: ${r.title} (${r.priority ?? ''})`) };
  }
  const byStatus = {}; for (const r of list) byStatus[r.status || 'unknown'] = (byStatus[r.status || 'unknown'] || 0) + 1;
  return { ...base, feature: 'case-status-summary', total_reports: list.length, open_count: list.filter((r) => norm(r.status) === 'open').length, by_status: byStatus };
}
module.exports = { REPORT_COLUMNS, filterReports, toCsv, toJsonExport, renderAiSections, hasAiKey, buildFallback, AI_FEATURES: ['case-status-summary', 'exposure-summary', 'priority-triage'] };
