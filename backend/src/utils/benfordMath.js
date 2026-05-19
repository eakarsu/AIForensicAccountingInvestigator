/**
 * Benford's Law math helpers — pre-compute the expected distribution and
 * goodness-of-fit statistics locally so the LLM is asked to *interpret*
 * results rather than do the arithmetic itself.
 *
 * The original implementation handed the entire judgement off to the model;
 * this helper restores the math to code where it belongs and gives the AI
 * a stronger numerical foundation to reason from.
 */

/** Theoretical Benford first-digit probabilities. */
const BENFORD_EXPECTED = {
  1: Math.log10(2),
  2: Math.log10(3 / 2),
  3: Math.log10(4 / 3),
  4: Math.log10(5 / 4),
  5: Math.log10(6 / 5),
  6: Math.log10(7 / 6),
  7: Math.log10(8 / 7),
  8: Math.log10(9 / 8),
  9: Math.log10(10 / 9),
};

/**
 * Compute observed first-digit distribution from an array of numbers.
 * Returns the per-digit counts AND fractions, ignoring non-positive values.
 */
function observedDistribution(numbers) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  let total = 0;
  for (const n of numbers || []) {
    const v = Math.abs(parseFloat(n));
    if (!Number.isFinite(v) || v <= 0) continue;
    // First non-zero significant digit
    const s = v.toString().replace(/[^0-9]/g, '');
    const firstDigit = parseInt((s.match(/[1-9]/) || [])[0], 10);
    if (firstDigit >= 1 && firstDigit <= 9) {
      counts[firstDigit] += 1;
      total += 1;
    }
  }
  const fractions = {};
  for (let d = 1; d <= 9; d++) fractions[d] = total > 0 ? counts[d] / total : 0;
  return { counts, fractions, total };
}

/**
 * Pearson chi-square statistic between observed counts and expected Benford
 * frequencies. df = 8 (k-1, k=9 buckets).
 *
 * Returns the statistic, degrees of freedom, and a rough significance bucket
 * based on standard chi-square critical values for df=8.
 */
function chiSquare(counts, total) {
  if (!total) return { statistic: 0, df: 8, significance: 'insufficient_data' };
  let stat = 0;
  for (let d = 1; d <= 9; d++) {
    const expected = total * BENFORD_EXPECTED[d];
    const observed = counts[d] || 0;
    if (expected > 0) stat += Math.pow(observed - expected, 2) / expected;
  }
  // Critical values for df=8.
  let significance;
  if (stat < 13.36) significance = 'p>0.10 (not significant)';
  else if (stat < 15.51) significance = 'p<0.10';
  else if (stat < 20.09) significance = 'p<0.05';
  else if (stat < 26.12) significance = 'p<0.001 (highly significant)';
  else significance = 'p<<0.001 (extremely significant)';
  return { statistic: parseFloat(stat.toFixed(4)), df: 8, significance };
}

/**
 * Per-digit z-test against the binomial distribution implied by Benford. A
 * |z| > 2 flags an individually anomalous digit.
 */
function digitZScores(counts, total) {
  if (!total) return {};
  const z = {};
  for (let d = 1; d <= 9; d++) {
    const p = BENFORD_EXPECTED[d];
    const expected = total * p;
    const stddev = Math.sqrt(total * p * (1 - p));
    const observed = counts[d] || 0;
    z[d] = stddev > 0 ? parseFloat(((observed - expected) / stddev).toFixed(3)) : 0;
  }
  return z;
}

/**
 * High-level: take an existing Benford record (counts already provided) or
 * an array of raw numbers and return a single object suitable for storing
 * alongside the row's `ai_analysis`.
 */
function analyzeBenfordRecord(record, rawNumbers) {
  let counts;
  let total;

  if (rawNumbers && Array.isArray(rawNumbers) && rawNumbers.length > 0) {
    const obs = observedDistribution(rawNumbers);
    counts = obs.counts;
    total = obs.total;
  } else if (record && record.digit_distribution && typeof record.digit_distribution === 'object') {
    // Treat stored fractions as counts*total — best-effort if total exists.
    counts = {};
    total = parseInt(record.total_transactions || 0, 10);
    for (let d = 1; d <= 9; d++) {
      const v = record.digit_distribution[d] || record.digit_distribution[String(d)] || 0;
      // If values look like fractions (<= 1), convert to counts using total.
      counts[d] = v <= 1 && total > 0 ? Math.round(v * total) : Math.round(v);
    }
    if (!total) total = Object.values(counts).reduce((a, b) => a + b, 0);
  } else {
    return null;
  }

  const chi = chiSquare(counts, total);
  const z = digitZScores(counts, total);
  const suspicious = Object.entries(z)
    .filter(([, v]) => Math.abs(v) >= 2)
    .map(([digit, v]) => ({ digit: parseInt(digit, 10), z_score: v }));

  return {
    expected: BENFORD_EXPECTED,
    counts,
    total,
    chi_square: chi,
    digit_z_scores: z,
    suspicious_digits: suspicious
  };
}

module.exports = {
  BENFORD_EXPECTED,
  observedDistribution,
  chiSquare,
  digitZScores,
  analyzeBenfordRecord
};
