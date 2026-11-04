/**
 * DataPreview - Sidebar table with sort, filter, search, and date-driven download
 */

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import styles from '../styles/DataPreview.module.css';
import type { TransactionDto } from '../../../application/transactions/dtos/TransactionDto';
import type { DateFilterDto } from '../../../application/excel/dtos/DateFilterDto';
import { useDateFilters } from '../hooks/useDateFilters';
import {
  useDataPreviewRows,
  type SortColumn,
  type SortDirection,
} from '../hooks/useDataPreviewRows';
import {
  resolveFullTransactionsRange,
  resolvePreviewDateRangeFromPresets,
} from '../utils/resolvePreviewDateRange';
import { DateFilterDownloadControls } from './DateFilterDownloadControls';
import { DateFilterDropdown } from './DateFilterDropdown';
import {
  AmountPresetDropdown,
  type AmountPreset,
} from './AmountPresetDropdown';
import {
  DateRangeCalendar,
  type DateRangeValue,
} from './DateRangeCalendar';

const PREVIEW_HEADERS: Array<{ key: SortColumn; label: string }> = [
  { key: 'date', label: 'Date' },
  { key: 'dateImport', label: 'Date (Import)' },
  { key: 'note', label: 'Note' },
  { key: 'currency', label: 'Currency' },
  { key: 'amount', label: 'Amount' },
];

export interface DataPreviewProps {
  transactions: TransactionDto[];
  disabled?: boolean;
}

