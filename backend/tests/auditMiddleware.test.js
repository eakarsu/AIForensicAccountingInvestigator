'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

function mockModule(request, exports) {
  const id = require.resolve(request);
  require.cache[id] = { id, filename: id, loaded: true, exports };
  return id;
}

test('audit middleware skips read-only login and governed AI POSTs but records mutations', async () => {
  const created = [];
  const modelsId = mockModule('../src/models', {
    AuditLog: { create: async (entry) => { created.push(entry); } },
  });
  const auditId = require.resolve('../src/middleware/audit');
  delete require.cache[auditId];
  const auditLogger = require(auditId);
  const app = express();
  app.use(express.json());
  app.use(auditLogger);
  app.post('/api/auth/demo', (_req, res) => res.json({ demo: true }));
  app.post('/api/cf-agentic-investigator', (_req, res) => res.json({ result: 'fixture' }));
  app.post('/api/gap-no-webhooks', (_req, res) => res.json({ result: 'fixture' }));
  app.post('/api/reports', (req, res) => res.status(201).json(req.body));

  const server = await new Promise((resolve) => {
    const value = app.listen(0, '127.0.0.1', () => resolve(value));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/api/auth/demo', '/api/cf-agentic-investigator', '/api/gap-no-webhooks']) {
      const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      assert.equal(response.status, 200);
    }
    const mutation = await fetch(base + '/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"title":"fixture"}' });
    assert.equal(mutation.status, 201);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(created.length, 1);
    assert.equal(created[0].action, 'POST /api/reports');
    assert.deepEqual(created[0].details.body_keys, ['title']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    delete require.cache[auditId];
    delete require.cache[modelsId];
  }
});
