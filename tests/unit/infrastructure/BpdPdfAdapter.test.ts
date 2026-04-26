import { describe, it, expect } from 'vitest';
import { BpdPdfAdapter } from '../../../src/infrastructure/files/adapters/BpdPdfAdapter';
import { MissingColumnError } from '../../../src/domain/csv/errors/CsvErrors';

describe('BpdPdfAdapter', () => {
  const adapter = new BpdPdfAdapter();

  it('maps header and data rows using Fecha efectiva and Monto', () => {
    const grid: string[][] = [
      ['Some', 'banner', 'text'],
      [
        'Fecha Posteo',
        'Fecha efectiva',
        'Nro. De cheque',
        'Nro. de referencia',
        'Descripción',
        'Monto',
        'Balance',
      ],
      [
        '16/03/2026',
        '13/03/2026',
        '1302',
        '',
        'PedidosYa POS',
        '$464.62-',
        '$51,029.76',
      ],
    ];

    const out = adapter.adapt(grid);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].fechaPosteo).toBe('13/03/2026');
    expect(out.rows[0].descripcion).toBe('PedidosYa POS');
    expect(out.rows[0].montoTransaccion).toBe('-464.62');
    expect(out.columnMapping.fechaPosteoIndex).toBe(1);
    expect(out.metadata.headerSections).toBe(1);
  });

  it('merges continuation row without date into previous description', () => {
    const grid: string[][] = [
      ['Fecha Posteo', 'Fecha efectiva', 'Descripción', 'Monto', 'Balance'],
      ['16/03/2026', '13/03/2026', 'Line one', '$10.00', '$100'],
      ['', '', 'Line two extra', '', ''],
    ];

    const out = adapter.adapt(grid);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].descripcion).toContain('Line one');
    expect(out.rows[0].descripcion).toContain('Line two extra');
  });

  it('throws when required headers are missing', () => {
    const grid: string[][] = [['A', 'B', 'C']];
    expect(() => adapter.adapt(grid)).toThrow(MissingColumnError);
  });

  it('parses fragmented BPD PDF text grid (split header + prefix/anchor/suffix)', () => {
    const grid: string[][] = [
      ['23 de abril de 2026, 7:47 p. m.'],
      ['Cuenta Corriente / 833802887'],
      ['Transacciones'],
      ['Fecha Fecha Nro. de'],
      ['Nro. de cheque Descripción Monto Balance'],
      ['posteo efectiva referencia'],
      ['TEMU.COM 1302 480611'],
      ['16/03/2026 13/03/2026 0000000001302', '607201217480 130326 POS W/D DD $1,389.46- $51,494.38'],
      ['00000001'],
      ['PedidosYa*Scory Sant o Domingo'],
      ['16/03/2026 14/03/2026 0607314905464', '607314905464 140326 POS W/D $464.62- $51,029.76'],
      ['DD 80007250'],
    ];

    const out = adapter.adapt(grid);
    expect(out.rows.length).toBeGreaterThanOrEqual(2);
    expect(out.rows[0].fechaPosteo).toBe('13/03/2026');
    expect(out.rows[0].descripcion).toContain('TEMU.COM');
    expect(out.rows[0].descripcion).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(out.rows[0].descripcion).not.toContain('0000000001302');
    expect(out.rows[0].descripcion).not.toContain('607201217480');
    expect(out.rows[0].montoTransaccion).toBe('-1389.46');
    expect(out.rows[1].fechaPosteo).toBe('14/03/2026');
    expect(out.rows[1].descripcion).toContain('PedidosYa');
    expect(out.rows[1].descripcion).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(out.rows[1].descripcion).not.toContain('0607314905464');
    expect(out.rows[1].montoTransaccion).toBe('-464.62');
  });

  it('keeps 10-digit account-style numbers in the note (e.g. after MB a)', () => {
    const grid: string[][] = [
      ['Fecha Fecha Nro. de'],
      ['Nro. de cheque Descripción Monto Balance'],
      ['posteo efectiva referencia'],
      ['MB a 0775420003 JUNIOR J HENRI'],
      ['20/03/2026 19/03/2026 0000000009999', 'extra narrative $12.34- $100.00'],
    ];

    const out = adapter.adapt(grid);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].descripcion).toContain('0775420003');
    expect(out.rows[0].descripcion).toContain('JUNIOR J HENRI');
  });

  it('skips repeated table header rows and keeps POS lines with the prior transaction', () => {
    const grid: string[][] = [
      ['Fecha Fecha Nro. de'],
      ['Nro. de cheque Descripción Monto Balance'],
      ['posteo efectiva referencia'],
      ['FIRST MERCHANT'],
      ['10/03/2026 09/03/2026 1111111111111', 'ref text $5.00- $99.00'],
      ['POS W/D DD 05947917'],
      ['Fecha Fecha Nro. de'],
      ['Nro. de cheque Descripción Monto Balance'],
      ['posteo efectiva referencia'],
      ['SM NACIONAL EL DORADO SANT IAGO'],
      ['16/03/2026 14/03/2026 0607314905464', '608023191872 210326 POS W /D DD 07049639 $4,107.80- $46,556.96'],
    ];

    const out = adapter.adapt(grid);
    expect(out.rows.length).toBe(2);
    expect(out.rows[0].descripcion).toContain('FIRST MERCHANT');
    expect(out.rows[0].descripcion.toLowerCase()).not.toContain('fecha fecha');
    expect(out.rows[1].descripcion).toContain('SM NACIONAL EL DORADO');
    expect(out.rows[1].descripcion).not.toMatch(/fecha\s+fecha/i);
    expect(out.rows[1].descripcion).toContain('POS');
  });
});
