'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

function mockModule(request, exports) {
  const id = require.resolve(request);
  require.cache[id] = { id, filename: id, loaded: true, exports };
  return id;
}

async function serve(router, prefix = '/api') {
  const app = express();
  app.use(express.json());
  app.use(prefix, router);
  const server = await new Promise((resolve) => {
    const value = app.listen(0, '127.0.0.1', () => resolve(value));
  });
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}${prefix}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  return { status: response.status, body: await response.json() };
}

test('native demo and AI contracts use controlled fixtures', async (t) => {
  await t.test('one-click demo login selects an existing account without mutation', async () => {
    const modelsId = mockModule('../src/models', {
      User: {
        findOne: async ({ where }) => ({ id: 2, email: where.email, name: 'Jane Analyst', role: 'analyst', email_verified: true }),
      },
    });
    const authMiddlewareId = mockModule('../src/middleware/auth', {
      authenticateToken: (req, _res, next) => { req.user = { id: 2, role: 'analyst' }; next(); },
      getJwtSecret: () => 'fixture-only-secret-with-sufficient-length',
    });
    const routeId = require.resolve('../src/routes/auth');
    delete require.cache[routeId];
    const fixture = await serve(require(routeId), '/api/auth');
    try {
      const result = await jsonRequest(`${fixture.url}/demo`, { method: 'POST', body: '{}' });
      assert.equal(result.status, 200);
      assert.equal(result.body.demo, true);
      assert.equal(result.body.user.email, 'analyst@forensic.com');
      assert.equal(typeof result.body.token, 'string');
    } finally {
      await fixture.close();
      delete require.cache[routeId];
      delete require.cache[modelsId];
      delete require.cache[authMiddlewareId];
    }
  });

  await t.test('governed feature preserves source and exposes provider failures', async () => {
    let providerResult = { summary: 'Controlled fixture response', next_steps: ['Independent review'] };
    const authId = mockModule('../src/middleware/auth', {
      authenticateToken: (req, _res, next) => { req.user = { id: 2, role: 'analyst' }; next(); },
    });
    const providerId = mockModule('../src/services/openrouter', {
      callOpenRouter: async () => providerResult,
    });
    const routeId = require.resolve('../routes/batch03Gaps');
    delete require.cache[routeId];
    const fixture = await serve(require(routeId));
    const payload = {
      objective: 'Review the saved report',
      source_record: { id: 7, report_number: 'RPT-FIXTURE-007', title: 'Fixture report' },
      context: 'Controlled test context',
      constraints: 'No unsupported conclusions',
      desired_output: 'Source-cited review plan',
    };
    try {
      const success = await jsonRequest(`${fixture.url}/cf-agentic-investigator`, { method: 'POST', body: JSON.stringify(payload) });
      assert.equal(success.status, 200);
      assert.deepEqual(success.body.source_record, payload.source_record);
      assert.equal(success.body.result.summary, 'Controlled fixture response');

      const missing = await jsonRequest(`${fixture.url}/cf-agentic-investigator`, { method: 'POST', body: JSON.stringify({ ...payload, source_record: null }) });
      assert.equal(missing.status, 400);
      assert.match(missing.body.error, /saved source record/);

      providerResult = { error: 'OPENROUTER_API_KEY not configured' };
      const unavailable = await jsonRequest(`${fixture.url}/cf-agentic-investigator`, { method: 'POST', body: JSON.stringify(payload) });
      assert.equal(unavailable.status, 503);
      assert.match(unavailable.body.error, /not configured/);
    } finally {
      await fixture.close();
      delete require.cache[routeId];
      delete require.cache[authId];
      delete require.cache[providerId];
    }
  });

  await t.test('record AI failure is returned and never persisted', async () => {
    let updateCount = 0;
    const authId = mockModule('../src/middleware/auth', {
      authenticateToken: (req, _res, next) => { req.user = { id: 2, role: 'analyst' }; next(); },
    });
    const modelsId = mockModule('../src/models', {
      TransactionAnomaly: {
        findByPk: async () => ({
          toJSON: () => ({ id: 11, transaction_id: 'FIXTURE-11' }),
          update: async () => { updateCount += 1; },
        }),
      },
    });
    const providerId = mockModule('../src/services/openrouter', {
      analyzeAnomaly: async () => ({ error: 'OPENROUTER_API_KEY not configured' }),
    });
    mockModule('../src/utils/pagination', { paginate: async () => ({ data: [] }) });
    const routeId = require.resolve('../src/routes/anomaly');
    delete require.cache[routeId];
    const fixture = await serve(require(routeId), '/api/anomalies');
    try {
      const result = await jsonRequest(`${fixture.url}/11/analyze`, { method: 'POST', body: '{}' });
      assert.equal(result.status, 503);
      assert.equal(updateCount, 0);
    } finally {
      await fixture.close();
      delete require.cache[routeId];
      delete require.cache[authId];
      delete require.cache[modelsId];
      delete require.cache[providerId];
    }
  });
});
