/**
 * Adapts PDF-derived text rows into the same shape as BpdCsvAdapter for the transaction pipeline.
 * Uses Fecha efectiva / FECHA TRANSAC as the wallet date (mapped to fechaPosteo in row DTOs).
 *
 * Supports:
 * - Tabular layout: one header row with separate cells per column.
 * - Fragmented BPD PDF layout: header text split across rows; transactions as prefix lines + anchor row (two dates) + continuation lines.
 * - Al corte statement layout: DETALLE / DÉBITO / CRÉDITO with abbreviated Spanish dates (e.g. 15JUN).
 */

import type { AdaptedBpdCsv } from './BpdCsvAdapter';
import { MissingColumnError, ParseError } from '../../../domain/csv/errors/CsvErrors';
import type { BpdPdfLayout } from '../../../domain/files/value-objects/BpdUploadMode';
import { normalizeBpdAmountString } from '../../utils/services/BpdAmountNormalize';

/** Layout selection for PDF adaptation. `auto` tries print (Fecha efectiva) then inbox (al corte). */
export type BpdPdfAdaptLayout = BpdPdfLayout | 'auto';

function normalizeHeaderToken(value: string): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '');
}

function normalizeBlob(value: string): string {
  return normalizeHeaderToken(value).replaceAll(/\s+/g, ' ');
}

const DATE_CELL = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

const SPANISH_MONTH_ABBR: Record<string, number> = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

