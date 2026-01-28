/**
 * ConversionStatus - Combined component for displaying CSV parsing and transformation status
 */

import type { CsvParseResultDto } from '../../../application/csv/dtos/CsvParseResultDto';
import type { TransactionDto } from '../../../application/transactions/dtos/TransactionDto';
import type { CsvError } from '../../../domain/csv/errors/CsvErrors';
import type { TransactionError } from '../../../domain/transactions/errors/TransactionErrors';
import styles from '../styles/FileUpload.module.css';

type Props = Readonly<{
  // Parsing state
  isParsing: boolean;
  parsingError: CsvError | null;
  parsingWarningCount: number;
  parsingResults: CsvParseResultDto[] | null;
  // Transformation state
  isTransforming: boolean;
  transformationError: TransactionError | null;
  transactions: TransactionDto[];
  transformationErrors: Array<{ rowNumber: number; error: string }>;
  skippedCount: number;
}>;

export function ConversionStatus(props: Props) {
  const {
    isParsing,
    parsingError,
    parsingWarningCount,
    parsingResults,
    isTransforming,
    transformationError,
    transactions,
    transformationErrors,
    skippedCount,
  } = props;

  // Show parsing in progress
  if (isParsing) {
    return (
      <output className={styles.csvStatus} aria-live="polite">
        <strong>Parsing CSV…</strong>
        <div className={styles.csvStatusSubtext}>
          Detecting encoding, headers, and extracting transactions.
        </div>
      </output>
    );
  }

  // Show transformation in progress
  if (isTransforming) {
    return (
      <output className={styles.csvStatus} aria-live="polite">
        <strong>Transforming transactions…</strong>
        <div className={styles.csvStatusSubtext}>
          Calculating dates, formatting amounts, and determining transaction types.
        </div>
      </output>
    );
  }

  // Show parsing error
  if (parsingError) {
    return (
      <div className={styles.csvStatusError} role="alert" aria-live="assertive">
        <strong>Parsing failed.</strong> {parsingError.message}
      </div>
    );
  }

  // Show transformation error
  if (transformationError) {
    return (
      <div className={styles.csvStatusError} role="alert" aria-live="assertive">
        <strong>Transformation failed.</strong> {transformationError.message}
      </div>
    );
  }

  // Show combined success status when both are complete
  if (parsingResults && transactions.length > 0) {
    const encodings = Array.from(new Set(parsingResults.map((r) => r.metadata.encoding))).join(', ');

    return (
      <output className={styles.csvStatus} aria-live="polite">
        <strong>Conversion complete.</strong>
        <div className={styles.csvStatusSubtext}>
          Processed {transactions.length} transaction{transactions.length === 1 ? '' : 's'} from {parsingResults.length} file{parsingResults.length === 1 ? '' : 's'}.
          {encodings && ` Encoding: ${encodings}.`}
          {parsingWarningCount > 0 && ` Skipped ${parsingWarningCount} invalid row(s) during parsing.`}
          {skippedCount > 0 && ` Skipped ${skippedCount} invalid row(s) during transformation.`}
          {transformationErrors.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              {transformationErrors.slice(0, 5).map((err) => (
                <div key={`row-${err.rowNumber}-${err.error}`}>Row {err.rowNumber}: {err.error}</div>
              ))}
              {transformationErrors.length > 5 && <div>... and {transformationErrors.length - 5} more error(s)</div>}
            </div>
          )}
        </div>
      </output>
    );
  }

  // Show parsing complete but no transformation yet
  if (parsingResults && parsingResults.length > 0) {
    const totalRows = parsingResults.reduce((acc, r) => acc + r.rows.length, 0);
    const encodings = Array.from(new Set(parsingResults.map((r) => r.metadata.encoding))).join(', ');

    return (
      <output className={styles.csvStatus} aria-live="polite">
        <strong>Parsing complete.</strong>
        <div className={styles.csvStatusSubtext}>
          Extracted {totalRows} transaction rows from {parsingResults.length} file(s). Encoding: {encodings}.
          {parsingWarningCount > 0 ? ` Skipped ${parsingWarningCount} invalid row(s).` : ''}
        </div>
      </output>
    );
  }

  return null;
}
