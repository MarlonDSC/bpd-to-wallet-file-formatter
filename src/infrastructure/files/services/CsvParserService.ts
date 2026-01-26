/**
 * CsvParserService - Parses CSV files and handles encoding detection/decoding.
 */

import Papa from 'papaparse';
import { EncodingError, InvalidCsvFormatError, ParseError } from '../../../domain/csv/errors/CsvErrors';

export type SupportedEncoding = 'UTF-8' | 'Windows-1252';

export interface ParsedCsv {
  encoding: SupportedEncoding;
  rows: string[][];
}

export interface CsvParserService {
  parse(file: File): Promise<ParsedCsv>;
  detectEncoding(bytes: Uint8Array): SupportedEncoding;
  decode(bytes: Uint8Array, encoding: SupportedEncoding): string;
}

export class BrowserCsvParserService implements CsvParserService {
  async parse(file: File): Promise<ParsedCsv> {
    let bytes: Uint8Array;
    try {
      const ab = await file.arrayBuffer();
      bytes = new Uint8Array(ab);
    } catch (e) {
      throw new ParseError(`Unable to read file bytes: ${(e as Error).message}`);
    }

    const encoding = this.detectEncoding(bytes);
    const content = this.decode(bytes, encoding);

    const parsed = Papa.parse<string[]>(content, {
      delimiter: '', // auto-detect
      skipEmptyLines: false, // we handle empties ourselves to preserve row numbers
      quoteChar: '"',
      escapeChar: '"',
      header: false,
    });

    if (parsed.errors && parsed.errors.length > 0) {
      // PapaParse can emit non-fatal "errors" like UndetectableDelimiter.
      // We treat only real parsing issues as fatal.
      const fatalErrors = parsed.errors.filter(
        (e) =>
          e.code !== 'UndetectableDelimiter' &&
          e.type !== 'Delimiter'
      );

      if (fatalErrors.length > 0) {
        const first = fatalErrors[0];
        throw new InvalidCsvFormatError(
          first?.message
            ? `Invalid CSV format. Unable to parse file. ${first.message}`
            : 'Invalid CSV format. Unable to parse file.'
        );
      }
    }

    const rows = (parsed.data ?? []).map((row) =>
      Array.isArray(row) ? row.map((cell) => (cell ?? '').toString()) : []
    );

    if (rows.length === 0) {
      throw new InvalidCsvFormatError('Invalid CSV format. Unable to parse file.');
    }

    return { encoding, rows };
  }

  detectEncoding(bytes: Uint8Array): SupportedEncoding {
    // BOM detection for UTF-8
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return 'UTF-8';
    }

    // Try strict UTF-8 decode; if it fails, fallback to Windows-1252.
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      decoder.decode(bytes);
      return 'UTF-8';
    } catch {
      return 'Windows-1252';
    }
  }

  decode(bytes: Uint8Array, encoding: SupportedEncoding): string {
    const label = encoding === 'UTF-8' ? 'utf-8' : 'windows-1252';
    try {
      return new TextDecoder(label).decode(bytes);
    } catch (e) {
      throw new EncodingError(
        `Unable to decode file using ${encoding}. ${(
          e as Error
        ).message}`
      );
    }
  }
}

