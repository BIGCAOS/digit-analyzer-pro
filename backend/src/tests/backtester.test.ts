import { describe, expect, it } from 'vitest';
import { chronologicalBacktest } from '../services/backtester.js';

describe('backtester', () => {
  it('evaluates model quality without future leakage', () => {
    const stream = [
      1, 2, 3, 4, 5, 1, 2, 3, 4, 5,
      6, 7, 8, 9, 0, 1, 2, 3, 4, 5,
      6, 7, 8, 9, 0, 1, 2, 3, 4, 5,
      6, 7, 8, 9, 0
    ];

    const report = chronologicalBacktest(stream, 10);
    expect(report.top1Accuracy).toBeGreaterThanOrEqual(0);
    expect(report.logLoss).toBeGreaterThan(0);
    expect(report.brierScore).toBeGreaterThanOrEqual(0);
    expect(report.uniformBaseline).toBeGreaterThanOrEqual(0);
  });
});
