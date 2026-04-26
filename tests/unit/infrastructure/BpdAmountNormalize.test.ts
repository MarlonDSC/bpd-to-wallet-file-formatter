import { describe, it, expect } from 'vitest';
import { normalizeBpdAmountString } from '../../../src/infrastructure/utils/services/BpdAmountNormalize';

describe('normalizeBpdAmountString', () => {
  it('strips currency and trailing minus', () => {
    expect(normalizeBpdAmountString('$464.62-')).toBe('-464.62');
  });

  it('handles thousands separators', () => {
    expect(normalizeBpdAmountString('$51,029.76')).toBe('51029.76');
  });

  it('returns plain negative numbers', () => {
    expect(normalizeBpdAmountString('-12.5')).toBe('-12.5');
  });

  it('returns original trim when not parseable', () => {
    expect(normalizeBpdAmountString('n/a')).toBe('n/a');
  });
});