const SPANISH_MONTH_NAME: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const AL_CORTE_AMOUNT_TOKEN = /-?(?:\d{1,3}(?:,\d{3})*|\d+)\.\d{2}|\.00/g;
const AL_CORTE_TXN_START =
  /^(\d{1,2})(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)(?:\s+(\d{1,2})(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC))?\b/i;

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
  adapt(rawRows: string[][], layout: BpdPdfAdaptLayout = 'auto'): AdaptedBpdCsv {
    if (layout === 'inbox') {
      return this.adaptAlCorteStatementLayout(rawRows);
    }

    // print (bank-account) or auto: Fecha efectiva / Descripción / Monto
    try {
      return this.adaptTabularLayout(rawRows);
    } catch (err) {
      if (!(err instanceof MissingColumnError)) {
        throw err;
      }
      try {
        return this.adaptFragmentedStatementLayout(rawRows);
      } catch (fragErr) {
        if (fragErr instanceof MissingColumnError && layout === 'auto') {
          return this.adaptAlCorteStatementLayout(rawRows);
        }
        throw fragErr;
      }
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

  private isAlCorteHeaderBlob(blob: string): boolean {
    const lo = normalizeBlob(blob);
    const hasDetalleDebitoCredito =
      lo.includes('detalle') &&
      (lo.includes('debito') || /\bd\s*e\s*bito\b/.test(lo)) &&
      (lo.includes('credito') || /\bc\s*r\s*edito\b/.test(lo));
    const hasEntradaTransac = lo.includes('entrada') && lo.includes('transac');
    return hasDetalleDebitoCredito || hasEntradaTransac;
  }

  private findAlCorteHeaderEnd(rawRows: string[][]): number {
    for (let i = 0; i < rawRows.length; i++) {
      for (let w = 0; w <= 4 && i + w < rawRows.length; w++) {
        const blob = rawRows
          .slice(i, i + w + 1)
          .map((r) => r.join(' '))
          .join(' ');
        if (this.isAlCorteHeaderBlob(blob)) {
          return i + w;
        }
      }
    }
    return -1;
  }

  private parseAlCorteStatementMeta(rawRows: string[][]): {
    year: number;
    statementMonth: number;
  } | null {
    const re =
      /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i;
    for (const row of rawRows) {
      const m = row.join(' ').match(re);
      if (!m) {
        continue;
      }
      const monthName = normalizeHeaderToken(m[2]);
      const statementMonth = SPANISH_MONTH_NAME[monthName];
      const year = Number.parseInt(m[3], 10);
      if (statementMonth && year > 1900) {
        return { year, statementMonth };
      }
    }
    return null;
  }

  private formatAlCorteDate(
    day: number,
    monthAbbr: string,
    meta: { year: number; statementMonth: number }
  ): string | null {
    const month = SPANISH_MONTH_ABBR[monthAbbr.toLowerCase()];
    if (!month || day < 1 || day > 31) {
      return null;
    }
    // Statement in January with December (or late) txn months → previous calendar year.
    let year = meta.year;
    if (month - meta.statementMonth > 6) {
      year -= 1;
    }
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    return `${dd}/${mm}/${year}`;
  }

  private isAlCorteBalanceMarker(joined: string): boolean {
    const lo = normalizeBlob(joined);
    return lo.includes('balance anterior') || lo.includes('balance al corte');
  }

  private isAlCorteHeaderOrMarketing(row: readonly string[]): boolean {
    const lo = normalizeBlob(row.join(' '));
    if (this.isAlCorteHeaderBlob(lo)) {
      return true;
    }
    if (lo.includes('fechas de') || lo === 'entrada transac.' || lo === 'entrada transac') {
      return true;
    }
    if (lo.includes('uso de canales') || lo.includes('telebanco popular')) {
      return true;
    }
    if (lo.includes('banca digital') || lo.includes('soluciones financieras')) {
      return true;
    }
    if (lo.includes('su estado de cuenta') || lo.includes('informacion sobre su estado')) {
      return true;
    }
    if (/^pag\s*\d+/i.test(lo)) {
      return true;
    }
    return false;
  }

  private isAlCorteContinuationLine(joined: string): boolean {
    const s = joined.trim();
    if (!s) {
      return true;
    }
    if (/^POS\b/i.test(s) || /POS\s*\/?\s*D/i.test(s) || /POS\s*W\s*\/\s*D/i.test(s)) {
      return true;
    }
    if (/RET\s*E\s*CHK/i.test(s) || /DEP\s+T?ACTE/i.test(s) || /OS\s*W\s*\/\s*D/i.test(s)) {
      return true;
    }
    if (/^\d{1,12}(\s+\d{1,12})*$/.test(s)) {
      return true;
    }
    if (/^\d{5,}\s+\d{4,}/.test(s) && /POS|DD|W\s*\/\s*D/i.test(s)) {
      return true;
    }
    if (/\bP\s*W\s*\/\s*D\b/i.test(s)) {
      return true;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}\s+Al\s+\d{1,2}\/\d{1,2}\/\d{4}$/i.test(s)) {
      return false; // narrative date-range — handled separately
    }
    if (s.length <= 20 && /^[\d\s]+$/.test(s)) {
      return true;
    }
    if (/^\d{1,3}(?:\.\d{1,2})?%$/.test(s)) {
      return true;
    }
    return false;
  }

  private isAlCorteDateRangeNarrative(joined: string): boolean {
    return /\d{1,2}\/\d{1,2}\/\d{4}\s+Al\s+\d{1,2}\/\d{1,2}\/\d{4}/i.test(joined.trim());
  }

  private extractAlCorteAmount(joined: string): string | null {
    const tokens = [...joined.matchAll(AL_CORTE_AMOUNT_TOKEN)].map((m) => m[0]);
    if (tokens.length === 0) {
      return null;
    }

    const debit = tokens.find((t) => t.startsWith('-'));
    if (debit) {
      return normalizeBpdAmountString(debit);
    }

    // Payroll / credit column: ".00" (or 0.00) then credit then balance.
    const zeroIdx = tokens.findIndex((t) => {
      const n = Number.parseFloat(t.replaceAll(',', ''));
      return !Number.isNaN(n) && n === 0;
    });
    if (zeroIdx >= 0) {
      for (let i = zeroIdx + 1; i < tokens.length; i++) {
        const n = Number.parseFloat(tokens[i].replaceAll(',', ''));
        if (!Number.isNaN(n) && n !== 0) {
          return normalizeBpdAmountString(tokens[i]);
        }
      }
    }

    // Credit + balance: take first positive; ignore trailing balance.
    const first = tokens[0];
    if (first) {
      return normalizeBpdAmountString(first);
    }
    return null;
  }

  private buildAlCorteNote(joined: string): string {
    let note = joined
      .replace(AL_CORTE_TXN_START, ' ')
      .replace(AL_CORTE_AMOUNT_TOKEN, ' ')
      .replaceAll(/\b\d{12,}\b/g, ' ')
      .replace(/\bRD\$\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    note = note.replace(/^[/\s,.:-]+|[/\s,.:-]+$/g, '').trim();
    return note;
  }

  private parseAlCorteTransactionRow(
    joined: string,
    rowNumber: number,
    meta: { year: number; statementMonth: number }
  ): AdaptedBpdCsv['rows'][number] | null {
    const start = joined.match(AL_CORTE_TXN_START);
    if (!start) {
      return null;
    }
    if (this.isAlCorteBalanceMarker(joined)) {
      return null;
    }

    const day1 = Number.parseInt(start[1], 10);
    const mon1 = start[2];
    const hasSecond = Boolean(start[3] && start[4]);
    const day = hasSecond ? Number.parseInt(start[3], 10) : day1;
    const mon = hasSecond ? start[4] : mon1;

    const fechaPosteo = this.formatAlCorteDate(day, mon, meta);
    if (!fechaPosteo) {
      return null;
    }

    const montoTransaccion = this.extractAlCorteAmount(joined);
    if (!montoTransaccion) {
      return null;
    }

    const descripcion = this.buildAlCorteNote(joined);
    if (!descripcion) {
      return null;
    }

    return {
      rowNumber,
      fechaPosteo,
      descripcion,
      montoTransaccion,
      rawData: [fechaPosteo, descripcion, montoTransaccion],
    };
  }

  private adaptAlCorteStatementLayout(rawRows: string[][]): AdaptedBpdCsv {
    const headerEnd = this.findAlCorteHeaderEnd(rawRows);
    if (headerEnd < 0) {
      throw new MissingColumnError(['Fecha efectiva', 'Descripción', 'Monto'], 'pdf');
    }

    const meta = this.parseAlCorteStatementMeta(rawRows);
    if (!meta) {
      throw new ParseError(
        'Could not determine statement year from al corte PDF (expected “N de <mes> de YYYY”).'
      );
    }

    const extracted: AdaptedBpdCsv['rows'] = [];
    let skippedEmptyRows = 0;
    let skippedInvalidRows = 0;

    for (let i = headerEnd + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (row.every((c) => !(c ?? '').toString().trim())) {
        skippedEmptyRows += 1;
        continue;
      }

      const joined = row.join(' ').replace(/\s+/g, ' ').trim();
      if (!joined) {
        skippedEmptyRows += 1;
        continue;
      }

      if (this.isAlCorteBalanceMarker(joined) || this.isAlCorteHeaderOrMarketing(row)) {
        continue;
      }

      if (this.isAlCorteDateRangeNarrative(joined) && extracted.length > 0) {
        const prev = extracted[extracted.length - 1];
        const range = joined.match(
          /(\d{1,2}\/\d{1,2}\/\d{4}\s+Al\s+\d{1,2}\/\d{1,2}\/\d{4})/i
        );
        if (range) {
          prev.descripcion = `${prev.descripcion} ${range[1]}`.trim();
          prev.rawData = [prev.fechaPosteo, prev.descripcion, prev.montoTransaccion];
        }
        continue;
      }

      if (this.isAlCorteContinuationLine(joined)) {
        continue;
      }

      if (!AL_CORTE_TXN_START.test(joined)) {
        continue;
      }
      const parsed = this.parseAlCorteTransactionRow(joined, i + 1, meta);
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
