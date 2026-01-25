/**
 * CsvMapper - Maps between infrastructure adapter results and DTOs.
 */

import type { AdaptedBpdCsv } from '../../../infrastructure/files/adapters/BpdCsvAdapter';
import type { SupportedEncoding } from '../../../infrastructure/files/services/CsvParserService';
import type { CsvParseResultDto } from '../dtos/CsvParseResultDto';

export class CsvMapper {
  static toParseResultDto(params: {
    adapted: AdaptedBpdCsv;
    encoding: SupportedEncoding;
  }): CsvParseResultDto {
    const { adapted, encoding } = params;
    return {
      rows: adapted.rows,
      columnMapping: adapted.columnMapping,
      metadata: {
        encoding,
        headerSections: adapted.metadata.headerSections,
        headerRowNumbers: adapted.metadata.headerRowNumbers,
        skippedEmptyRows: adapted.metadata.skippedEmptyRows,
        skippedInvalidRows: adapted.metadata.skippedInvalidRows,
        totalExtractedRows: adapted.rows.length,
      },
    };
  }
}

