/**
 * GenerateFilteredExcelUseCase - Generates Excel file with filtered transactions and appropriate filename
 */

import type { TransactionDto } from '../../transactions/dtos/TransactionDto';
import type { ExcelFileDto } from '../dtos/ExcelFileDto';
import type { DateFilterDto } from '../dtos/DateFilterDto';
import { ExcelMapper } from '../mappers/ExcelMapper';
import { DateFilterMapper } from '../mappers/DateFilterMapper';
import { DateFilterService } from '../../../domain/excel/services/DateFilterService';
import { ExcelFileNameGenerator } from '../../../domain/excel/services/ExcelFileNameGenerator';
import type { ExcelError } from '../../../domain/excel/errors/ExcelErrors';
import type { DateFilterError } from '../../../domain/excel/errors/DateFilterErrors';
import type { ExcelGeneratorService } from '../../../infrastructure/files/services/ExcelGeneratorService';
import { BrowserExcelGeneratorService } from '../../../infrastructure/files/services/ExcelGeneratorService';
import { BrowserDateCalculationService } from '../../../infrastructure/dates/services/DateCalculationService';

export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

export class GenerateFilteredExcelUseCase {
  private readonly excelGeneratorService: ExcelGeneratorService;
  private readonly dateFilterService: DateFilterService;
  private readonly fileNameGenerator: ExcelFileNameGenerator;

  constructor(
    excelGeneratorService?: ExcelGeneratorService,
    dateFilterService?: DateFilterService,
    fileNameGenerator?: ExcelFileNameGenerator
  ) {
    this.excelGeneratorService =
      excelGeneratorService || new BrowserExcelGeneratorService();
    this.dateFilterService =
      dateFilterService ||
      new DateFilterService(new BrowserDateCalculationService());
    this.fileNameGenerator = fileNameGenerator || new ExcelFileNameGenerator();
  }

  execute(
    transactions: TransactionDto[],
    filterDto: DateFilterDto
  ): Result<ExcelFileDto, ExcelError | DateFilterError> {
    try {
      if (transactions.length === 0) {
        return {
          success: false,
          error: new Error('Cannot generate Excel file from empty transaction list') as ExcelError,
        };
      }

      // Convert DTO to domain value object
      const filterOption = DateFilterMapper.toDomain(filterDto);

      // Filter transactions - DateFilterService works with any object that has a date field
      const filteredResult = this.dateFilterService.filterTransactions(
        transactions as Array<{ date: string }>,
        filterOption
      ) as TransactionDto[];

      if (filteredResult.length === 0) {
        return {
          success: false,
          error: new Error('No transactions match the selected filter') as ExcelError,
        };
      }

      // Convert filtered transactions to domain entity
      const workbook = ExcelMapper.toDomain(filteredResult);

      // Generate Excel file using infrastructure service
      const excelBuffer = this.excelGeneratorService.generateWorkbook(workbook);

      // Get date range for filename generation
      const dateRange = this.dateFilterService.getDateRangeForFilter(
        transactions,
        filterOption
      );

      // Generate filename based on filter
      const fileName = this.fileNameGenerator.generate(filterOption, dateRange);

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
            ? (error as ExcelError | DateFilterError)
            : new Error(String(error)) as ExcelError | DateFilterError,
      };
    }
  }
}
