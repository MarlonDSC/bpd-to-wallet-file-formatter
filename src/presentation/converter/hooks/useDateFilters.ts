/**
 * useDateFilters - Hook to manage date filter options
 */

import { useMemo, useState } from 'react';
import { GetAvailableDateFiltersUseCase } from '../../../application/excel/use-cases/GetAvailableDateFiltersUseCase';
import type { DateFilterDto } from '../../../application/excel/dtos/DateFilterDto';
import type { TransactionDto } from '../../../application/transactions/dtos/TransactionDto';
import type { DateFilterError } from '../../../domain/excel/errors/DateFilterErrors';

export interface DateFiltersState {
  filters: DateFilterDto[];
  selectedFilter: DateFilterDto | null;
  selectedFilters: DateFilterDto[]; // For multi-selection
  isLoading: boolean;
  error: DateFilterError | null;
}

export function useDateFilters(transactions: TransactionDto[]) {
  const getAvailableFiltersUseCase = useMemo(
    () => new GetAvailableDateFiltersUseCase(),
    []
  );

  const { filters, error, defaultFilter } = useMemo(() => {
    if (transactions.length === 0) {
      return {
        filters: [] as DateFilterDto[],
        error: null as DateFilterError | null,
        defaultFilter: null as DateFilterDto | null,
      };
    }

    const result = getAvailableFiltersUseCase.execute(transactions);
    if (result.success) {
      const allFilter = result.data.find((f) => f.type === 'all');
      return {
        filters: result.data,
        error: null as DateFilterError | null,
        defaultFilter: (allFilter?.isAvailable ? allFilter : null) as DateFilterDto | null,
      };
    }

    return {
      filters: [] as DateFilterDto[],
      error: result.error,
      defaultFilter: null as DateFilterDto | null,
    };
  }, [transactions, getAvailableFiltersUseCase]);

  const [selection, setSelection] = useState<{
    transactions: TransactionDto[];
    selectedFilter: DateFilterDto | null;
    selectedFilters: DateFilterDto[];
  }>({
    transactions,
    selectedFilter: defaultFilter,
    selectedFilters: [],
  });

  // Reset selection when the transactions input changes (adjust state during render).
  if (selection.transactions !== transactions) {
    setSelection({
      transactions,
      selectedFilter: defaultFilter,
      selectedFilters: [],
    });
  }

  const selectedFilter =
    selection.transactions === transactions
      ? selection.selectedFilter
      : defaultFilter;
  const selectedFilters =
    selection.transactions === transactions ? selection.selectedFilters : [];

  const setSelectedFilter = (filter: DateFilterDto | null) => {
    setSelection((prev) => ({
      ...prev,
      transactions,
      selectedFilter: filter,
      selectedFilters: [],
    }));
  };

  const setSelectedFilters = (nextFilters: DateFilterDto[]) => {
    setSelection((prev) => ({
      ...prev,
      transactions,
      selectedFilter: null,
      selectedFilters: nextFilters,
    }));
  };

  return {
    filters,
    selectedFilter,
    selectedFilters,
    isLoading: false,
    error,
    setSelectedFilter,
    setSelectedFilters,
  };
}
