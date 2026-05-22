const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    feature: 'Shell Company Linkage',
    summary: { linkageScore: 81, relatedVendors: 6, sharedAttributes: 14, escalation: 'Counsel review' },
    signals: [
      { entity: 'Northpoint Advisory LLC', signal: 'Shared bank routing and mailbox', confidence: 0.91 },
      { entity: 'Kestrel Supply Co', signal: 'Common beneficiary and invoice template', confidence: 0.87 },
      { entity: 'Harbor Field Services', signal: 'Dormant registration with recent high-value payments', confidence: 0.82 },
    ],
    nextSteps: [
      'Freeze vendor onboarding changes until beneficial ownership is confirmed.',
      'Compare invoice metadata against email headers and payment rails.',
      'Preserve evidence package for investigative chain of custody.',
    ],
  });
});

module.exports = router;
