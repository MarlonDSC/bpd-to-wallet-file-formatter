/**
 * CsvParsingStatus - Displays CSV parsing progress and results.
 */

import type { CsvParseResultDto } from '../../../application/csv/dtos/CsvParseResultDto';
import type { CsvError } from '../../../domain/csv/errors/CsvErrors';
import styles from '../styles/FileUpload.module.css';

type Props = Readonly<{
  isParsing: boolean;
  error: CsvError | null;
  warningCount: number;
  results: CsvParseResultDto[] | null;
}>;

export function CsvParsingStatus(props: Props) {
  const { isParsing, error, warningCount, results } = props;

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

  if (error) {
    return (
      <div className={styles.csvStatusError} role="alert" aria-live="assertive">
        <strong>Parsing failed.</strong> {error.message}
      </div>
    );
  }

  if (!results) return null;

  const totalRows = results.reduce((acc, r) => acc + r.rows.length, 0);
  const encodings = Array.from(new Set(results.map((r) => r.metadata.encoding))).join(', ');

  return (
    <output className={styles.csvStatus} aria-live="polite">
      <strong>Parsing complete.</strong>
      <div className={styles.csvStatusSubtext}>
        Extracted {totalRows} transaction rows from {results.length} file(s). Encoding: {encodings}.
        {warningCount > 0 ? ` Skipped ${warningCount} invalid row(s).` : ''}
      </div>
    </output>
  );
}

