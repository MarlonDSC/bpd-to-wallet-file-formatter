/**
 * Adapts PDF-derived text rows into the same shape as BpdCsvAdapter for the transaction pipeline.
 * Uses Fecha efectiva as the wallet date (mapped to fechaPosteo in row DTOs).
 *
 * Supports:
 * - Tabular layout: one header row with separate cells per column.
 * - Fragmented BPD PDF layout: header text split across rows; transactions as prefix lines + anchor row (two dates) + continuation lines.
 */

import type { AdaptedBpdCsv } from './BpdCsvAdapter';
import { MissingColumnError, ParseError } from '../../../domain/csv/errors/CsvErrors';
import { normalizeBpdAmountString } from '../../utils/services/BpdAmountNormalize';

function normalizeHeaderToken(value: string): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '');
}

const DATE_CELL = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

function findHeaderRowIndices(row: readonly string[]): {
  fechaEfectivaIndex: number;
  descripcionIndex: number;
  montoIndex: number;
} | null {
  let fechaEfectivaIndex = -1;
  let descripcionIndex = -1;
  let montoIndex = -1;

  for (let i = 0; i < row.length; i++) {
    const n = normalizeHeaderToken(row[i]);
    if (
      fechaEfectivaIndex < 0 &&
      (n === 'fecha efectiva' || n.includes('fecha efectiva'))
    ) {
      fechaEfectivaIndex = i;
    }
    if (descripcionIndex < 0 && (n === 'descripcion' || n.includes('descripcion'))) {
      descripcionIndex = i;
    }
    if (
      montoIndex < 0 &&
      (n === 'monto' || n === 'monto transaccion' || n.startsWith('monto '))
    ) {
      montoIndex = i;
    }
  }

  if (fechaEfectivaIndex < 0 || descripcionIndex < 0 || montoIndex < 0) {
    return null;
  }
  return { fechaEfectivaIndex, descripcionIndex, montoIndex };
}

function isLikelyHeaderRow(row: readonly string[]): boolean {
  return findHeaderRowIndices(row) !== null;
}

export class BpdPdfAdapter {
  adapt(rawRows: string[][]): AdaptedBpdCsv {
    try {
      return this.adaptTabularLayout(rawRows);
    } catch (err) {
      if (err instanceof MissingColumnError) {
        return this.adaptFragmentedStatementLayout(rawRows);
      }
      throw err;
    }
  }

  private adaptTabularLayout(rawRows: string[][]): AdaptedBpdCsv {
    let headerIndex = -1;
    let mapping: {
      fechaEfectivaIndex: number;
      descripcionIndex: number;
      montoIndex: number;
    } | null = null;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const m = findHeaderRowIndices(row);
      if (m) {
        headerIndex = i;
        mapping = m;
        break;
      }
    }

    if (!mapping || headerIndex < 0) {
      throw new MissingColumnError(['Fecha efectiva', 'Descripción', 'Monto'], 'pdf');
    }

    const headerRowNumber = headerIndex + 1;
    const { fechaEfectivaIndex, descripcionIndex, montoIndex } = mapping;
    const extracted: AdaptedBpdCsv['rows'] = [];
    let skippedEmptyRows = 0;
    let skippedInvalidRows = 0;

    const maxCol = Math.max(fechaEfectivaIndex, descripcionIndex, montoIndex);

    const pushRow = (rowNumber: number, cells: string[]) => {
      const fechaPosteo = (cells[fechaEfectivaIndex] ?? '').trim();
      const descripcion = (cells[descripcionIndex] ?? '').trim();
      const montoRaw = (cells[montoIndex] ?? '').trim();
      const montoTransaccion = normalizeBpdAmountString(montoRaw);

      const allEmpty =
        fechaPosteo === '' && descripcion === '' && montoTransaccion === '';
      if (allEmpty) {
        skippedEmptyRows += 1;
        return;
      }

      if (fechaPosteo === '' || descripcion === '' || montoTransaccion === '') {
        skippedInvalidRows += 1;
        return;
      }

      extracted.push({
        rowNumber,
        fechaPosteo,
        descripcion,
        montoTransaccion,
        rawData: [...cells],
      });
    };

    const mergedRows: { rowNumber: number; cells: string[] }[] = [];

    for (let i = headerIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 1;

      if (isLikelyHeaderRow(row)) {
        break;
      }

      if (row.every((c) => (c ?? '').trim() === '')) {
        skippedEmptyRows += 1;
        continue;
      }

      const cells = [...row];
      while (cells.length <= maxCol) {
        cells.push('');
      }

      const dateStr = (cells[fechaEfectivaIndex] ?? '').trim();
      const looksLikeDate = DATE_CELL.test(dateStr);

      if (!looksLikeDate && mergedRows.length > 0) {
        const prev = mergedRows[mergedRows.length - 1];
        const extraDesc = (cells[descripcionIndex] ?? '').trim();
        if (extraDesc !== '') {
          const parts = [...prev.cells];
          parts[descripcionIndex] = `${parts[descripcionIndex] ?? ''} ${extraDesc}`.trim();
          prev.cells = parts;
        }
        continue;
      }

      mergedRows.push({ rowNumber, cells });
    }

