import { describe, it, expect } from 'vitest';
import { DateFilterService } from '../../../../src/domain/excel/services/DateFilterService';
import { DateRange } from '../../../../src/domain/excel/value-objects/DateRange';
import { BrowserDateCalculationService } from '../../../../src/infrastructure/dates/services/DateCalculationService';

describe('DateFilterService.filterTransactionsByDateRange', () => {
  const service = new DateFilterService(new BrowserDateCalculationService());

  const transactions = [
    { date: '01/03/2025' },
    { date: '15/03/2025' },
    { date: '01/04/2025' },
    { date: '20/04/2025' },
  ];

  it('keeps transactions whose date falls inclusively in the range', () => {
    const range = new DateRange(new Date(2025, 2, 1), new Date(2025, 2, 31));
    const filtered = service.filterTransactionsByDateRange(transactions, range);

    expect(filtered.map((t) => t.date)).toEqual(['01/03/2025', '15/03/2025']);
  });

  it('includes boundary dates', () => {
    const range = new DateRange(new Date(2025, 2, 15), new Date(2025, 3, 1));
    const filtered = service.filterTransactionsByDateRange(transactions, range);

    expect(filtered.map((t) => t.date)).toEqual(['15/03/2025', '01/04/2025']);
  });

  it('returns empty array for empty input', () => {
    const range = new DateRange(new Date(2025, 2, 1), new Date(2025, 2, 31));
    expect(service.filterTransactionsByDateRange([], range)).toEqual([]);
  });
});