export interface DataPreviewHandle {
  openSidebar: () => void;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveAmountBounds(
  transactions: TransactionDto[]
): { min: number; max: number } | null {
  if (transactions.length === 0) {
    return null;
  }

  let min = transactions[0].amount;
  let max = transactions[0].amount;
  for (const transaction of transactions) {
    min = Math.min(min, transaction.amount);
    max = Math.max(max, transaction.amount);
  }
  return { min, max };
}

function formatBoundAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getAmountBoundError(
  value: number | null,
  bounds: { min: number; max: number } | null
): string | null {
  if (value === null || !bounds) {
    return null;
  }
  if (value < bounds.min || value > bounds.max) {
    return `Must be between ${formatBoundAmount(bounds.min)} and ${formatBoundAmount(bounds.max)}`;
  }
  return null;
}

export const DataPreview = forwardRef<DataPreviewHandle, DataPreviewProps>(
  ({ transactions, disabled = false }, ref) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [amountPreset, setAmountPreset] = useState<AmountPreset>('all');
    const [amountMoreThanInput, setAmountMoreThanInput] = useState('');
    const [amountLessThanInput, setAmountLessThanInput] = useState('');
    const [noteQuery, setNoteQuery] = useState('');
    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [previewRange, setPreviewRange] = useState<DateRangeValue | null>(() =>
      resolveFullTransactionsRange(transactions)
    );
    const [isCustomRange, setIsCustomRange] = useState(false);
    const [rangeSourceTransactions, setRangeSourceTransactions] =
      useState(transactions);
    const isCustomAmount = amountPreset === 'custom';

    const {
      filters,
      selectedFilter,
      selectedFilters,
      isLoading: isLoadingFilters,
      setSelectedFilter,
      setSelectedFilters,
    } = useDateFilters(transactions);

    if (rangeSourceTransactions !== transactions) {
      setRangeSourceTransactions(transactions);
      setIsCustomRange(false);
      setAmountPreset('all');
      setAmountMoreThanInput('');
      setAmountLessThanInput('');
      setPreviewRange(
        resolvePreviewDateRangeFromPresets(transactions, selectedFilter, selectedFilters)
      );
    }

    const amountBounds = resolveAmountBounds(transactions);
    const amountMoreThan = parseOptionalNumber(amountMoreThanInput);
    const amountLessThan = parseOptionalNumber(amountLessThanInput);
    const amountMoreThanError = isCustomAmount
      ? getAmountBoundError(amountMoreThan, amountBounds)
      : null;
    const amountLessThanError = isCustomAmount
      ? getAmountBoundError(amountLessThan, amountBounds)
      : null;

    const visibleRows = useDataPreviewRows({
      transactions,
      previewRange,
      amountPreset,
      amountMoreThan:
        isCustomAmount && !amountMoreThanError ? amountMoreThan : null,
      amountLessThan:
        isCustomAmount && !amountLessThanError ? amountLessThan : null,
      noteQuery,
      sortColumn,
      sortDirection,
    });

    const handleSetSelectedFilter = (filter: DateFilterDto | null) => {
      setIsCustomRange(false);
      setSelectedFilter(filter);
      setPreviewRange(resolvePreviewDateRangeFromPresets(transactions, filter, []));
    };

    const handleSetSelectedFilters = (nextFilters: DateFilterDto[]) => {
      setIsCustomRange(false);
      setSelectedFilters(nextFilters);
      setPreviewRange(
        resolvePreviewDateRangeFromPresets(transactions, null, nextFilters)
      );
    };

    const handleSelectCustom = () => {
      setIsCustomRange(true);
    };

    const handlePreviewRangeChange = (range: DateRangeValue) => {
      setIsCustomRange(true);
      setPreviewRange(range);
    };

    useImperativeHandle(ref, () => ({
      openSidebar: () => {
        setIsSidebarOpen(true);
      },
    }));

    useEffect(() => {
      if (isSidebarOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [isSidebarOpen]);

    if (transactions.length === 0) {
      return null;
    }

    const formatAmount = (amount: number): string => {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const calculateStats = () => {
      if (visibleRows.length === 0) return null;

      const dates = visibleRows
        .map((row) => {
          const dateStr = row.date.trim();
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const day = Number.parseInt(parts[0], 10);
            const month = Number.parseInt(parts[1], 10);
            const year = Number.parseInt(parts[2], 10);
            if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
              const parsed = new Date(year, month - 1, day);
              return Number.isNaN(parsed.getTime()) ? null : parsed;
            }
          }
          const parsed = new Date(dateStr);
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        })
        .filter((date): date is Date => date !== null);

      dates.sort((a, b) => a.getTime() - b.getTime());

      const firstDate = dates.at(0);
      const lastDate = dates.at(-1);

      const totalsByCurrency = new Map<string, number>();
      visibleRows.forEach((row) => {
        const current = totalsByCurrency.get(row.currency) || 0;
        totalsByCurrency.set(row.currency, current + row.amount);
      });

      const formatDate = (date: Date): string => {
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(date);
      };

      let dateRange: string | null = null;
      if (firstDate && lastDate) {
        if (firstDate.getTime() === lastDate.getTime()) {
          dateRange = formatDate(firstDate);
        } else {
          dateRange = `${formatDate(firstDate)} - ${formatDate(lastDate)}`;
        }
      }

      const totalAmount = Array.from(totalsByCurrency.values()).reduce(
        (sum, amount) => sum + amount,
        0
      );
      const currencies = Array.from(totalsByCurrency.entries());
      const hasMultipleCurrencies = currencies.length > 1;

      return {
        dateRange: dateRange || null,
        totalAmount,
        currencies,
        hasMultipleCurrencies,
        rowCount: visibleRows.length,
      };
    };

    const stats = calculateStats();

    const noteSearchPlaceholder =
      transactions.find((row) => row.note.trim().length > 0)?.note.trim() || 'Note';
    const dateBounds = resolveFullTransactionsRange(transactions);

    const handleSort = (column: SortColumn) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return;
      }
      setSortColumn(column);
      setSortDirection('asc');
    };

    const sortIndicator = (column: SortColumn): string => {
      if (sortColumn !== column) {
        return '';
      }
      return sortDirection === 'asc' ? ' ↑' : ' ↓';
    };

