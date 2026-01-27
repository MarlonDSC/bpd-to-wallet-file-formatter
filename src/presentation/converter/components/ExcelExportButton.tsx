/**
 * ExcelExportButton - Component for downloading Excel files
 */

import { useExcelGenerator } from '../hooks/useExcelGenerator';
import styles from '../styles/ExcelExportButton.module.css';

export interface ExcelExportButtonProps {
  transactions: Array<{
    date: string;
    dateImport: string;
    note: string;
    currency: string;
    amount: number;
  }>;
  disabled?: boolean;
}

export function ExcelExportButton({
  transactions,
  disabled = false,
}: Readonly<ExcelExportButtonProps>) {
  const { isGenerating, error, generateAndDownload } = useExcelGenerator();

  const handleClick = () => {
    if (!disabled && !isGenerating && transactions.length > 0) {
      generateAndDownload(transactions);
    }
  };

  const isButtonDisabled = disabled || isGenerating || transactions.length === 0;

  return (
    <div className={styles.exportContainer}>
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
            Download Excel
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
