'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontend = path.resolve(__dirname, '../../frontend/src');
const backend = path.resolve(__dirname, '../src');
const read = (relative) => fs.readFileSync(path.join(frontend, relative), 'utf8');
const readBackend = (relative) => fs.readFileSync(path.join(backend, relative), 'utf8');

test('native UI acceptance contracts are mounted', async (t) => {
  await t.test('demo login is a visible one-click action', () => {
    const login = read('pages/Login.js');
    assert.match(login, /Log In as Demo/);
    assert.match(login, /\/auth\/demo/);
    assert.doesNotMatch(login, /REACT_APP_DEMO_PASSWORD/);
  });

  await t.test('every mounted freeform AI workbench has complete examples, explicit generation, cancel, retry, and history', () => {
    for (const file of ['pages/AICenter.js', 'pages/Batch03Features.js', 'pages/ExtrasTools.js', 'pages/NetworkAnalysis.js']) {
      const source = read(file);
      assert.match(source, /Generate with OpenRouter/, `${file} must name the provider action`);
      assert.match(source, /Cancel/, `${file} must expose cancellation`);
      assert.match(source, /Retry/, `${file} must expose retry`);
      assert.match(source, /history/i, `${file} must render successful history`);
    }
    const center = read('pages/AICenter.js');
    assert.equal((center.match(/label:'/g) || []).length, 3, 'AI Center has three complete scenarios');
    assert.match(center, /case-select/);
    assert.match(center, /Evidence loaded from selected saved case/);
    assert.match(center, /readOnly/);
    assert.match(center, /data-testid="chain-of-custody-gate"/);
    assert.match(center, /request form is not mounted until this signed-in actor has a genuine saved case/);

    const batch = read('pages/Batch03Features.js');
    assert.equal((batch.match(/label: '/g) || []).length, 3, 'Batch workbench has three complete scenarios');
    for (const field of ['objective', 'sourceId', 'context', 'constraints', 'desired_output']) {
      assert.match(batch, new RegExp(`${field}: example\\.${field === 'sourceId' ? 'sourceId' : field}|${field}: source`), `Batch preset fills ${field}`);
    }
    assert.match(batch, /selectedSource \|\| sources/);
  });

  await t.test('record pages show centered native details with Edit, Delete, Cancel, provider generation, cancellation, and retry', () => {
    for (const file of ['pages/BenfordAnalysis.js', 'pages/AnomalyDetection.js', 'pages/EmbezzlementPatterns.js', 'pages/FraudScoring.js']) {
      const source = read(file);
      for (const contract of ['modal-overlay', '>Cancel<', '>Edit<', '>Delete<', 'Generate with OpenRouter', 'Cancel AI', '>Retry<']) {
        assert.ok(source.includes(contract), `${file} missing ${contract}`);
      }
    }
    const css = read('App.css');
    assert.match(css, /\.modal-overlay\s*\{[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;/);
  });

  await t.test('native record list failures are visible and retryable', () => {
    for (const file of ['pages/BenfordAnalysis.js', 'pages/AnomalyDetection.js', 'pages/EmbezzlementPatterns.js', 'pages/FraudScoring.js', 'pages/InvestigationReports.js']) {
      const source = read(file);
      assert.match(source, /loadError/);
      assert.match(source, />Retry</);
    }
  });

  await t.test('public health check precedes the authenticated Batch 03 catch-all', () => {
    const server = readBackend('server.js');
    const health = server.indexOf("app.get('/api/health'");
    const authenticatedCatchAll = server.indexOf("app.use('/api', aiRateLimiter");
    assert.ok(health >= 0 && authenticatedCatchAll >= 0 && health < authenticatedCatchAll);
  });
});
