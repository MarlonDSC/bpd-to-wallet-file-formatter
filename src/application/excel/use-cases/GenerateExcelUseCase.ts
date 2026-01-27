/**
 * GenerateExcelUseCase - Orchestrates Excel generation logic
 */

import type { TransactionDto } from '../../transactions/dtos/TransactionDto';
import type { ExcelFileDto } from '../dtos/ExcelFileDto';
import { ExcelMapper } from '../mappers/ExcelMapper';
import type { ExcelError } from '../../../domain/excel/errors/ExcelErrors';
import type { ExcelGeneratorService } from '../../../infrastructure/files/services/ExcelGeneratorService';
import type { ExcelWorkbook } from '../../../domain/excel/entities/ExcelWorkbook';

export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

export class GenerateExcelUseCase {
  private readonly excelGeneratorService: ExcelGeneratorService;

  constructor(excelGeneratorService: ExcelGeneratorService) {
    this.excelGeneratorService = excelGeneratorService;
  }

  execute(transactions: TransactionDto[]): Result<ExcelFileDto, ExcelError> {
    try {
      if (transactions.length === 0) {
        return {
          success: false,
          error: new Error('Cannot generate Excel file from empty transaction list') as ExcelError,
        };
      }

      // Convert transactions to domain entity
      const workbook = ExcelMapper.toDomain(transactions);

      // Generate Excel file using infrastructure service
      const excelBuffer = this.excelGeneratorService.generateWorkbook(workbook);

      // Generate file name
      const fileName = this.generateFileName(workbook);

      // Convert to DTO
      const dto = ExcelMapper.toDto(excelBuffer, fileName);

      return {
        success: true,
        data: dto,
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

  private generateFileName(workbook: ExcelWorkbook): string {
    const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-').slice(0, -5);
    
    if (workbook.metadata.dateRange) {
      const { minDate, maxDate } = workbook.metadata.dateRange;
      // Format dates for filename (remove slashes)
      const minDateFormatted = minDate.replaceAll('/', '-');
      const maxDateFormatted = maxDate.replaceAll('/', '-');
      return `transactions_${minDateFormatted}_to_${maxDateFormatted}_${timestamp}.xlsx`;
    }
    
    return `transactions_${timestamp}.xlsx`;
  }
}