    return (
      <>
        {isSidebarOpen && (
          <>
            <div
              className={styles.sidebarOverlay}
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className={styles.sidebar} role="dialog" aria-label="Data preview">
              <div className={styles.sidebarHeader}>
                <div className={styles.sidebarTitleContainer}>
                  <h3 className={styles.sidebarTitle}>Data Preview</h3>
                  {stats && (stats.dateRange || stats.currencies.length > 0) && (
                    <div className={styles.sidebarSubtitle}>
                      <span className={styles.sidebarSubtitleItem}>
                        {stats.rowCount} {stats.rowCount === 1 ? 'row' : 'rows'}
                        {stats.dateRange ? ` · ${stats.dateRange}` : ''}
                      </span>
                      {stats.currencies.length > 0 && (() => {
                        let totalText: string;
                        if (stats.hasMultipleCurrencies) {
                          totalText = `Total: ${stats.currencies
                            .map(
                              ([currency, amount]) =>
                                `${formatAmount(amount)} ${currency}`
                            )
                            .join(', ')}`;
                        } else {
                          const firstCurrency = stats.currencies.at(0);
                          const currency = firstCurrency ? firstCurrency[0] : '';
                          totalText = `Total: ${formatAmount(stats.totalAmount)} ${currency}`;
                        }
                        return (
                          <span className={styles.sidebarSubtitleItem}>{totalText}</span>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className={styles.closeButton}
                  aria-label="Close sidebar"
                >
                  ×
                </button>
              </div>

              <div className={styles.toolbar}>
                <div className={styles.filterSections}>
                  <section className={styles.filterSection} aria-labelledby="date-filters-heading">
                    <h4 id="date-filters-heading" className={styles.filterSectionTitle}>
                      Date
                    </h4>
                    <div className={styles.toolbarFilters}>
                      <div className={styles.presetField}>
                        <span className={styles.filterLabel}>Date preset</span>
                        <DateFilterDropdown
                          filters={filters}
                          selectedFilter={selectedFilter}
                          selectedFilters={selectedFilters}
                          onSelectFilter={(filter) => handleSetSelectedFilter(filter)}
                          onSelectFilters={handleSetSelectedFilters}
                          disabled={disabled || isLoadingFilters}
                          showCustomOption
                          isCustomSelected={isCustomRange}
                          onSelectCustom={handleSelectCustom}
                        />
                      </div>
                      <div className={styles.dateRangeField}>
                        <DateRangeCalendar
                          value={previewRange}
                          onChange={handlePreviewRangeChange}
                          disabled={!isCustomRange}
                          bounds={dateBounds}
                        />
                      </div>
                    </div>
                  </section>

                  <section className={styles.filterSection} aria-labelledby="amount-filters-heading">
                    <h4 id="amount-filters-heading" className={styles.filterSectionTitle}>
                      Amount
                    </h4>
                    <div className={styles.toolbarFilters}>
                      <div className={`${styles.filterField} ${styles.amountPresetField}`}>
                        <span className={styles.filterLabel}>Amount preset</span>
                        <AmountPresetDropdown
                          value={amountPreset}
                          onChange={setAmountPreset}
                          disabled={disabled}
                        />
                      </div>
                      <div className={styles.filterField}>
                        <span className={styles.filterLabel}>More than</span>
                        <input
                          type="number"
                          step="0.01"
                          min={amountBounds?.min}
                          max={amountBounds?.max}
                          value={amountMoreThanInput}
                          onChange={(event) => setAmountMoreThanInput(event.target.value)}
                          className={`${styles.filterInput} ${
                            amountMoreThanError ? styles.filterInputInvalid : ''
                          }`}
                          placeholder={
                            amountBounds
                              ? formatBoundAmount(amountBounds.min)
                              : 'Amount'
                          }
                          disabled={!isCustomAmount}
                          aria-label="Filter amount more than"
                          aria-invalid={Boolean(amountMoreThanError)}
                          aria-describedby={
                            amountMoreThanError ? 'amount-more-than-error' : undefined
                          }
                        />
                        {amountMoreThanError && (
                          <span
                            id="amount-more-than-error"
                            className={styles.filterError}
                            role="alert"
                          >
                            {amountMoreThanError}
                          </span>
                        )}
                      </div>
                      <div className={styles.filterField}>
                        <span className={styles.filterLabel}>Less than</span>
                        <input
                          type="number"
                          step="0.01"
                          min={amountBounds?.min}
                          max={amountBounds?.max}
                          value={amountLessThanInput}
                          onChange={(event) => setAmountLessThanInput(event.target.value)}
                          className={`${styles.filterInput} ${
                            amountLessThanError ? styles.filterInputInvalid : ''
                          }`}
                          placeholder={
                            amountBounds
                              ? formatBoundAmount(amountBounds.max)
                              : 'Amount'
                          }
                          disabled={!isCustomAmount}
                          aria-label="Filter amount less than"
                          aria-invalid={Boolean(amountLessThanError)}
                          aria-describedby={
                            amountLessThanError ? 'amount-less-than-error' : undefined
                          }
                        />
                        {amountLessThanError && (
                          <span
                            id="amount-less-than-error"
                            className={styles.filterError}
                            role="alert"
                          >
                            {amountLessThanError}
                          </span>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className={styles.filterSection} aria-labelledby="note-filters-heading">
                    <h4 id="note-filters-heading" className={styles.filterSectionTitle}>
                      Note
                    </h4>
                    <div className={styles.toolbarFilters}>
                      <div className={`${styles.filterField} ${styles.filterFieldGrow}`}>
                        <input
                          type="search"
                          value={noteQuery}
                          onChange={(event) => setNoteQuery(event.target.value)}
                          className={styles.filterInput}
                          placeholder={noteSearchPlaceholder}
                          aria-label="Search notes"
                        />
                      </div>
                    </div>
                  </section>
                </div>
                <DateFilterDownloadControls
                  transactions={transactions}
                  filters={filters}
                  selectedFilter={selectedFilter}
                  selectedFilters={selectedFilters}
                  isLoadingFilters={isLoadingFilters}
                  setSelectedFilter={handleSetSelectedFilter}
                  setSelectedFilters={handleSetSelectedFilters}
                  disabled={disabled}
                  className={styles.downloadControls}
                />
              </div>

              <div className={styles.sidebarContent}>
                {visibleRows.length === 0 ? (
                  <p className={styles.emptyState} role="status">
                    No transactions match the current preview filters.
                  </p>
                ) : (
                  <div className={styles.tableWrapperInSidebar}>
                    <table
                      className={styles.previewTable}
                      role="table"
                      aria-label="Transaction data preview"
                    >
                      <thead>
                        <tr>
                          {PREVIEW_HEADERS.map(({ key, label }) => (
                            <th key={key} className={styles.tableHeader}>
                              <button
                                type="button"
                                className={styles.sortButton}
                                onClick={() => handleSort(key)}
                                aria-label={`Sort by ${label}`}
                              >
                                {label}
                                <span className={styles.sortIndicator} aria-hidden="true">
                                  {sortIndicator(key)}
                                </span>
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map((row, index) => {
                          const rowKey = `${row.date}-${row.dateImport}-${row.currency}-${row.amount}-${row.note}-${index}`;
                          return (
                            <tr key={rowKey} className={styles.tableRow}>
                              <td className={styles.tableCell}>{row.date}</td>
                              <td className={styles.tableCell}>{row.dateImport}</td>
                              <td className={styles.tableCell}>{row.note}</td>
                              <td className={styles.tableCell}>{row.currency}</td>
                              <td className={`${styles.tableCell} ${styles.amountCell}`}>
                                {formatAmount(row.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </>
    );
  }
);
