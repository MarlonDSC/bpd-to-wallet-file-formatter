/**
 * TransformationStatus - Displays transformation progress and results.
 */

import type { TransactionDto } from '../../../application/transactions/dtos/TransactionDto';
import type { TransactionError } from '../../../domain/transactions/errors/TransactionErrors';
import styles from '../styles/FileUpload.module.css';

type Props = Readonly<{
  isTransforming: boolean;
  error: TransactionError | null;
  transactions: TransactionDto[];
  errors: Array<{ rowNumber: number; error: string }>;
  skippedCount: number;
}>;

export function TransformationStatus(props: Props) {
  const { isTransforming, error, transactions, errors, skippedCount } = props;

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

  if (error) {
    return (
      <div className={styles.csvStatusError} role="alert" aria-live="assertive">
        <strong>Transformation failed.</strong> {error.message}
      </div>
    );
  }

  if (transactions.length === 0 && errors.length === 0) {
    return null;
  }

  return (
    <output className={styles.csvStatus} aria-live="polite">
      <strong>Transformation complete.</strong>
      <div className={styles.csvStatusSubtext}>
        Transformed {transactions.length} transaction(s).
        {skippedCount > 0 ? ` Skipped ${skippedCount} invalid row(s).` : ''}
        {errors.length > 0 && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {errors.slice(0, 5).map((err) => (
              <div key={`row-${err.rowNumber}-${err.error}`}>Row {err.rowNumber}: {err.error}</div>
            ))}
            {errors.length > 5 && <div>... and {errors.length - 5} more error(s)</div>}
          </div>
        )}
      </div>
    </output>
  );
}
