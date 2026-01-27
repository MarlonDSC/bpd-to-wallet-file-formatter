/**
 * useDateFilters - Hook to manage date filter options
 */

import { useMemo, useState, useEffect } from 'react';
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

  const [state, setState] = useState<DateFiltersState>({
    filters: [],
    selectedFilter: null,
    selectedFilters: [],
    isLoading: false,
    error: null,
  });

  // Load available filters when transactions change
  useEffect(() => {
    if (transactions.length === 0) {
      setState({
        filters: [],
        selectedFilter: null,
        selectedFilters: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const result = getAvailableFiltersUseCase.execute(transactions);

    if (result.success) {
      // Set default filter to "All" if available
      const allFilter = result.data.find((f) => f.type === 'all');
      setState({
        filters: result.data,
        selectedFilter: allFilter?.isAvailable ? allFilter : null,
        selectedFilters: [],
        isLoading: false,
        error: null,
      });
    } else {
      setState({
        filters: [],
        selectedFilter: null,
        selectedFilters: [],
        isLoading: false,
        error: result.error,
      });
    }
  }, [transactions, getAvailableFiltersUseCase]);

  const setSelectedFilter = (filter: DateFilterDto | null) => {
    setState((prev) => ({ ...prev, selectedFilter: filter, selectedFilters: [] }));
  };

  const setSelectedFilters = (filters: DateFilterDto[]) => {
    setState((prev) => ({ ...prev, selectedFilter: null, selectedFilters: filters }));
  };

  return {
    ...state,
    setSelectedFilter,
    setSelectedFilters,
  };
}
