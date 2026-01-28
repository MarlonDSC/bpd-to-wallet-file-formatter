/**
 * GetAvailableDateFiltersUseCase - Determines which date filter options are available
 */

import type { TransactionDto } from '../../transactions/dtos/TransactionDto';
import { DateFilterService } from '../../../domain/excel/services/DateFilterService';
import { DateFilterOption } from '../../../domain/excel/value-objects/DateFilterOption';
import { DateFilterMapper } from '../mappers/DateFilterMapper';
import type { DateFilterDto } from '../dtos/DateFilterDto';
import type { DateFilterError } from '../../../domain/excel/errors/DateFilterErrors';
import { BrowserDateCalculationService } from '../../../infrastructure/dates/services/DateCalculationService';

export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

export class GetAvailableDateFiltersUseCase {
  private readonly dateFilterService: DateFilterService;
  private readonly dateCalculationService: BrowserDateCalculationService;

  constructor(dateFilterService?: DateFilterService) {
    this.dateCalculationService = new BrowserDateCalculationService();
    this.dateFilterService =
      dateFilterService ||
      new DateFilterService(this.dateCalculationService);
  }

  execute(transactions: TransactionDto[]): Result<DateFilterDto[], DateFilterError> {
    try {
      const filters: DateFilterOption[] = [];

      // Always add "All" option
      const allFilter = DateFilterOption.createAll(transactions.length > 0);
      filters.push(allFilter);

      // Check "Last month" availability
      const lastMonthAvailability = this.dateFilterService.checkFilterAvailability(
        transactions,
        'last-month'
      );
      const lastMonthFilter = DateFilterOption.createLastMonth(
        lastMonthAvailability.isAvailable,
        lastMonthAvailability.reason
      );
      filters.push(lastMonthFilter);

      // Get available months
      const availableMonths = this.dateFilterService.getAvailableMonths(transactions);
      if (availableMonths.length > 1) {
        // Only show "By month" if there are multiple months
        availableMonths.forEach(({ year, month }) => {
          filters.push(
            DateFilterOption.createByMonth(month, year, true)
          );
        });
      } else if (availableMonths.length === 1) {
        // Single month - add it but mark as disabled with explanation
        const { year, month } = availableMonths[0];
        filters.push(
          DateFilterOption.createByMonth(
            month,
            year,
            false,
            'Only one month of data available'
          )
        );
      }

      // Get available fortnightly pay periods
      const availablePayPeriods = this.dateFilterService.getAvailablePayPeriods(transactions);
      availablePayPeriods.forEach((payDate) => {
        filters.push(DateFilterOption.createByFortnightlyPay(payDate, true));
      });

      // Get available weeks
      const availableWeeks = this.dateFilterService.getAvailableWeeks(transactions);
      availableWeeks.forEach(({ year, weekNumber }) => {
        filters.push(DateFilterOption.createByWeek(year, weekNumber, true));
      });

      // Check "Last week" availability
      const lastWeekAvailability = this.dateFilterService.checkFilterAvailability(
        transactions,
        'last-week'
      );
      const { year: lastWeekYear, weekNumber: lastWeekNumber } =
        this.dateCalculationService.getLastWeek();
      // Add metadata for last week filter
      if (lastWeekAvailability.isAvailable) {
        const lastWeekFilter = new DateFilterOption({
          type: 'last-week',
          label: 'Last week',
          isAvailable: true,
          metadata: { year: lastWeekYear, weekNumber: lastWeekNumber },
        });
        filters.push(lastWeekFilter);
      } else {
        const lastWeekFilter = DateFilterOption.createLastWeek(
          false,
          lastWeekAvailability.reason
        );
        filters.push(lastWeekFilter);
      }

      // Convert to DTOs
      const dtos = filters.map((filter) => DateFilterMapper.toDto(filter));

      return {
        success: true,
        data: dtos,
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
