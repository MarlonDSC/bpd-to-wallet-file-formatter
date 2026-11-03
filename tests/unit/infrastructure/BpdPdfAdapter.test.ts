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

  describe('inbox (al corte) statement layout', () => {
    const inboxHeader: string[][] = [
      ['9 de julio de 2026'],
      ['CTA CTE NOMINA TRANSACCIONAL', '833802887'],
      ['FECHAS DE'],
      ['No. DE CHEQUE', 'DETALLE', 'D É BITO RD$ CR É DITO RD$ BALANCE RD$'],
      ['ENTRADA TRANSAC.'],
    ];

    it('rejects inbox grids when layout is print', () => {
      const grid: string[][] = [
        ...inboxHeader,
        ['16JUN 15JUN CLARO RECAR 8494100479 -50.00 6,948.81'],
      ];
      expect(() => adapter.adapt(grid, 'print')).toThrow(MissingColumnError);
    });

    it('uses TRANSAC date and negative debit amount', () => {
      const grid: string[][] = [
        ...inboxHeader,
        ['16JUN 15JUN CLARO RECAR 8494100479 SANT, O DOMINGO -50.00 6,948.81'],
        ['616619504902 15062 POS W/D DD 00032348'],
      ];

      const out = adapter.adapt(grid, 'inbox');
      expect(out.rows).toHaveLength(1);
      expect(out.rows[0].fechaPosteo).toBe('15/06/2026');
      expect(out.rows[0].montoTransaccion).toBe('-50');
      expect(out.rows[0].descripcion).toContain('CLARO RECAR');
      expect(out.rows[0].descripcion).toContain('8494100479');
      expect(out.rows[0].descripcion).not.toMatch(/16JUN|15JUN/i);
      expect(out.rows[0].descripcion).not.toContain('616619504902');
    });

    it('parses payroll-style credit (.00 + credit + balance)', () => {
      const grid: string[][] = [
        ...inboxHeader,
        ['15JUN 15JUN NOMINA 15 DE JUNIO 2026 RD$ .00', '47,045.00 47,798.81'],
      ];

      const out = adapter.adapt(grid, 'inbox');
      expect(out.rows).toHaveLength(1);
      expect(out.rows[0].fechaPosteo).toBe('15/06/2026');
      expect(out.rows[0].montoTransaccion).toBe('47045');
      expect(out.rows[0].descripcion).toContain('NOMINA');
    });

    it('parses positive credit without debit column zero', () => {
      const grid: string[][] = [
        ...inboxHeader,
        ['26JUN 26JUN MB desde 810421255 EDDY SUBUYU', '28,400.00 87,200.14'],
      ];

      const out = adapter.adapt(grid, 'inbox');
      expect(out.rows).toHaveLength(1);
      expect(out.rows[0].fechaPosteo).toBe('26/06/2026');
      expect(out.rows[0].montoTransaccion).toBe('28400');
      expect(out.rows[0].descripcion).toContain('MB desde');
      expect(out.rows[0].descripcion).toContain('810421255');
    });

    it('skips BALANCE ANTERIOR and BALANCE AL CORTE', () => {
      const grid: string[][] = [
        ...inboxHeader,
        ['10JUN BALANCE ANTERIOR 53.81'],
        ['11JUN 11JUN BANCO POPULAR OF PLAZA SA SANT, IAGO 616223435472 4,000.00 4,053.81'],
        ['110626 DEP TACTE BPD1378'],
        ['09JUL BALANCE AL CORTE', '11,956.44'],
      ];

      const out = adapter.adapt(grid, 'inbox');
      expect(out.rows).toHaveLength(1);
      expect(out.rows[0].fechaPosteo).toBe('11/06/2026');
      expect(out.rows[0].montoTransaccion).toBe('4000');
      expect(out.rows[0].descripcion).toContain('BANCO POPULAR');
    });

    it('continues after marketing block and page-2 header', () => {
      const grid: string[][] = [
        ...inboxHeader,
        ['22JUN 21JUN MB a 0808420129 HILDA E SOLARE -1,812.00 3,188.43'],
        ['Uso de canales', 'D é bitos/Cr é ditos'],
        ['Banca Digital'],
        ['TELEBANCO POPULAR / SERVICIOS: 809-544-5555'],
        ['Pag 2'],
        ['MARLON DAVID SUBUYU CANTE 9 de julio de 2026'],
        ['FECHAS DE'],
        ['No. DE CHEQUE', 'DETALLE', 'D É BITO RD$ CR É DITO RD$ BALANCE RD$'],
        ['ENTRADA TRANSAC.'],
        ['01JUL 01JUL CARGO MENSUAL TD CLASICA -75.00 117,196.67'],
      ];

      const out = adapter.adapt(grid, 'inbox');
      expect(out.rows).toHaveLength(2);
      expect(out.rows[0].fechaPosteo).toBe('21/06/2026');
      expect(out.rows[0].descripcion).toContain('0808420129');
      expect(out.rows[0].montoTransaccion).toBe('-1812');
      expect(out.rows[1].fechaPosteo).toBe('01/07/2026');
      expect(out.rows[1].montoTransaccion).toBe('-75');
      expect(out.rows[1].descripcion).toContain('CARGO MENSUAL');
    });

    it('appends tax period date-range narrative to previous note', () => {
      const grid: string[][] = [
        ...inboxHeader,
        [
          '26JUN 26JUN PAGO IMPUESTO 0.15% DGII, 1 TRANS POR $ 1,812.00 Del -2.72 87,197.42',
        ],
        ['19/06/2026 Al 25/06/2026'],
      ];

      const out = adapter.adapt(grid, 'inbox');
      expect(out.rows).toHaveLength(1);
      expect(out.rows[0].montoTransaccion).toBe('-2.72');
      expect(out.rows[0].descripcion).toContain('PAGO IMPUESTO');
      expect(out.rows[0].descripcion).toContain('19/06/2026 Al 25/06/2026');
    });

    it('infers year from statement header for abbreviated dates', () => {
      const grid: string[][] = [
        ['10 de junio de 2026'],
        ['No. DE CHEQUE', 'DETALLE', 'D É BITO RD$ CR É DITO RD$ BALANCE RD$'],
        ['ENTRADA TRANSAC.'],
        ['15MAY 15MAY NOMINA 15 DE MAYO 2026 RD$ .00', '47,045.00 47,227.38'],
      ];

      const out = adapter.adapt(grid, 'inbox');
      expect(out.rows).toHaveLength(1);
      expect(out.rows[0].fechaPosteo).toBe('15/05/2026');
      expect(out.rows[0].montoTransaccion).toBe('47045');
    });
  });
});