    for (const { rowNumber, cells } of mergedRows) {
      pushRow(rowNumber, cells);
    }

    if (extracted.length === 0) {
      throw new ParseError('No transaction rows could be extracted from the PDF.');
    }

    return {
      rows: extracted,
      columnMapping: {
        fechaPosteoIndex: fechaEfectivaIndex,
        descripcionIndex,
        montoTransaccionIndex: montoIndex,
      },
      metadata: {
        headerSections: 1,
        headerRowNumbers: [headerRowNumber],
        skippedEmptyRows,
        skippedInvalidRows,
      },
    };
  }

  private findFragmentedHeaderEnd(rawRows: string[][]): number {
    const hasRequired = (blob: string): boolean => {
      const lo = blob
        .toLowerCase()
        .normalize('NFD')
        .replaceAll(/\p{Diacritic}/gu, '');
      return lo.includes('efectiva') && lo.includes('descripcion') && lo.includes('monto');
    };

    for (let i = 0; i < rawRows.length; i++) {
      for (let w = 0; w <= 5 && i + w < rawRows.length; w++) {
        const blob = rawRows
          .slice(i, i + w + 1)
          .map((r) => r.join(' '))
          .join(' ');
        if (hasRequired(blob)) {
          return i + w;
        }
      }
    }
    return -1;
  }

  private rowHasTwoDates(row: readonly string[]): boolean {
    const s = row.join(' ');
    return /\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}\/\d{1,2}\/\d{4}/.test(s);
  }

  private isLikelyContinuationLine(row: readonly string[]): boolean {
    const s = row.join(' ').trim();
    if (!s) {
      return true;
    }
    if (/^\d{1,12}$/.test(s)) {
      return true;
    }
    if (/^DD\s/i.test(s)) {
      return true;
    }
    if (s.length <= 14 && /^[\d\s]+$/.test(s)) {
      return true;
    }
    if (/POS\s*W\s*\/\s*D/i.test(s)) {
      return true;
    }
    if (/\bW\s*\/\s*D\b/i.test(s) && /\bDD\s+\d/i.test(s)) {
      return true;
    }
    return false;
  }

  /**
   * Repeated table header blocks (e.g. new PDF page) must not be absorbed as transaction prefix.
   */
  private isStatementTableHeaderDebris(row: readonly string[]): boolean {
    const lo = row
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replaceAll(/\p{Diacritic}/gu, '');
    if (lo.includes('posteo efectiva referencia')) {
      return true;
    }
    if (lo.includes('fecha fecha') && lo.includes('nro')) {
      return true;
    }
    if (
      (lo.includes('nro. de cheque') || lo.includes('nro de cheque')) &&
      (lo.includes('descripcion') || lo.includes('monto') || lo.includes('balance'))
    ) {
      return true;
    }
    if (lo.includes('descripcion') && lo.includes('monto') && lo.includes('balance')) {
      return true;
    }
    return false;
  }

  /**
   * Note (Descripción): strip date tokens and only very long numeric refs (cheque / BPD refs),
   * so shorter tokens like account numbers after "MB a" stay in the note.
   */
  private stripDatesAndChequeRefsFromNote(s: string): string {
    let t = s.replaceAll(/\d{1,2}\/\d{1,2}\/\d{4}/g, ' ').replaceAll(/\b\d{12,}\b/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    return t.replace(/^[/\s,.:-]+|[/\s,.:-]+$/g, '').trim();
  }


  private parseFragmentedTransactionBlock(
    prefix: string[][],
    anchor: string[],
    suffix: string[][],
    rowNumber: number
  ): AdaptedBpdCsv['rows'][number] | null {
    const anchorJoined = anchor.map((c) => String(c ?? '').trim()).filter(Boolean).join(' ');
    const suffixJoined = suffix
      .map((r) => r.join(' ').trim())
      .filter(Boolean)
      .join(' ');
    const bodyForDatesAndAmounts = [anchorJoined, suffixJoined]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const dm = bodyForDatesAndAmounts.match(
      /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})/
    );
    if (!dm) {
      return null;
    }

    const fechaEfectiva = dm[2];
    const allAmounts = [...bodyForDatesAndAmounts.matchAll(/\$[\d,]+\.\d{2}-?/g)];
    const debit = allAmounts.find((m) => m[0].endsWith('-'));
    const montoRaw = debit?.[0] ?? allAmounts[0]?.[0] ?? null;
    if (!montoRaw) {
      return null;
    }

    const montoTransaccion = normalizeBpdAmountString(montoRaw);

    const prefixText = prefix
      .map((r) => r.join(' ').trim())
      .filter(Boolean)
      .join(' ')
      .trim();

    let anchorDescPart = '';
    if (anchor.length >= 2) {
      anchorDescPart = anchor
        .slice(1)
        .map((c) => String(c ?? '').trim())
        .filter(Boolean)
        .join(' ');
      anchorDescPart = anchorDescPart.replace(/\$[\d,]+\.\d{2}-?/g, '').trim();
    } else {
      const a0 = String(anchor[0] ?? '').trim();
      const localDm = a0.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (localDm && localDm.index !== undefined) {
        anchorDescPart = a0.slice(localDm.index + localDm[0].length).trim();
        anchorDescPart = anchorDescPart.replace(/\$[\d,]+\.\d{2}-?/g, '').trim();
      }
    }

    const suffixNarrative = suffix
      .map((r) => r.join(' ').trim())
      .filter(
        (s) =>
          s.length > 0 &&
          !/^DD\s/i.test(s) &&
          !/^\d{1,12}$/.test(s) &&
          !this.isLikelyContinuationLine([s])
      )
      .join(' ')
      .trim();

    let descripcion = [prefixText, anchorDescPart, suffixNarrative]
      .filter(Boolean)
      .join(' ')
      .trim();
    descripcion = this.stripDatesAndChequeRefsFromNote(descripcion);

    if (
      /posteo\s+efectiva\s+referencia|fecha\s+fecha\s+nro|nro\.?\s*de\s*cheque.*monto.*balance/i.test(
        descripcion
      )
    ) {
      descripcion = this.stripEmbeddedTableHeaderCopy(descripcion);
    }

    if (!descripcion || !fechaEfectiva) {
      return null;
    }

    return {
      rowNumber,
      fechaPosteo: fechaEfectiva,
      descripcion,
      montoTransaccion,
      rawData: [fechaEfectiva, descripcion, montoTransaccion],
    };
  }

  /**
   * Drop a repeated column-title run (e.g. after a page break) from the note; keep merchant text after it.
   */
  private stripEmbeddedTableHeaderCopy(s: string): string {
    const lower = s.toLowerCase();
    const kw = 'referencia';
    const idx = lower.lastIndexOf(kw);
    if (idx < 0) {
      return s;
    }
    const after = s.slice(idx + kw.length).trim();
    if (after.length > 4 && /[A-Za-z*]/.test(after)) {
      return after.replace(/^\W+/, '').trim();
    }
    return s;
  }

  private adaptFragmentedStatementLayout(rawRows: string[][]): AdaptedBpdCsv {
    const headerEnd = this.findFragmentedHeaderEnd(rawRows);
    if (headerEnd < 0) {
      throw new MissingColumnError(['Fecha efectiva', 'Descripción', 'Monto'], 'pdf');
    }

    const extracted: AdaptedBpdCsv['rows'] = [];
    let skippedEmptyRows = 0;
    let skippedInvalidRows = 0;
    let i = headerEnd + 1;

    while (i < rawRows.length) {
      if (rawRows[i].every((c) => !(c ?? '').toString().trim())) {
        skippedEmptyRows += 1;
        i += 1;
        continue;
      }

      const prefix: string[][] = [];
      while (i < rawRows.length && !this.rowHasTwoDates(rawRows[i])) {
        if (rawRows[i].every((c) => !(c ?? '').toString().trim())) {
          skippedEmptyRows += 1;
        } else if (this.isStatementTableHeaderDebris(rawRows[i])) {
          // Skip repeated statement table headers (e.g. new PDF page).
        } else {
          prefix.push(rawRows[i]);
        }
        i += 1;
      }

      if (i >= rawRows.length) {
        break;
      }

      const anchorRow = rawRows[i];
      const anchorIdx = i;
      i += 1;

      const suffix: string[][] = [];
      while (
        i < rawRows.length &&
        this.isLikelyContinuationLine(rawRows[i]) &&
        !this.rowHasTwoDates(rawRows[i])
      ) {
        if (rawRows[i].every((c) => !(c ?? '').toString().trim())) {
          skippedEmptyRows += 1;
        } else {
          suffix.push(rawRows[i]);
        }
        i += 1;
      }

      const parsed = this.parseFragmentedTransactionBlock(
        prefix,
        anchorRow,
        suffix,
        anchorIdx + 1
      );
      if (parsed) {
        extracted.push(parsed);
      } else {
        skippedInvalidRows += 1;
      }
    }

    if (extracted.length === 0) {
      throw new ParseError('No transaction rows could be extracted from the PDF.');
    }

    return {
      rows: extracted,
      columnMapping: {
        fechaPosteoIndex: 0,
        descripcionIndex: 1,
        montoTransaccionIndex: 2,
      },
      metadata: {
        headerSections: 1,
        headerRowNumbers: [headerEnd + 1],
        skippedEmptyRows,
        skippedInvalidRows,
      },
    };
  }
}
