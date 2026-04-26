/**
 * ParsePdfUseCase - Extracts BPD statement rows from a PDF into CsvParseResultDto shape.
 */

import type { PdfFileDto } from '../dtos/PdfFileDto';
import type { CsvParseResultDto } from '../../csv/dtos/CsvParseResultDto';
import { CsvError } from '../../../domain/csv/errors/CsvErrors';
import { PdfTextGridExtractorService } from '../../../infrastructure/files/services/PdfTextGridExtractorService';
import { BpdPdfAdapter } from '../../../infrastructure/files/adapters/BpdPdfAdapter';
import { CsvMapper } from '../../csv/mappers/CsvMapper';

export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

export class ParsePdfUseCase {
  private readonly pdfExtractor: PdfTextGridExtractorService;
  private readonly bpdPdfAdapter: BpdPdfAdapter;

  constructor(
    pdfExtractor: PdfTextGridExtractorService = new PdfTextGridExtractorService(),
    bpdPdfAdapter: BpdPdfAdapter = new BpdPdfAdapter()
  ) {
    this.pdfExtractor = pdfExtractor;
    this.bpdPdfAdapter = bpdPdfAdapter;
  }

  async execute(input: PdfFileDto): Promise<Result<CsvParseResultDto, CsvError>> {
    try {
      const rows = await this.pdfExtractor.extractRows(input.file);
      if (import.meta.env.DEV) {
        console.log('[ParsePdf] file:', input.file.name, 'text grid rows:', rows.length);
        console.log('[ParsePdf] text grid (first 25 rows):', rows.slice(0, 25));
      }
      const adapted = this.bpdPdfAdapter.adapt(rows);
      if (import.meta.env.DEV) {
        console.log('[ParsePdf] adapted transactions:', adapted.rows.length, adapted.metadata);
        console.log('[ParsePdf] first rows (fechaPosteo=fecha efectiva):', adapted.rows.slice(0, 5));
      }
      const dto = CsvMapper.toParseResultDto({
        adapted,
        encoding: 'UTF-8',
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
