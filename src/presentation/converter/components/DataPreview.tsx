/**
 * DataPreview - Component for displaying converted data in table format
 */

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

export function DataPreview({ headers, rows }: Readonly<DataPreviewProps>) {
  if (headers.length === 0 || rows.length === 0) {
    return null;
  }

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className={styles.previewContainer}>
      <h3 className={styles.previewTitle}>
        Data Preview ({rows.length} {rows.length === 1 ? 'transaction' : 'transactions'})
      </h3>
      <div className={styles.tableWrapper}>
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
      </div>
    </div>
  );
}
