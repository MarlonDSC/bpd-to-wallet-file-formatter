/**
 * BpdCsvAdapter - Adapts raw parsed CSV data into BPD transaction rows.
 *
 * Responsibilities:
 * - Detect header rows (supports multiple header sections)
 * - Validate required columns exist
 * - Extract transaction rows with original row numbers
 * - Skip metadata/empty rows
 * - Count invalid rows as warnings
 */

import { CsvRow } from '../../../domain/csv/entities/CsvRow';
import { CsvColumnMapping } from '../../../domain/csv/value-objects/CsvColumnMapping';
import { BpdCsvStructure } from '../../../domain/csv/value-objects/BpdCsvStructure';
import { MissingColumnError, ParseError } from '../../../domain/csv/errors/CsvErrors';

export interface AdaptedBpdCsv {
  rows: Array<{
    rowNumber: number;
    fechaPosteo: string;
    descripcion: string;
    montoTransaccion: string;
    rawData: string[];
  }>;
  columnMapping: {
    fechaPosteoIndex: number;
    descripcionIndex: number;
    montoTransaccionIndex: number;
  };
  metadata: {
    headerSections: number;
    headerRowNumbers: number[];
    skippedEmptyRows: number;
    skippedInvalidRows: number;
  };
}

export class BpdCsvAdapter {
  private readonly requiredColumns = CsvColumnMapping.requiredColumns();

  adapt(rawRows: string[][]): AdaptedBpdCsv {
    const rows = this.createCsvRows(rawRows);
    const state = this.initializeProcessingState();

    for (const row of rows) {
      if (row.isEmpty()) {
        state.skippedEmptyRows += 1;
        continue;
      }

      if (row.isHeaderRow(this.requiredColumns)) {
        this.processHeaderRow(row, state);
        continue;
      }

      if (!state.currentStructure) {
        // Before the first header is found, treat rows as metadata and skip.
        continue;
      }

      const transactionRow = this.tryExtractTransactionRow(row, state);
      if (transactionRow) {
        state.extracted.push(transactionRow);
      }
    }

    this.validateFinalState(state);
    return this.buildResult(state);
  }

  private createCsvRows(rawRows: string[][]): CsvRow[] {
    // Treat PapaParse row index as 1-based rowNumber for user-facing output.
    return rawRows.map((cells, idx) => new CsvRow(idx + 1, cells));
  }

  private initializeProcessingState() {
    return {
      currentStructure: null as BpdCsvStructure | null,
      headerSections: 0,
      headerRowNumbers: [] as number[],
      skippedEmptyRows: 0,
      skippedInvalidRows: 0,
      extracted: [] as AdaptedBpdCsv['rows'],
    };
  }

  private processHeaderRow(
    row: CsvRow,
    state: ReturnType<typeof this.initializeProcessingState>
  ): void {
    const mapping = CsvColumnMapping.fromHeaderRow(row.data);
    state.currentStructure = new BpdCsvStructure({
      headerRowIndex: row.rowNumber,
      columnMapping: mapping,
    });
    state.currentStructure.validateStructure();

    state.headerSections += 1;
    state.headerRowNumbers.push(row.rowNumber);
  }

  private tryExtractTransactionRow(
    row: CsvRow,
    state: ReturnType<typeof this.initializeProcessingState>
  ): AdaptedBpdCsv['rows'][number] | null {
    const mapped = state.currentStructure!.columnMapping.mapRow(row);

    if (!this.isValidTransactionRow(mapped)) {
      state.skippedInvalidRows += 1;
      return null;
    }

    const montoTransaccion = this.adjustAmountForSection(
      mapped.montoTransaccion,
      state.headerSections
    );

    return {
      rowNumber: row.rowNumber,
      fechaPosteo: mapped.fechaPosteo,
      descripcion: mapped.descripcion,
      montoTransaccion,
      rawData: [...row.data],
    };
  }

  private isValidTransactionRow(mapped: {
    fechaPosteo: string;
    descripcion: string;
    montoTransaccion: string;
  }): boolean {
    // Check if all fields are empty (completely empty row)
    const allEmpty =
      mapped.fechaPosteo === '' &&
      mapped.descripcion === '' &&
      mapped.montoTransaccion === '';

    if (allEmpty) {
      return false;
    }

    // Check if any required field is missing
    return (
      mapped.fechaPosteo !== '' &&
      mapped.descripcion !== '' &&
      mapped.montoTransaccion !== ''
    );
  }

  private adjustAmountForSection(
    amountString: string,
    headerSections: number
  ): string {
    // First section (headerSections === 1) contains credits (positive)
    // Second section (headerSections === 2) contains debits (negative)
    if (headerSections !== 2) {
      return amountString;
    }

    const amount = Number.parseFloat(amountString);
    if (Number.isNaN(amount)) {
      return amountString;
    }

    return (-amount).toString();
  }

  private validateFinalState(
    state: ReturnType<typeof this.initializeProcessingState>
  ): void {
    if (state.headerSections === 0) {
      throw new MissingColumnError(this.requiredColumns);
    }

    if (!state.currentStructure?.columnMapping) {
      throw new ParseError('Unable to determine column mapping from CSV headers.');
    }
  }

  private buildResult(
    state: ReturnType<typeof this.initializeProcessingState>
  ): AdaptedBpdCsv {
    const mapping = state.currentStructure!.columnMapping;

    return {
      rows: state.extracted,
      columnMapping: {
        fechaPosteoIndex: mapping.fechaPosteoIndex,
        descripcionIndex: mapping.descripcionIndex,
        montoTransaccionIndex: mapping.montoTransaccionIndex,
      },
      metadata: {
        headerSections: state.headerSections,
        headerRowNumbers: state.headerRowNumbers,
        skippedEmptyRows: state.skippedEmptyRows,
        skippedInvalidRows: state.skippedInvalidRows,
      },
    };
  }
}

