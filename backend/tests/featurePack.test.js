'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { filterReports, toCsv, renderAiSections, buildFallback, hasAiKey } = require('../src/domain/featurePack');
const rows = [
  { id: 1, report_number: 'RPT-2026-001', title: 'Ledger review', investigator_name: 'Ada', status: 'open', priority: 'high', entity_name: 'Acme', total_amount_at_risk: 0 },
  { id: 2, report_number: 'RPT-2026-002', title: 'Payroll audit', investigator_name: 'Ben', status: 'closed', priority: 'low', entity_name: 'Beta', total_amount_at_risk: 500 },
];
test('search/filter narrows reports by text, status and priority', () => {
  assert.equal(filterReports(rows, { search: 'ledger' }).length, 1);
  assert.equal(filterReports(rows, { status: 'closed' })[0].title, 'Payroll audit');
  assert.equal(filterReports(rows, { priority: 'missing' }).length, 0);
});
test('CSV export preserves 0 and escapes commas', () => {
  assert.match(toCsv(rows), /RPT-2026-001,Ledger review,Ada,open,high,Acme,0/);
  assert.equal(toCsv([{ id: 1, report_number: 'R,1', title: 'x' }]).split('\n')[1].startsWith('1,"R,1",x'), true);
});
test('fallback AI is labelled aiGenerated:false and preserves false/0', () => {
  const r = buildFallback('exposure-summary', rows);
  assert.equal(r.source, 'fallback'); assert.equal(r.aiGenerated, false); assert.equal(r.zero_exposure_count, 1);
  assert.deepEqual(renderAiSections({ ok: false, count: 0, note: '' }).map((s) => s.value), ['false', '0', '']);
  assert.equal(hasAiKey({}), false); assert.equal(hasAiKey({ OPENROUTER_API_KEY: 'x' }), true);
});
