'use strict';

function evaluateEvidenceCase(input = {}) {
  const errors = [];
  const evidence = Array.isArray(input.evidence) ? input.evidence : [];
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const hypotheses = Array.isArray(input.hypotheses) ? input.hypotheses : [];
  if (!evidence.length) errors.push('evidence is required');
  if (!transactions.length) errors.push('transactions is required');
  const evidenceIds = new Set();
  for (const item of evidence) {
    if (!item.id || evidenceIds.has(String(item.id))) errors.push('evidence ids must be unique and non-empty');
    evidenceIds.add(String(item.id));
    if (!/^[a-f0-9]{64}$/i.test(item.sha256 || '')) errors.push(`evidence ${item.id || '?'} requires a SHA-256 hash`);
    if (!item.source || !item.acquiredAt || !item.custodian) errors.push(`evidence ${item.id || '?'} lacks custody metadata`);
  }
  let debits = 0;
  let credits = 0;
  const transactionIds = new Set();
  const duplicates = [];
  for (const transaction of transactions) {
    if (!transaction.id || transactionIds.has(String(transaction.id))) duplicates.push(transaction.id);
    transactionIds.add(String(transaction.id));
    if (!evidenceIds.has(String(transaction.evidenceId))) errors.push(`transaction ${transaction.id || '?'} lacks a valid evidence citation`);
    debits += Number(transaction.debit || 0);
    credits += Number(transaction.credit || 0);
  }
  const citationCoverage = hypotheses.length ? hypotheses.filter((hypothesis) =>
    Array.isArray(hypothesis.evidenceIds) && hypothesis.evidenceIds.length && hypothesis.evidenceIds.every((id) => evidenceIds.has(String(id)))
  ).length / hypotheses.length : 1;
  if (hypotheses.some((hypothesis) => /guilty|criminal|fraudster/i.test(hypothesis.conclusion || ''))) {
    errors.push('hypotheses must not contain unsupported accusations or legal conclusions');
  }
  return {
    errors,
    result: {
      reconciliation: { debits, credits, difference: debits - credits, balanced: Math.abs(debits - credits) < 0.01 },
      duplicateTransactionIds: duplicates,
      citationCoverage,
      leads: transactions.filter((transaction) => Math.abs(Number(transaction.amount || transaction.debit || transaction.credit || 0)) >= Number(input.materialityThreshold || Infinity)).map((transaction) => ({ transactionId: transaction.id, label: 'review-lead-not-finding' })),
      decision: !errors.length && citationCoverage === 1 ? 'reviewable' : 'revise'
    },
    assumptions: ['normalization preserves original evidence references', 'automated leads are not accusations or findings'],
    uncertainty: { ocrVerified: false, entityResolutionReviewerAgreementRequired: true, investigatorSignoffRequired: true }
  };
}

module.exports = { evaluateEvidenceCase };
