import { describe, expect, it } from 'vitest';
import { buildLaplaceDistribution, buildTemporalWeightedDistribution, buildTransitionMatrix, normalizeProbabilityVector } from '../services/tickNormalizer.js';

describe('probability engine', () => {
  it('produces a valid distribution and transition matrix', () => {
    const digits = [0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1];
    const laplace = buildLaplaceDistribution(digits, 1);
    const temporal = buildTemporalWeightedDistribution(digits, 5);
    const matrix = buildTransitionMatrix(digits);
    const merged = normalizeProbabilityVector({
      ...laplace,
      ...Object.fromEntries(Object.entries(temporal).map(([k, v]) => [Number(k), Number(v) * 0.5]))
    });

    expect(Object.values(merged).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 5);
    expect(matrix[0][1]).toBeGreaterThan(0);
    expect(Object.keys(matrix).length).toBe(10);
  });
});
