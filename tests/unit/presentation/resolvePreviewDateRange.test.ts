import { describe, it, expect } from 'vitest';
import type { TransactionDto } from '../../../src/application/transactions/dtos/TransactionDto';
import type { DateFilterDto } from '../../../src/application/excel/dtos/DateFilterDto';
import {
  resolveFullTransactionsRange,
  resolvePreviewDateRangeFromPresets,
} from '../../../src/presentation/converter/utils/resolvePreviewDateRange';

function txn(date: string, note = 'n'): TransactionDto {
  return {
    date,
    dateImport: date,
    note,
    currency: 'DOP',
    amount: 10,
  };
}

describe('resolvePreviewDateRange', () => {
  const transactions = [
    txn('01/03/2025'),
    txn('15/03/2025'),
    txn('10/04/2025'),
    txn('25/04/2025'),
  ];

  it('resolveFullTransactionsRange spans first to last transaction date', () => {
    const range = resolveFullTransactionsRange(transactions);
    expect(range).not.toBeNull();
    expect(range!.startDate).toEqual(new Date(2025, 2, 1));
    expect(range!.endDate).toEqual(new Date(2025, 3, 25));
  });

  it('fills calendar from a by-month preset', () => {
    const monthFilter: DateFilterDto = {
      type: 'by-month',
      label: 'March 2025',
      isAvailable: true,
      metadata: { year: 2025, month: 3 },
    };

    const range = resolvePreviewDateRangeFromPresets(transactions, monthFilter, []);
    expect(range).not.toBeNull();
    expect(range!.startDate).toEqual(new Date(2025, 2, 1));
    expect(range!.endDate).toEqual(new Date(2025, 2, 31));
  });

  it('uses bounding box for multi-select month presets', () => {
    const filters: DateFilterDto[] = [
      {
        type: 'by-month',
        label: 'March 2025',
        isAvailable: true,
        metadata: { year: 2025, month: 3 },
      },
      {
        type: 'by-month',
        label: 'April 2025',
        isAvailable: true,
        metadata: { year: 2025, month: 4 },
      },
    ];

    const range = resolvePreviewDateRangeFromPresets(transactions, null, filters);
    expect(range).not.toBeNull();
    expect(range!.startDate).toEqual(new Date(2025, 2, 1));
    expect(range!.endDate).toEqual(new Date(2025, 3, 30));
  });

  it('falls back to full span for All preset', () => {
    const allFilter: DateFilterDto = {
      type: 'all',
      label: 'All',
      isAvailable: true,
    };

    const range = resolvePreviewDateRangeFromPresets(transactions, allFilter, []);
    const full = resolveFullTransactionsRange(transactions);
    expect(range!.startDate.getTime()).toBe(full!.startDate.getTime());
    expect(range!.endDate.getTime()).toBe(full!.endDate.getTime());
  });
});
