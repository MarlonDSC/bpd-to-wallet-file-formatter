/**
 * CsvFileDto - Input DTO for CSV parsing
 */

import type { SupportedEncoding } from '../../../infrastructure/files/services/CsvParserService';

export interface CsvFileDto {
  file: File;
  /**
   * Optional pre-read content. If provided, the parser may ignore `file`.
   */
  content?: string;
  /**
   * Optional encoding hint; normally detected automatically.
   */
  encoding?: SupportedEncoding;
}

