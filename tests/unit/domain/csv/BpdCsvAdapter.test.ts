import { describe, it, expect } from 'vitest';
import { BpdCsvAdapter } from '../../../../src/infrastructure/files/adapters/BpdCsvAdapter';
import { MissingColumnError } from '../../../../src/domain/csv/errors/CsvErrors';

describe('BpdCsvAdapter', () => {
  it('should throw MissingColumnError when no header row is found', () => {
    const adapter = new BpdCsvAdapter();
    const rows = [
      ['some', 'metadata'],
      ['still', 'no', 'headers'],
      ['10/01/2010', 'Payment', '100.00'],
    ];

    expect(() => adapter.adapt(rows)).toThrow(MissingColumnError);
  });

  it('should extract rows across multiple header sections', () => {
    const adapter = new BpdCsvAdapter();
    const rows = [
      // metadata rows
      ['Banco Popular Dominicano'],
      ['Cuenta: 123'],
      [''],
      // section 1
      ['Fecha Posteo', 'Descripción', 'Monto Transacción'],
      ['10/01/2010', 'Café', '123.45'],
      ['11/01/2010', 'Payment', '-50.00'],
      [''],
      // section 2
      ['Fecha Posteo', 'Descripción', 'Monto Transacción'],
      ['12/01/2010', 'Transfer', '10.00'],
    ];

    const res = adapter.adapt(rows);

    expect(res.metadata.headerSections).toBe(2);
    expect(res.rows).toHaveLength(3);
    expect(res.rows.map((r) => r.rowNumber)).toEqual([5, 6, 9]);
    expect(res.rows[0].descripcion).toBe('Café');
  });

  it('should skip empty and invalid rows and count them as warnings', () => {
    const adapter = new BpdCsvAdapter();
    const rows = [
      ['Fecha Posteo', 'Descripción', 'Monto Transacción'],
      ['10/01/2010', 'Payment', '100.00'],
      [''], // empty
      ['11/01/2010', '', '50.00'], // invalid missing description
      ['', '', ''], // empty-ish (all blank)
      ['12/01/2010', 'Ok', '10.00'],
    ];

    const res = adapter.adapt(rows);
    expect(res.rows).toHaveLength(2);
    expect(res.metadata.skippedEmptyRows).toBeGreaterThanOrEqual(2);
    expect(res.metadata.skippedInvalidRows).toBe(1);
  });
});

