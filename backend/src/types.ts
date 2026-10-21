export const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type Digit = (typeof DIGITS)[number];

export type PricePrecision = {
  symbol: string;
  pip: number;
  decimals: number;
  displayName: string;
};

export type Tick = {
  id: string;
  symbol: string;
  epochMs: number;
  bid: number;
  ask: number;
  last: number;
  price: number;
  digit: number;
  source: 'live' | 'history' | 'demo';
  raw: string;
};

export type ProbabilityDistribution = Record<number, number>;

export type PredictionSummary = {
  symbol: string;
  windowSize: number;
  model: string;
  probabilities: ProbabilityDistribution;
  predictedDigit: number;
  secondCandidate: number;
  margin: number;
  sampleSize: number;
  state: 'ready' | 'insufficient' | 'demo';
  topProbability: number;
};

export type EvaluationReport = {
  top1Accuracy: number;
  logLoss: number;
  brierScore: number;
  calibration: {
    bins: Array<{ bucket: string; observed: number; predicted: number; count: number }>;
    slope: number;
    intercept: number;
  };
  uniformBaseline: number;
  simpleHistoryBaseline: number;
  period: string;
  windowSize: number;
  symbol: string;
  mode: 'train' | 'validation' | 'test';
};
