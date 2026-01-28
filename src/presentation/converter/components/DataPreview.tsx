/**
 * DataPreview - Component for displaying converted data in table format
 */

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import styles from '../styles/DataPreview.module.css';

export interface DataPreviewProps {
  headers: string[];
  rows: Array<{
    date: string;
    dateImport: string;
    note: string;
    currency: string;
    amount: number;
  }>;
}

export interface DataPreviewHandle {
  openSidebar: () => void;
}

export const DataPreview = forwardRef<DataPreviewHandle, DataPreviewProps>(
  ({ headers, rows }, ref) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      openSidebar: () => {
        setIsSidebarOpen(true);
      },
    }));

  // Prevent body scroll when sidebar is open
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

  if (headers.length === 0 || rows.length === 0) {
    return null;
  }

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate table statistics
  const calculateStats = () => {
    if (rows.length === 0) return null;

    // Parse dates and find range
    const dates = rows.map((row) => new Date(row.date)).filter((date) => !Number.isNaN(date.getTime()));
    dates.sort((a, b) => a.getTime() - b.getTime());
    
    const firstDate = dates.at(0);
    const lastDate = dates.at(-1);
    
    // Calculate totals by currency
    const totalsByCurrency = new Map<string, number>();
    rows.forEach((row) => {
      const current = totalsByCurrency.get(row.currency) || 0;
      totalsByCurrency.set(row.currency, current + row.amount);
    });

    // Format date range
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

    // Calculate total amount (sum of all currencies)
    const totalAmount = Array.from(totalsByCurrency.values()).reduce((sum, amount) => sum + amount, 0);
    
    // Currency breakdown
    const currencies = Array.from(totalsByCurrency.entries());
    const hasMultipleCurrencies = currencies.length > 1;

    return {
      dateRange,
      totalAmount,
      currencies,
      hasMultipleCurrencies,
      uniqueDatesCount: new Set(rows.map((row) => row.date)).size,
    };
  };

  const stats = calculateStats();

  const renderTable = () => (
    <table className={styles.previewTable} role="table" aria-label="Transaction data preview">
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header} className={styles.tableHeader}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const rowKey = `${row.date}-${row.dateImport}-${row.currency}-${row.amount}-${row.note}`;
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
  );

  const shouldShowSidebar = rows.length > 5;

  return (
    <div className={styles.previewContainer}>
      {shouldShowSidebar ? (
        <>
          {isSidebarOpen && (
            <>
              <div
                className={styles.sidebarOverlay}
                onClick={() => setIsSidebarOpen(false)}
                aria-hidden="true"
              />
              <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                  <div className={styles.sidebarTitleContainer}>
                    <h3 className={styles.sidebarTitle}>
                      Data Preview
                    </h3>
                    {stats && (
                      <div className={styles.sidebarSubtitle}>
                        {stats.dateRange && (
                          <span className={styles.sidebarSubtitleItem}>
                            {stats.dateRange}
                          </span>
                        )}
                        {stats.totalAmount !== 0 && (() => {
                          let totalText: string;
                          if (stats.hasMultipleCurrencies) {
                            totalText = `Total: ${stats.currencies.map(([currency, amount]) => 
                              `${formatAmount(amount)} ${currency}`
                            ).join(', ')}`;
                          } else {
                            const firstCurrency = stats.currencies.at(0);
                            const currency = firstCurrency ? firstCurrency[0] : '';
                            totalText = `Total: ${formatAmount(stats.totalAmount)} ${currency}`;
                          }
                          return (
                            <span className={styles.sidebarSubtitleItem}>
                              {totalText}
                            </span>
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
                <div className={styles.sidebarContent}>
                  <div className={styles.tableWrapperInSidebar}>
                    {renderTable()}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <div className={styles.tableWrapper}>
          {renderTable()}
        </div>
      )}
    </div>
  );
  }
);
