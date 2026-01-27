/**
 * ExcelWorkbook domain entity
 * Represents an Excel workbook with multiple worksheets.
 */

import { ExcelWorksheet } from './ExcelWorksheet';
import { InvalidWorksheetError } from '../errors/ExcelErrors';

export interface WorkbookMetadata {
  createdAt: Date;
  transactionCount: number;
  dateRange?: {
    minDate: string;
    maxDate: string;
  };
}

export class ExcelWorkbook {
  public readonly worksheets: readonly ExcelWorksheet[];
  public readonly metadata: WorkbookMetadata;

  constructor(params: {
    worksheets?: ExcelWorksheet[];
    metadata?: Partial<WorkbookMetadata>;
  }) {
    this.worksheets = params.worksheets ?? [];
    this.metadata = {
      createdAt: params.metadata?.createdAt ?? new Date(),
      transactionCount: params.metadata?.transactionCount ?? 0,
      dateRange: params.metadata?.dateRange,
    };

    // Validate worksheets
    this.worksheets.forEach((worksheet, index) => {
      try {
        worksheet.validate();
      } catch (error) {
        throw new InvalidWorksheetError(
          `Worksheet ${index + 1} is invalid: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * Adds a worksheet to the workbook and returns a new instance (immutable)
   */
  addWorksheet(worksheet: ExcelWorksheet): ExcelWorkbook {
    worksheet.validate();
    return new ExcelWorkbook({
      worksheets: [...this.worksheets, worksheet],
      metadata: this.metadata,
    });
  }

  /**
   * Validates the workbook
   */
  validate(): void {
    if (this.worksheets.length === 0) {
      throw new InvalidWorksheetError('Workbook must have at least one worksheet');
    }
    this.worksheets.forEach((worksheet, index) => {
      try {
        worksheet.validate();
      } catch (error) {
        throw new InvalidWorksheetError(
          `Worksheet ${index + 1} is invalid: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }
}
