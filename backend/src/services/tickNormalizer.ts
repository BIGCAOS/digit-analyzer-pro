import Decimal from 'decimal.js';
import { DIGITS, type Digit } from '../types.js';

export const decimalPlacesFromPip = (pip: number): number => {
  if (!Number.isFinite(pip) || pip <= 0) {
    return 2;
  }

  const normalized = new Decimal(String(pip));
  const exponent = normalized.e;
  if (exponent >= 0) {
    return 0;
  }

  return Math.max(0, Math.abs(exponent));
};

export const toPrecisionDecimal = (value: string | number, decimalPlaces: number): Decimal => {
  const safeValue = typeof value === 'string' ? value.trim() : String(value);

  if (!safeValue || Number.isNaN(Number(safeValue))) {
    throw new Error(`Invalid numeric value: ${safeValue}`);
  }

  const decimal = new Decimal(safeValue);
  return decimal.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
};

export const extractLastDigit = (
  value: string | number,
  pip: number,
  customDecimalPlaces?: number
): number => {
  const decimals = customDecimalPlaces ?? decimalPlacesFromPip(pip);
  const decimal = toPrecisionDecimal(value, decimals);
  const digit = decimal.mul(new Decimal(10).pow(decimals)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return Number(digit.mod(10).toString()) as Digit;
};

export const normalizeDigit = (value: number): Digit => {
  const bounded = ((Math.trunc(Number(value)) % 10) + 10) % 10;
  return bounded as Digit;
};

export const buildLaplaceDistribution = (digits: number[], alpha = 1): Record<number, number> => {
  const counts = Object.fromEntries(DIGITS.map((digit) => [digit, 0])) as Record<number, number>;

  for (const digit of digits) {
    const normalized = normalizeDigit(digit);
    counts[normalized] += 1;
  }

  const total = digits.length + DIGITS.length * alpha;
  const distribution = {} as Record<number, number>;

  for (const digit of DIGITS) {
    const count = counts[digit] + alpha;
    distribution[digit] = count / total;
  }

  return distribution;
};

export const buildTemporalWeightedDistribution = (digits: number[], halfLife = 25): Record<number, number> => {
  const counts = Object.fromEntries(DIGITS.map((digit) => [digit, 0])) as Record<number, number>;
  const weights = digits.map((_, index) => Math.exp(-(digits.length - 1 - index) / halfLife));
  let total = 0;

  for (let i = 0; i < digits.length; i += 1) {
    const normalized = normalizeDigit(digits[i]);
    const weighted = weights[i];
    counts[normalized] += weighted;
    total += weighted;
  }

  const distribution = {} as Record<number, number>;
  for (const digit of DIGITS) {
    distribution[digit] = total === 0 ? 1 / 10 : counts[digit] / total;
  }

  return distribution;
};

export const buildTransitionMatrix = (digits: number[]): Record<number, Record<number, number>> => {
  const counts = Object.fromEntries(DIGITS.map((digit) => [digit, Object.fromEntries(DIGITS.map((next) => [next, 0]))]));

  for (let i = 1; i < digits.length; i += 1) {
    const previous = normalizeDigit(digits[i - 1]);
    const current = normalizeDigit(digits[i]);
    counts[previous][current] += 1;
  }

  const matrix: Record<number, Record<number, number>> = {} as Record<number, Record<number, number>>;

  for (const previous of DIGITS) {
    let total = 0;
    for (const current of DIGITS) {
      total += counts[previous][current];
    }

    matrix[previous] = {} as Record<number, number>;
    for (const current of DIGITS) {
      matrix[previous][current] = total === 0 ? 1 / 10 : (counts[previous][current] + 1) / (total + DIGITS.length);
    }
  }

  return matrix;
};

export const normalizeProbabilityVector = (probabilities: Record<number, number>): Record<number, number> => {
  const entries = Object.entries(probabilities).map(([digit, value]) => [Number(digit), Number(value)] as const);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  if (total <= 0 || !Number.isFinite(total)) {
    return Object.fromEntries(DIGITS.map((digit) => [digit, 1 / 10])) as Record<number, number>;
  }

  const normalized = {} as Record<number, number>;
  for (const [digit, value] of entries) {
    normalized[digit] = value / total;
  }

  return normalized;
};

export const rankDigitProbabilities = (probabilities: Record<number, number>) => {
  const ranked = [...DIGITS].map((digit) => ({ digit, probability: probabilities[digit] ?? 0 })).sort((a, b) => b.probability - a.probability);
  const top = ranked[0];
  const second = ranked[1] ?? ranked[0];

  return {
    top,
    second,
    margin: Math.max(0, top.probability - second.probability),
    ranked
  };
};
