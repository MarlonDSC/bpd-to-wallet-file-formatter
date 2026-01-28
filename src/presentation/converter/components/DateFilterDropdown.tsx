/**
 * DateFilterDropdown - Component for selecting date filter options
 */

import { useState, useRef, useEffect } from 'react';
import type { DateFilterDto } from '../../../application/excel/dtos/DateFilterDto';
import { FilterInfoTooltip } from './FilterInfoTooltip';
import { DateFilterPopup } from './DateFilterPopup';
import styles from '../styles/DateFilterDropdown.module.css';

export interface DateFilterDropdownProps {
  filters: DateFilterDto[];
  selectedFilter: DateFilterDto | null;
  selectedFilters?: DateFilterDto[]; // For multi-selection
  onSelectFilter: (filter: DateFilterDto) => void;
  onSelectFilters?: (filters: DateFilterDto[]) => void; // For multi-selection
  disabled?: boolean;
}

export function DateFilterDropdown({
  filters,
  selectedFilter,
  selectedFilters = [],
  onSelectFilter,
  onSelectFilters,
  disabled = false,
}: Readonly<DateFilterDropdownProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [popupType, setPopupType] = useState<'by-month' | 'by-fortnightly-pay' | 'by-week' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Group filters by type
  const allFilter = filters.find((f) => f.type === 'all');
  const lastMonthFilter = filters.find((f) => f.type === 'last-month');
  const monthFilters = filters.filter((f) => f.type === 'by-month');
  const payPeriodFilters = filters.filter((f) => f.type === 'by-fortnightly-pay');
  const weekFilters = filters.filter((f) => f.type === 'by-week');
  const lastWeekFilter = filters.find((f) => f.type === 'last-week');

  const handleSelectFilter = (filter: DateFilterDto) => {
    if (filter.isAvailable) {
      onSelectFilter(filter);
      setIsOpen(false);
    }
  };

  const handleOpenPopup = (type: 'by-month' | 'by-fortnightly-pay' | 'by-week') => {
    setIsOpen(false);
    setPopupType(type);
  };

  const handlePopupApply = (selected: DateFilterDto[]) => {
    if (onSelectFilters) {
      onSelectFilters(selected);
    }
    setPopupType(null);
  };

  const handlePopupCancel = () => {
    setPopupType(null);
  };

  const getDisplayLabel = (): string => {
    if (popupType && selectedFilters.length > 0) {
      if (selectedFilters.length === 1) {
        return selectedFilters[0].label;
      }
      let typeLabel = 'weeks';
      if (popupType === 'by-month') {
        typeLabel = 'months';
      } else if (popupType === 'by-fortnightly-pay') {
        typeLabel = 'pay periods';
      }
      return `${selectedFilters.length} ${typeLabel} selected`;
    }
    if (selectedFilter) {
      return selectedFilter.label;
    }
    return 'Select date filter...';
  };

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

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={styles.dropdownButton}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select date filter"
      >
        <span>{getDisplayLabel()}</span>
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

      {isOpen && (
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
                <span>
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
    </div>
  );
}
