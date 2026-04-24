const express = require('express');
const { TransactionAnomaly } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

const REQUIRED_FIELDS = ['transaction_id', 'account_name', 'amount', 'transaction_date', 'anomaly_type', 'anomaly_score'];

function validateTransactions(transactions) {
  const errors = [];

  if (!Array.isArray(transactions)) {
    return { valid: false, errors: ['Request body must be an array of transactions'], validCount: 0, invalidCount: 0 };
  }

  transactions.forEach((txn, index) => {
    const missing = REQUIRED_FIELDS.filter(field => txn[field] === undefined || txn[field] === null || txn[field] === '');
    if (missing.length > 0) {
      errors.push({ index, transaction_id: txn.transaction_id || null, missing_fields: missing });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    validCount: transactions.length - errors.length,
    invalidCount: errors.length
  };
}

// Import transactions
router.post('/transactions', async (req, res) => {
  try {
    const transactions = req.body;
    const validation = validateTransactions(transactions);

    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', validation });
    }

    const created = await TransactionAnomaly.bulkCreate(transactions);
    res.status(201).json({ message: 'Import successful', count: created.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate only
router.post('/validate', (req, res) => {
  try {
    const transactions = req.body;
    const validation = validateTransactions(transactions);
    res.json(validation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
