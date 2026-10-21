import { describe, expect, it } from 'vitest';
import { buildLaplaceDistribution, buildTemporalWeightedDistribution, extractLastDigit, normalizeProbabilityVector, rankDigitProbabilities } from '../services/tickNormalizer.js';

describe('tick normalization', () => {
  it('extracts last digit from a 2-decimal price without floats', () => {
    expect(extractLastDigit(123.45, 0.01)).toBe(5);
    expect(extractLastDigit('123.40', 0.01)).toBe(0);
    expect(extractLastDigit('0.00', 0.01)).toBe(0);
  });

  it('keeps precision for trailing zeros and invalid values', () => {
    expect(() => extractLastDigit('abc', 0.01)).toThrow();
    expect(extractLastDigit(99.99, 0.01)).toBe(9);
  });
});

describe('distributions', () => {
  it('returns a valid stable probability vector', () => {
    const digits = [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0];
    const laplace = buildLaplaceDistribution(digits, 1);
    const temporal = buildTemporalWeightedDistribution(digits, 2);
    const normalized = normalizeProbabilityVector(laplace);

    expect(Object.values(normalized).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 5);
    expect(Object.values(temporal).every((v) => Number(v) >= 0 && Number(v) <= 1)).toBe(true);

    const ranking = rankDigitProbabilities(normalized);
    expect(ranking.top.digit).toBeGreaterThanOrEqual(0);
    expect(ranking.second.digit).toBeGreaterThanOrEqual(0);
  });
});
