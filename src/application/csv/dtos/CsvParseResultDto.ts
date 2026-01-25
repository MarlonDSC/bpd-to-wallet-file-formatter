/**
 * CsvParseResultDto - Output DTO for CSV parsing
 */

import type { SupportedEncoding } from '../../../infrastructure/files/services/CsvParserService';
import type { CsvRowDto } from './CsvRowDto';

export interface CsvParseResultDto {
  rows: CsvRowDto[];
  columnMapping: {
    fechaPosteoIndex: number;
    descripcionIndex: number;
    montoTransaccionIndex: number;
  };
  metadata: {
    encoding: SupportedEncoding;
    headerSections: number;
    headerRowNumbers: number[];
    skippedEmptyRows: number;
    skippedInvalidRows: number;
    totalExtractedRows: number;
  };
}

