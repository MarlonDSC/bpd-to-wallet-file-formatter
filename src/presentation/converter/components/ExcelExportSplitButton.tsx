/**
 * ExcelExportSplitButton - Split button combining download action with date filter dropdown
 */

import { useState, useRef, useEffect } from 'react';
import { useDateFilters } from '../hooks/useDateFilters';
import { useFilteredExcelGenerator } from '../hooks/useFilteredExcelGenerator';
import type { DateFilterDto } from '../../../application/excel/dtos/DateFilterDto';
import { FilterInfoTooltip } from './FilterInfoTooltip';
import { DateFilterPopup } from './DateFilterPopup';
import styles from '../styles/ExcelExportSplitButton.module.css';
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
  onViewTable,
  showViewTable = false,
}: Readonly<ExcelExportSplitButtonProps>) {
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

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [popupType, setPopupType] = useState<'by-month' | 'by-fortnightly-pay' | 'by-week' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  const handleDownloadClick = () => {
    if (!disabled && !isGenerating && transactions.length > 0) {
      // If multiple filters are selected, download multiple files
      if (selectedFilters.length > 0) {
        generateAndDownloadMultiple(transactions, selectedFilters);
      } else if (selectedFilter?.isAvailable) {
        generateAndDownload(transactions, selectedFilter);
      }
    }
  };

  const handleDropdownToggle = () => {
    if (!disabled && !isGenerating && transactions.length > 0 && !isLoadingFilters) {
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  const handleSelectFilter = (filter: DateFilterDto) => {
    if (filter.isAvailable) {
      setSelectedFilter(filter);
      setIsDropdownOpen(false);
    }
  };

  const handleOpenPopup = (type: 'by-month' | 'by-fortnightly-pay' | 'by-week') => {
    setIsDropdownOpen(false);
    setPopupType(type);
  };

  const handlePopupApply = (selected: DateFilterDto[]) => {
    setSelectedFilters(selected);
    setPopupType(null);
  };

  const handlePopupCancel = () => {
    setPopupType(null);
  };

  const hasValidSelection =
    (selectedFilter?.isAvailable) || selectedFilters.length > 0;

  const isButtonDisabled =
    disabled ||
    isGenerating ||
    transactions.length === 0 ||
    !hasValidSelection ||
    isLoadingFilters;

  // Group filters by type
  const allFilter = filters.find((f) => f.type === 'all');
  const lastMonthFilter = filters.find((f) => f.type === 'last-month');
  const monthFilters = filters.filter((f) => f.type === 'by-month');
  const payPeriodFilters = filters.filter((f) => f.type === 'by-fortnightly-pay');
  const weekFilters = filters.filter((f) => f.type === 'by-week');
  const lastWeekFilter = filters.find((f) => f.type === 'last-week');

  const getPopupFilters = (): DateFilterDto[] => {
    switch (popupType) {
      case 'by-month':
        return filters.filter((f) => f.type === 'by-month');
      case 'by-fortnightly-pay':
        return filters.filter((f) => f.type === 'by-fortnightly-pay');
      case 'by-week':
        return filters.filter((f) => f.type === 'by-week');
      default:
        return [];
    }
  };

  const getPopupTitle = (): string => {
    switch (popupType) {
      case 'by-month':
        return 'Select Months';
      case 'by-fortnightly-pay':
        return 'Select Pay Periods';
      case 'by-week':
        return 'Select Weeks';
      default:
        return 'Select';
    }
  };

  let buttonText = 'Download Excel';
  if (selectedFilters.length > 0) {
    const fileText = selectedFilters.length === 1 ? 'file' : 'files';
    buttonText = `Download ${selectedFilters.length} Excel ${fileText}`;
  } else if (selectedFilter && selectedFilter.type !== 'all') {
    buttonText = `Download Excel (${selectedFilter.label})`;
  }

  return (
    <div className={styles.splitButtonContainer} ref={dropdownRef}>
      <div className={styles.splitButtonGroup}>
        {/* View Table button (eye icon) */}
        {showViewTable && onViewTable && (
          <>
            <button
              type="button"
              onClick={onViewTable}
              disabled={isButtonDisabled}
              className={styles.viewTableButton}
              aria-label="View data table in sidebar"
            >
              <svg
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
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <div className={styles.splitDivider} aria-hidden="true" />
          </>
        )}

        {/* Main download button */}
        <button
          type="button"
          onClick={handleDownloadClick}
          disabled={isButtonDisabled}
          className={`${styles.downloadButton} ${showViewTable && onViewTable ? '' : styles.downloadButtonRoundedLeft}`}
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

        {/* Split divider */}
        <div className={styles.splitDivider} aria-hidden="true" />

        {/* Dropdown toggle button */}
        <button
          type="button"
          onClick={handleDropdownToggle}
          disabled={isButtonDisabled}
          className={styles.dropdownToggle}
          aria-label="Select date filter"
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
        >
          <svg
            className={styles.chevronIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div className={styles.dropdownMenu}>
          {/* All filter */}
          {allFilter && (
            <button
              type="button"
              onClick={() => handleSelectFilter(allFilter)}
              disabled={!allFilter.isAvailable}
              className={`${styles.menuItem} ${
                selectedFilter?.type === 'all' ? styles.menuItemSelected : ''
              } ${allFilter.isAvailable ? '' : styles.menuItemDisabled}`}
            >
              <span>{allFilter.label}</span>
              {!allFilter.isAvailable && allFilter.unavailableReason && (
                <FilterInfoTooltip reason={allFilter.unavailableReason} />
              )}
            </button>
          )}

          {/* Last month filter */}
          {lastMonthFilter && (
            <button
              type="button"
              onClick={() => handleSelectFilter(lastMonthFilter)}
              disabled={!lastMonthFilter.isAvailable}
              className={`${styles.menuItem} ${
                selectedFilter?.type === 'last-month' ? styles.menuItemSelected : ''
              } ${lastMonthFilter.isAvailable ? '' : styles.menuItemDisabled}`}
            >
              <span>{lastMonthFilter.label}</span>
              {!lastMonthFilter.isAvailable && lastMonthFilter.unavailableReason && (
                <FilterInfoTooltip reason={lastMonthFilter.unavailableReason} />
              )}
            </button>
          )}

          {/* By month popup trigger */}
          {monthFilters.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenPopup('by-month')}
              className={styles.menuItem}
            >
              <span>By month</span>
              {selectedFilters.some((f) => f.type === 'by-month') && (
                <span className={styles.badge}>
                  {selectedFilters.filter((f) => f.type === 'by-month').length}
                </span>
              )}
            </button>
          )}

          {/* By fortnightly pay popup trigger */}
          {payPeriodFilters.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenPopup('by-fortnightly-pay')}
              className={styles.menuItem}
            >
              <span>By fortnightly pay</span>
              {selectedFilters.some((f) => f.type === 'by-fortnightly-pay') && (
                <span className={styles.badge}>
                  {selectedFilters.filter((f) => f.type === 'by-fortnightly-pay').length}
                </span>
              )}
            </button>
          )}

          {/* By week popup trigger */}
          {weekFilters.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenPopup('by-week')}
              className={styles.menuItem}
            >
              <span>By week</span>
              {selectedFilters.some((f) => f.type === 'by-week') && (
                <span className={styles.badge}>
                  {selectedFilters.filter((f) => f.type === 'by-week').length}
                </span>
              )}
            </button>
          )}

          {/* Last week filter */}
          {lastWeekFilter && (
            <button
              type="button"
              onClick={() => handleSelectFilter(lastWeekFilter)}
              disabled={!lastWeekFilter.isAvailable}
              className={`${styles.menuItem} ${
                selectedFilter?.type === 'last-week' ? styles.menuItemSelected : ''
              } ${lastWeekFilter.isAvailable ? '' : styles.menuItemDisabled}`}
            >
              <span>{lastWeekFilter.label}</span>
              {!lastWeekFilter.isAvailable && lastWeekFilter.unavailableReason && (
                <FilterInfoTooltip reason={lastWeekFilter.unavailableReason} />
              )}
            </button>
          )}
        </div>
      )}

      {/* Popup for multi-selection */}
      {popupType && (
        <DateFilterPopup
          filters={getPopupFilters()}
          selectedFilters={selectedFilters.filter((f) => f.type === popupType)}
          onApply={handlePopupApply}
          onCancel={handlePopupCancel}
          title={getPopupTitle()}
        />
      )}

      {/* Error message */}
      {error && (
        <div className={styles.errorMessage} role="alert">
          {error.message}
        </div>
      )}
    </div>
  );
}
