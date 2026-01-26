/**
 * CsvColumnMapping value object
 * Holds indices for required BPD columns and provides mapping helpers.
 */

import { CsvRow } from '../entities/CsvRow';
import { MissingColumnError } from '../errors/CsvErrors';

export interface MappedBpdRow {
  fechaPosteo: string;
  descripcion: string;
  montoTransaccion: string;
}

export class CsvColumnMapping {
  public readonly fechaPosteoIndex: number;
  public readonly descripcionIndex: number;
  public readonly montoTransaccionIndex: number;

  constructor(params: {
    fechaPosteoIndex: number;
    descripcionIndex: number;
    montoTransaccionIndex: number;
  }) {
    this.fechaPosteoIndex = params.fechaPosteoIndex;
    this.descripcionIndex = params.descripcionIndex;
    this.montoTransaccionIndex = params.montoTransaccionIndex;
  }

  static requiredColumns(): string[] {
    return ['Fecha Posteo', 'Descripción', 'Monto Transacción'];
  }

  static fromHeaderRow(headerCells: readonly string[]): CsvColumnMapping {
    const idx = (label: string): number => {
      const normalized = CsvColumnMapping.normalizeHeaderToken(label);
      const candidates = headerCells.map((element) => CsvColumnMapping.normalizeHeaderToken(element));
      return candidates.indexOf(normalized);
    };

    // Prefer accented labels, but accept common variants too.
    const fechaPosteoIndex = idx('Fecha Posteo');
    const descripcionIndex =
      idx('Descripción') === -1 ? idx('Descripcion') : idx('Descripción');
    const montoTransaccionIndex =
      idx('Monto Transacción') === -1
        ? idx('Monto Transacción')
        : idx('Monto Transaccion');

    const mapping = new CsvColumnMapping({
      fechaPosteoIndex,
      descripcionIndex,
      montoTransaccionIndex,
    });
    mapping.validateMapping();
    return mapping;
  }

  validateMapping(): void {
    const missing: string[] = [];
    if (this.fechaPosteoIndex < 0) missing.push('Fecha Posteo');
    if (this.descripcionIndex < 0) missing.push('Descripción');
    if (this.montoTransaccionIndex < 0) missing.push('Monto Transacción');
    if (missing.length > 0) throw new MissingColumnError(missing);
  }

  mapRow(row: CsvRow): MappedBpdRow {
    return {
      fechaPosteo: row.getColumnValue(this.fechaPosteoIndex).trim(),
      descripcion: row.getColumnValue(this.descripcionIndex).trim(),
      montoTransaccion: row.getColumnValue(this.montoTransaccionIndex).trim(),
    };
  }

  private static normalizeHeaderToken(value: string): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replaceAll(/\p{Diacritic}/gu, '');
  }
}

