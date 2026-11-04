import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { TransactionDto } from '../../../src/application/transactions/dtos/TransactionDto';
import { useDataPreviewRows } from '../../../src/presentation/converter/hooks/useDataPreviewRows';

function txn(date: string, amount: number, note = 'note'): TransactionDto {
  return {
    date,
    dateImport: date,
    note,
    currency: 'DOP',
    amount,
  };
}

describe('useDataPreviewRows previewRange filtering', () => {
  const transactions = [
    txn('01/03/2025', 100, 'alpha'),
    txn('15/03/2025', 200, 'beta'),
    txn('10/04/2025', 300, 'gamma'),
  ];

  it('filters rows by calendar preview range', () => {
    const { result } = renderHook(() =>
      useDataPreviewRows({
        transactions,
        previewRange: {
          startDate: new Date(2025, 2, 1),
          endDate: new Date(2025, 2, 31),
        },
        amountPreset: 'all',
        amountMoreThan: null,
        amountLessThan: null,
        noteQuery: '',
        sortColumn: null,
        sortDirection: 'asc',
      })
    );

    expect(result.current.map((row) => row.date)).toEqual(['01/03/2025', '15/03/2025']);
  });

  it('shows all rows when previewRange is null', () => {
    const { result } = renderHook(() =>
      useDataPreviewRows({
        transactions,
        previewRange: null,
        amountPreset: 'all',
        amountMoreThan: null,
        amountLessThan: null,
        noteQuery: '',
        sortColumn: null,
        sortDirection: 'asc',
      })
    );

    expect(result.current).toHaveLength(3);
  });

  it('applies custom amount and note filters after the calendar range', () => {
    const { result } = renderHook(() =>
      useDataPreviewRows({
        transactions,
        previewRange: {
          startDate: new Date(2025, 2, 1),
          endDate: new Date(2025, 3, 30),
        },
        amountPreset: 'custom',
        amountMoreThan: 150,
        amountLessThan: null,
        noteQuery: 'ga',
        sortColumn: null,
        sortDirection: 'asc',
      })
    );

    expect(result.current.map((row) => row.note)).toEqual(['gamma']);
  });

  it('filters income and expenses by amount sign', () => {
    const mixed = [
      txn('01/03/2025', 100, 'income'),
      txn('02/03/2025', -50, 'expense'),
      txn('03/03/2025', 25, 'income-2'),
    ];

    const { result: incomeResult } = renderHook(() =>
      useDataPreviewRows({
        transactions: mixed,
        previewRange: null,
        amountPreset: 'income',
        amountMoreThan: null,
        amountLessThan: null,
        noteQuery: '',
        sortColumn: null,
        sortDirection: 'asc',
      })
    );
    expect(incomeResult.current.map((row) => row.note)).toEqual(['income', 'income-2']);

    const { result: expensesResult } = renderHook(() =>
      useDataPreviewRows({
        transactions: mixed,
        previewRange: null,
        amountPreset: 'expenses',
        amountMoreThan: null,
        amountLessThan: null,
        noteQuery: '',
        sortColumn: null,
        sortDirection: 'asc',
      })
    );
    expect(expensesResult.current.map((row) => row.note)).toEqual(['expense']);
  });
});
