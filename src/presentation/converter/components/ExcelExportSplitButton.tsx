/**
 * ExcelExportSplitButton - Thin wrapper around DateFilterDownloadControls
 * Kept for compatibility with older call sites / tests that still import this name.
 */

import { useDateFilters } from '../hooks/useDateFilters';
import { DateFilterDownloadControls } from './DateFilterDownloadControls';
import type { TransactionDto } from '../../../application/transactions/dtos/TransactionDto';

export interface ExcelExportSplitButtonProps {
  transactions: TransactionDto[];
  disabled?: boolean;
  onViewTable?: () => void;
  showViewTable?: boolean;
}

export function ExcelExportSplitButton({
  transactions,
  disabled = false,
}: Readonly<ExcelExportSplitButtonProps>) {
  const {
    filters,
    selectedFilter,
    selectedFilters,
    isLoading: isLoadingFilters,
    setSelectedFilter,
    setSelectedFilters,
  } = useDateFilters(transactions);

  return (
    <DateFilterDownloadControls
      transactions={transactions}
      filters={filters}
      selectedFilter={selectedFilter}
      selectedFilters={selectedFilters}
      isLoadingFilters={isLoadingFilters}
      setSelectedFilter={setSelectedFilter}
      setSelectedFilters={setSelectedFilters}
      disabled={disabled}
    />
  );
}
