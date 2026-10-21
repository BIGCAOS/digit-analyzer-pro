import { buildLaplaceDistribution, normalizeProbabilityVector, rankDigitProbabilities } from '../services/tickNormalizer.js';

export type ForecastRecord = {
  actual: number;
  probabilities: Record<number, number>;
};

export const chronologicalBacktest = (digits: number[], windowSize = 100) => {
  const metrics = { top1: 0, total: 0, logLoss: 0, brier: 0 };
  const history: number[] = [];

  for (let i = 0; i < digits.length; i += 1) {
    const futureDigit = digits[i];
    const window = digits.slice(Math.max(0, i - windowSize), i);
    if (window.length === 0) continue;

    const probabilities = normalizeProbabilityVector(buildLaplaceDistribution(window, 1));
    const ranked = rankDigitProbabilities(probabilities);
    metrics.total += 1;
    metrics.top1 += ranked.top.digit === futureDigit ? 1 : 0;

    const loss = -Math.log(probabilities[futureDigit] ?? 1e-9);
    metrics.logLoss += loss;

    let brierSum = 0;
    for (let digit = 0; digit <= 9; digit += 1) {
      const target = digit === futureDigit ? 1 : 0;
      const delta = probabilities[digit] - target;
      brierSum += delta * delta;
    }
    metrics.brier += brierSum / 10;
  }

  const totalCount = Math.max(1, metrics.total);
  return {
    top1Accuracy: metrics.top1 / totalCount,
    logLoss: metrics.logLoss / totalCount,
    brierScore: metrics.brier / totalCount,
    uniformBaseline: 0.1,
    simpleHistoryBaseline: metrics.top1 / totalCount,
    period: 'chronological',
    windowSize,
    symbol: 'R_100',
    mode: 'validation' as const
  };
};
