/**
 * ExcelWorksheet domain entity
 * Represents a worksheet in an Excel workbook with headers and rows.
 */

import { ExcelRow } from '../value-objects/ExcelRow';
import { InvalidWorksheetError } from '../errors/ExcelErrors';

export class ExcelWorksheet {
  public readonly name: string;
  public readonly headers: readonly string[];
  public readonly rows: readonly ExcelRow[];

  private static readonly DEFAULT_HEADERS = [
    'Date',
    'Date (Import)',
    'Note',
    'Currency',
    'Amount',
  ] as const;

  constructor(params: {
    name: string;
    headers?: readonly string[];
    rows?: ExcelRow[];
  }) {
    this.name = params.name.trim();
    this.headers = params.headers ?? ExcelWorksheet.DEFAULT_HEADERS;
    this.rows = params.rows ?? [];

    if (this.name.length === 0) {
      throw new InvalidWorksheetError('Worksheet name cannot be empty');
    }

    if (this.headers.length === 0) {
      throw new InvalidWorksheetError('Worksheet must have at least one header');
    }
  }

  /**
   * Adds a row to the worksheet and returns a new instance (immutable)
   */
  addRow(row: ExcelRow): ExcelWorksheet {
    row.validate();
    return new ExcelWorksheet({
      name: this.name,
      headers: this.headers,
      rows: [...this.rows, row],
    });
  }

  /**
   * Adds multiple rows to the worksheet and returns a new instance (immutable)
   */
  addRows(rows: ExcelRow[]): ExcelWorksheet {
    rows.forEach((row) => row.validate());
    return new ExcelWorksheet({
      name: this.name,
      headers: this.headers,
      rows: [...this.rows, ...rows],
    });
  }

  /**
   * Formats headers for Excel export
   * Returns headers as an array
   */
  formatHeaders(): string[] {
    return [...this.headers];
  }

  /**
   * Formats cells for Excel export
   * Returns rows as arrays
   */
  formatCells(): Array<[string, string, string, string, number]> {
    return this.rows.map((row) => row.toArray());
  }

  /**
   * Validates the worksheet
   */
  validate(): void {
    if (this.name.length === 0) {
      throw new InvalidWorksheetError('Worksheet name cannot be empty');
    }
    if (this.headers.length === 0) {
      throw new InvalidWorksheetError('Worksheet must have at least one header');
    }
    this.rows.forEach((row, index) => {
      try {
        row.validate();
      } catch (error) {
        throw new InvalidWorksheetError(
          `Row ${index + 1} is invalid: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }
}
