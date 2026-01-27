/**
 * BpdCsvStructure value object
 * Captures the detected header row and validated mapping for BPD CSV files.
 */

import { CsvColumnMapping } from './CsvColumnMapping';

export class BpdCsvStructure {
  public readonly headerRowIndex: number;
  public readonly columnMapping: CsvColumnMapping;
  public readonly requiredColumns: readonly string[];

  constructor(params: {
    headerRowIndex: number;
    columnMapping: CsvColumnMapping;
    requiredColumns?: readonly string[];
  }) {
    this.headerRowIndex = params.headerRowIndex;
    this.columnMapping = params.columnMapping;
    this.requiredColumns =
      params.requiredColumns ?? CsvColumnMapping.requiredColumns();
  }

  validateStructure(): void {
    this.columnMapping.validateMapping();
  }

  getColumnIndex(columnName: 'Fecha Posteo' | 'Descripción' | 'Monto Transacción'): number {
    switch (columnName) {
      case 'Fecha Posteo':
        return this.columnMapping.fechaPosteoIndex;
      case 'Descripción':
        return this.columnMapping.descripcionIndex;
      case 'Monto Transacción':
        return this.columnMapping.montoTransaccionIndex;
      default: {
        // Exhaustive by design, but keep runtime fallback.
        return -1;
      }
    }
  }
}

