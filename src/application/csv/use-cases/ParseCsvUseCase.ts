/**
 * ParseCsvUseCase - Orchestrates CSV parsing and transaction extraction.
 */

import type { CsvFileDto } from '../dtos/CsvFileDto';
import type { CsvParseResultDto } from '../dtos/CsvParseResultDto';
import { CsvError } from '../../../domain/csv/errors/CsvErrors';
import { BrowserCsvParserService } from '../../../infrastructure/files/services/CsvParserService';
import { BpdCsvAdapter } from '../../../infrastructure/files/adapters/BpdCsvAdapter';
import { CsvMapper } from '../mappers/CsvMapper';

export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

export class ParseCsvUseCase {
  private readonly csvParserService: BrowserCsvParserService;
  private readonly bpdCsvAdapter: BpdCsvAdapter;

  constructor(
    csvParserService: BrowserCsvParserService = new BrowserCsvParserService(),
    bpdCsvAdapter: BpdCsvAdapter = new BpdCsvAdapter()
  ) {
    this.csvParserService = csvParserService;
    this.bpdCsvAdapter = bpdCsvAdapter;
  }

  async execute(input: CsvFileDto): Promise<Result<CsvParseResultDto, CsvError>> {
    try {
      const parsed = await this.csvParserService.parse(input.file);
      if (import.meta.env.DEV) {
        console.log('[ParseCsv] file:', input.file.name, 'encoding:', parsed.encoding, 'raw rows:', parsed.rows.length);
        console.log('[ParseCsv] raw rows (first 15):', parsed.rows.slice(0, 15));
      }
      const adapted = this.bpdCsvAdapter.adapt(parsed.rows);
      if (import.meta.env.DEV) {
        console.log('[ParseCsv] adapted transactions:', adapted.rows.length, adapted.metadata);
        console.log('[ParseCsv] first rows:', adapted.rows.slice(0, 5));
      }
      const dto = CsvMapper.toParseResultDto({
        adapted,
        encoding: parsed.encoding,
      });

      return { success: true, data: dto };
    } catch (error) {
      if (error instanceof CsvError) {
        return { success: false, error };
      }
      throw error;
    }
  }
}

