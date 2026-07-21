'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const{evaluateEvidenceCase}=require('../src/domain/evidenceCase');
const evidence={id:'e1',sha256:'a'.repeat(64),source:'bank',acquiredAt:'2026-01-01',custodian:'c1'};const valid={evidence:[evidence],transactions:[{id:'t1',evidenceId:'e1',debit:10,credit:10}],hypotheses:[{id:'h1',evidenceIds:['e1'],conclusion:'requires review'}]};
test('reconciles transactions and measures citation coverage',()=>{const x=evaluateEvidenceCase(valid);assert.deepEqual(x.errors,[]);assert.equal(x.result.reconciliation.balanced,true);assert.equal(x.result.citationCoverage,1)});
test('requires chain-of-custody hash metadata',()=>{const x=evaluateEvidenceCase({...valid,evidence:[{...evidence,sha256:'bad'}]});assert.ok(x.errors.some(e=>e.includes('SHA-256')))});
test('blocks accusatory conclusions',()=>{const x=evaluateEvidenceCase({...valid,hypotheses:[{evidenceIds:['e1'],conclusion:'the fraudster is guilty'}]});assert.ok(x.errors.some(e=>e.includes('unsupported accusations')))});
