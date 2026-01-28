/**
 * ExcelExportButton - Component for downloading Excel files with date filtering
 */

import { useDateFilters } from '../hooks/useDateFilters';
import { useFilteredExcelGenerator } from '../hooks/useFilteredExcelGenerator';
import { DateFilterDropdown } from './DateFilterDropdown';
import styles from '../styles/ExcelExportButton.module.css';
import type { TransactionDto } from '../../../application/transactions/dtos/TransactionDto';

export interface ExcelExportButtonProps {
  transactions: TransactionDto[];
  disabled?: boolean;
}

export function ExcelExportButton({
  transactions,
  disabled = false,
}: Readonly<ExcelExportButtonProps>) {
  const {
    filters,
    selectedFilter,
    selectedFilters,
    isLoading: isLoadingFilters,
    setSelectedFilter,
    setSelectedFilters,
  } = useDateFilters(transactions);
  const { isGenerating, error, generateAndDownload, generateAndDownloadMultiple } =
    useFilteredExcelGenerator();

  const handleClick = () => {
    if (!disabled && !isGenerating && transactions.length > 0) {
      // If multiple filters are selected, download multiple files
      if (selectedFilters.length > 0) {
        generateAndDownloadMultiple(transactions, selectedFilters);
      } else if (selectedFilter?.isAvailable) {
        generateAndDownload(transactions, selectedFilter);
      }
    }
  };

  const hasValidSelection =
    (selectedFilter?.isAvailable) || selectedFilters.length > 0;

  const isButtonDisabled =
    disabled ||
    isGenerating ||
    transactions.length === 0 ||
    !hasValidSelection ||
    isLoadingFilters;

  let buttonText = 'Download Excel';
  if (selectedFilters.length > 0) {
    const fileText = selectedFilters.length === 1 ? 'file' : 'files';
    buttonText = `Download ${selectedFilters.length} Excel ${fileText}`;
  }

  return (
    <div className={styles.exportContainer}>
      <div className={styles.filterSection}>
        <label htmlFor="date-filter" className={styles.filterLabel}>
          Date Filter:
        </label>
        <DateFilterDropdown
          filters={filters}
          selectedFilter={selectedFilter}
          selectedFilters={selectedFilters}
          onSelectFilter={setSelectedFilter}
          onSelectFilters={setSelectedFilters}
          disabled={disabled || isLoadingFilters || transactions.length === 0}
        />
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isButtonDisabled}
        className={styles.exportButton}
        aria-label="Download Excel file"
        aria-busy={isGenerating}
      >
        {isGenerating ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            <span>Generating Excel...</span>
          </>
        ) : (
          <>
            <svg
              className={styles.downloadIcon}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {buttonText}
          </>
        )}
      </button>
      {error && (
        <div className={styles.errorMessage} role="alert">
          {error.message}
        </div>
      )}
    </div>
  );
}
