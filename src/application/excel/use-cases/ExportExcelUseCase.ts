/**
 * ExportExcelUseCase - Handles Excel file download
 */

import type { ExcelFileDto } from '../dtos/ExcelFileDto';
import type { ExcelError } from '../../../domain/excel/errors/ExcelErrors';
import type { FileDownloadService } from '../../../infrastructure/files/services/FileDownloadService';

export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

export class ExportExcelUseCase {
  private readonly fileDownloadService: FileDownloadService;

  constructor(fileDownloadService: FileDownloadService) {
    this.fileDownloadService = fileDownloadService;
  }

  execute(excelFile: ExcelFileDto): Result<void, ExcelError> {
    try {
      this.fileDownloadService.downloadFile(
        excelFile.workbook,
        excelFile.fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? (error as ExcelError)
            : new Error(String(error)) as ExcelError,
      };
    }
  }
}
