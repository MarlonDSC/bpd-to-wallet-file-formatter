/**
 * useDataPreviewRows - Filters and sorts preview rows for the data table
 */

import { useMemo } from 'react';
import type { TransactionDto } from '../../../application/transactions/dtos/TransactionDto';
import { DateRange } from '../../../domain/excel/value-objects/DateRange';
import { DateFilterService } from '../../../domain/excel/services/DateFilterService';
import { BrowserDateCalculationService } from '../../../infrastructure/dates/services/DateCalculationService';
import type { DateRangeValue } from '../components/DateRangeCalendar';
import type { AmountPreset } from '../components/AmountPresetDropdown';

export type PreviewRow = {
  date: string;
  dateImport: string;
  note: string;
  currency: string;
  amount: number;
};

export type SortColumn = keyof PreviewRow;
export type SortDirection = 'asc' | 'desc';

export interface UseDataPreviewRowsParams {
  transactions: TransactionDto[];
  previewRange: DateRangeValue | null;
  amountPreset: AmountPreset;
  amountMoreThan: number | null;
  amountLessThan: number | null;
  noteQuery: string;
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
}

const dateFilterService = new DateFilterService(new BrowserDateCalculationService());

function toPreviewRow(transaction: TransactionDto): PreviewRow {
  return {
    date: transaction.date,
    dateImport: transaction.dateImport,
    note: transaction.note,
    currency: transaction.currency,
    amount: transaction.amount,
  };
}

function parseDdMmYyyy(dateStr: string): number | null {
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) {
    return null;
  }
  const day = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10);
  const year = Number.parseInt(parts[2], 10);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    return null;
  }
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function compareRows(
  a: PreviewRow,
  b: PreviewRow,
  column: SortColumn,
  direction: SortDirection
): number {
  const multiplier = direction === 'asc' ? 1 : -1;

  if (column === 'amount') {
    return (a.amount - b.amount) * multiplier;
  }

  if (column === 'date' || column === 'dateImport') {
    const aTime = parseDdMmYyyy(a[column]);
    const bTime = parseDdMmYyyy(b[column]);
    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return (aTime - bTime) * multiplier;
  }

  return a[column].localeCompare(b[column], undefined, { sensitivity: 'base' }) * multiplier;
}

function filterByPreviewRange(
  transactions: TransactionDto[],
  previewRange: DateRangeValue | null
): TransactionDto[] {
  if (transactions.length === 0) {
    return [];
  }

  if (!previewRange) {
    return transactions;
  }

  try {
    const dateRange = new DateRange(previewRange.startDate, previewRange.endDate);
    return dateFilterService.filterTransactionsByDateRange(
      transactions,
      dateRange
    ) as TransactionDto[];
  } catch {
    return transactions;
  }
}

export function useDataPreviewRows({
  transactions,
  previewRange,
  amountPreset,
  amountMoreThan,
  amountLessThan,
  noteQuery,
  sortColumn,
  sortDirection,
}: UseDataPreviewRowsParams): PreviewRow[] {
  return useMemo(() => {
    let rows = filterByPreviewRange(transactions, previewRange).map(toPreviewRow);

    if (amountPreset === 'income') {
      rows = rows.filter((row) => row.amount > 0);
    } else if (amountPreset === 'expenses') {
      rows = rows.filter((row) => row.amount < 0);
    } else if (amountPreset === 'custom') {
      if (amountMoreThan !== null && !Number.isNaN(amountMoreThan)) {
        rows = rows.filter((row) => row.amount > amountMoreThan);
      }

      if (amountLessThan !== null && !Number.isNaN(amountLessThan)) {
        rows = rows.filter((row) => row.amount < amountLessThan);
      }
    }

    const normalizedQuery = noteQuery.trim().toLowerCase();
    if (normalizedQuery) {
      rows = rows.filter((row) => row.note.toLowerCase().includes(normalizedQuery));
    }

    if (sortColumn) {
      rows = [...rows].sort((a, b) => compareRows(a, b, sortColumn, sortDirection));
    }

    return rows;
  }, [
    transactions,
    previewRange,
    amountPreset,
    amountMoreThan,
    amountLessThan,
    noteQuery,
    sortColumn,
    sortDirection,
  ]);
}
