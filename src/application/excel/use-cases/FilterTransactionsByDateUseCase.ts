/**
 * FilterTransactionsByDateUseCase - Filters transactions based on selected date filter
 */

import type { TransactionDto } from '../../transactions/dtos/TransactionDto';
import { DateFilterService } from '../../../domain/excel/services/DateFilterService';
import { DateFilterMapper } from '../mappers/DateFilterMapper';
import type { DateFilterDto } from '../dtos/DateFilterDto';
import type { DateFilterError } from '../../../domain/excel/errors/DateFilterErrors';
import { BrowserDateCalculationService } from '../../../infrastructure/dates/services/DateCalculationService';

export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

export class FilterTransactionsByDateUseCase {
  private readonly dateFilterService: DateFilterService;

  constructor(dateFilterService?: DateFilterService) {
    this.dateFilterService =
      dateFilterService ||
      new DateFilterService(new BrowserDateCalculationService());
  }

  execute(
    transactions: TransactionDto[],
    filterDto: DateFilterDto
  ): Result<TransactionDto[], DateFilterError> {
    try {
      // Convert DTO to domain value object
      const filterOption = DateFilterMapper.toDomain(filterDto);

      // Filter transactions - DateFilterService works with any object that has a date field
      const filtered = this.dateFilterService.filterTransactions(
        transactions as Array<{ date: string }>,
        filterOption
      ) as TransactionDto[];

      return {
        success: true,
        data: filtered,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? (error as DateFilterError)
            : new Error(String(error)) as DateFilterError,
      };
    }
  }
}
