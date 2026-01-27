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
    // Treat PapaParse row index as 1-based rowNumber for user-facing output.
    const rows = rawRows.map((cells, idx) => new CsvRow(idx + 1, cells));

    let currentStructure: BpdCsvStructure | null = null;
    let headerSections = 0;
    const headerRowNumbers: number[] = [];

    let skippedEmptyRows = 0;
    let skippedInvalidRows = 0;

    const extracted: AdaptedBpdCsv['rows'] = [];

    for (const row of rows) {
      if (row.isEmpty()) {
        skippedEmptyRows += 1;
        continue;
      }

      // Detect header rows anywhere (supports multiple sections).
      if (row.isHeaderRow(this.requiredColumns)) {
        const mapping = CsvColumnMapping.fromHeaderRow(row.data);
        currentStructure = new BpdCsvStructure({
          headerRowIndex: row.rowNumber,
          columnMapping: mapping,
        });
        currentStructure.validateStructure();

        headerSections += 1;
        headerRowNumbers.push(row.rowNumber);
        continue;
      }

      // Before the first header is found, treat rows as metadata and skip.
      if (!currentStructure) continue;

      const mapped = currentStructure.columnMapping.mapRow(row);

      // Required values must exist; otherwise skip but count warning.
      if (
        mapped.fechaPosteo === '' &&
        mapped.descripcion === '' &&
        mapped.montoTransaccion === ''
      ) {
        skippedInvalidRows += 1;
        continue;
      }

      if (
        mapped.fechaPosteo === '' ||
        mapped.descripcion === '' ||
        mapped.montoTransaccion === ''
      ) {
        skippedInvalidRows += 1;
        continue;
      }

      // Negate amounts for the second section (debits/negative transactions)
      // First section (headerSections === 1) contains credits (positive)
      // Second section (headerSections === 2) contains debits (negative)
      let montoTransaccion = mapped.montoTransaccion;
      if (headerSections === 2) {
        const amount = Number.parseFloat(montoTransaccion);
        if (!Number.isNaN(amount)) {
          montoTransaccion = (-amount).toString();
        }
      }

      extracted.push({
        rowNumber: row.rowNumber,
        fechaPosteo: mapped.fechaPosteo,
        descripcion: mapped.descripcion,
        montoTransaccion,
        rawData: [...row.data],
      });
    }

    if (headerSections === 0) {
      // If no header row is detected at all, treat this as missing columns.
      throw new MissingColumnError(this.requiredColumns);
    }

    const mapping = currentStructure?.columnMapping;
    if (!mapping) {
      throw new ParseError('Unable to determine column mapping from CSV headers.');
    }

    return {
      rows: extracted,
      columnMapping: {
        fechaPosteoIndex: mapping.fechaPosteoIndex,
        descripcionIndex: mapping.descripcionIndex,
        montoTransaccionIndex: mapping.montoTransaccionIndex,
      },
      metadata: {
        headerSections,
        headerRowNumbers,
        skippedEmptyRows,
        skippedInvalidRows,
      },
    };
  }
}

