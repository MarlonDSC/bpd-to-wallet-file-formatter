/**
 * DateFilterService - Domain service for filtering transactions by date ranges
 */

import type { DateCalculationService } from '../../../infrastructure/dates/services/DateCalculationService';
import { DateRange } from '../value-objects/DateRange';
import { DateFilterOption } from '../value-objects/DateFilterOption';
import type { DateFilterType } from '../value-objects/DateFilterOption';
import {
  InvalidDateFilterError,
  NoDataForFilterError,
} from '../errors/DateFilterErrors';

export interface Transaction {
  date: string; // DD/MM/YYYY format
}

export class DateFilterService {
  private readonly dateCalculationService: DateCalculationService;

  constructor(dateCalculationService: DateCalculationService) {
    this.dateCalculationService = dateCalculationService;
  }

  /**
   * Filters transactions by the selected date filter option
   */
  filterTransactions(
    transactions: Transaction[],
    filterOption: DateFilterOption
  ): Transaction[] {
    if (transactions.length === 0) {
      return [];
    }

    if (!filterOption.isAvailable) {
      throw new NoDataForFilterError(
        filterOption.unavailableReason || 'Filter option is not available'
      );
    }

    const dateRange = this.getDateRangeForFilter(transactions, filterOption);
    return this.filterByDateRange(transactions, dateRange);
  }

  /**
   * Gets the date range for a filter option
   */
  getDateRangeForFilter(
    transactions: Transaction[],
    filterOption: DateFilterOption
  ): DateRange {
    switch (filterOption.type) {
      case 'all':
        return this.filterByAll(transactions);
      case 'last-month':
        return this.filterByLastMonth();
      case 'by-month':
        if (!filterOption.metadata?.month || !filterOption.metadata?.year) {
          throw new InvalidDateFilterError('By-month filter requires month and year');
        }
        return this.filterByMonth(
          filterOption.metadata.year,
          filterOption.metadata.month
        );
      case 'by-fortnightly-pay':
        if (!filterOption.metadata?.payPeriodDate) {
          throw new InvalidDateFilterError(
            'By-fortnightly-pay filter requires payPeriodDate'
          );
        }
        return this.filterByFortnightlyPay(filterOption.metadata.payPeriodDate);
      case 'by-week':
        if (!filterOption.metadata?.year || !filterOption.metadata?.weekNumber) {
          throw new InvalidDateFilterError('By-week filter requires year and weekNumber');
        }
        return this.filterByWeek(
          filterOption.metadata.year,
          filterOption.metadata.weekNumber
        );
      case 'last-week':
        return this.filterByLastWeek();
      default:
        throw new InvalidDateFilterError(`Unknown filter type: ${filterOption.type}`);
    }
  }

  /**
   * Filters transactions to include all dates
   */
  filterByAll(transactions: Transaction[]): DateRange {
    return DateRange.fromTransactions(transactions);
  }

  /**
   * Filters transactions from the previous calendar month
   */
  filterByLastMonth(): DateRange {
    const { year, month } = this.dateCalculationService.getLastMonth();
    return this.filterByMonth(year, month);
  }

  /**
   * Filters transactions for a specific month
   */
  filterByMonth(
    year: number,
    month: number
  ): DateRange {
    const { startDate, endDate } = this.dateCalculationService.getMonthRange(year, month);
    return new DateRange(startDate, endDate);
  }

  /**
   * Filters transactions for a specific fortnightly pay period
   * Pay period includes transactions from the pay date to the next pay date (exclusive)
   */
  filterByFortnightlyPay(payDate: Date): DateRange {
    const payDateCopy = new Date(payDate);
    payDateCopy.setHours(0, 0, 0, 0);

    // Find the next pay period date
    const year = payDateCopy.getFullYear();
    const month = payDateCopy.getMonth();
    const day = payDateCopy.getDate();

    let nextPayDate: Date;
    if (day === 15) {
      // Next pay is the last day of the month
      nextPayDate = new Date(year, month + 1, 0);
    } else {
      // This is the last day of the month, next pay is 15th of next month
      const nextMonth = month + 1;
      nextPayDate = new Date(year, nextMonth, 15);
    }

    return new DateRange(payDateCopy, nextPayDate);
  }

  /**
   * Filters transactions for a specific week
   */
  filterByWeek(
    year: number,
    weekNumber: number
  ): DateRange {
    const { startDate, endDate } = this.dateCalculationService.getWeekRange(year, weekNumber);
    return new DateRange(startDate, endDate);
  }

  /**
   * Filters transactions from the previous calendar week
   */
  filterByLastWeek(): DateRange {
    const { year, weekNumber } = this.dateCalculationService.getLastWeek();
    const { startDate, endDate } = this.dateCalculationService.getWeekRange(year, weekNumber);
    return new DateRange(startDate, endDate);
  }

  /**
   * Filters transactions by date range
   */
  private filterByDateRange(transactions: Transaction[], dateRange: DateRange): Transaction[] {
    return transactions.filter((transaction) => {
      const [day, month, year] = transaction.date.split('/').map(Number);
      const transactionDate = new Date(year, month - 1, day);
      return dateRange.contains(transactionDate);
    });
  }

  /**
   * Checks availability of filter options based on transaction data
   */
  checkFilterAvailability(
    transactions: Transaction[],
    filterType: DateFilterType
  ): { isAvailable: boolean; reason?: string } {
    if (transactions.length === 0) {
      return {
        isAvailable: filterType === 'all',
        reason: filterType === 'all' ? undefined : 'No transactions available',
      };
    }

    const dateRange = DateRange.fromTransactions(transactions);
    const now = new Date();

    switch (filterType) {
      case 'all':
        return { isAvailable: true };

      case 'last-month': {
        const { year, month } = this.dateCalculationService.getLastMonth();
        const { startDate, endDate } = this.dateCalculationService.getMonthRange(year, month);
        const isAvailable = dateRange.overlaps(new DateRange(startDate, endDate));
        return {
          isAvailable,
          reason: isAvailable
            ? undefined
            : `Last month's data not available. Current data is from ${dateRange.formatStartDate()} to ${dateRange.formatEndDate()}`,
        };
      }

      case 'last-week': {
        const { year, weekNumber } = this.dateCalculationService.getLastWeek();
        const { startDate, endDate } = this.dateCalculationService.getWeekRange(year, weekNumber);
        const isAvailable = dateRange.overlaps(new DateRange(startDate, endDate));
        const currentWeek = this.dateCalculationService.getWeekNumber(now);
        const lastAvailableWeek = this.dateCalculationService.getWeekNumber(dateRange.endDate);
        return { 
          isAvailable,
          reason: isAvailable
            ? undefined
            : `Last week's data not available. Current data is up to week ${lastAvailableWeek.weekNumber} ${lastAvailableWeek.year}, but we're at week ${currentWeek.weekNumber} ${currentWeek.year}`,
        };
      }

      case 'by-month':
      case 'by-fortnightly-pay':
      case 'by-week':
        // These are handled separately when generating options
        return { isAvailable: true };

      default:
        return { isAvailable: false, reason: 'Unknown filter type' };
    }
  }

  /**
   * Gets available months from transaction data
   */
  getAvailableMonths(transactions: Transaction[]): Array<{ year: number; month: number }> {
    if (transactions.length === 0) {
      return [];
    }
    const dateRange = DateRange.fromTransactions(transactions);
    return this.dateCalculationService.getMonthsInRange(
      dateRange.startDate,
      dateRange.endDate
    );
  }

  /**
   * Gets available fortnightly pay periods from transaction data
   */
  getAvailablePayPeriods(transactions: Transaction[]): Date[] {
    if (transactions.length === 0) {
      return [];
    }
    const dateRange = DateRange.fromTransactions(transactions);
    return this.dateCalculationService.getFortnightlyPayPeriods(
      dateRange.startDate,
      dateRange.endDate
    );
  }

  /**
   * Gets available weeks from transaction data
   */
  getAvailableWeeks(transactions: Transaction[]): Array<{ year: number; weekNumber: number }> {
    if (transactions.length === 0) {
      return [];
    }
    const dateRange = DateRange.fromTransactions(transactions);
    const weeks = new Set<string>();
    const current = new Date(dateRange.startDate);

    while (current <= dateRange.endDate) {
      const { year, weekNumber } = this.dateCalculationService.getWeekNumber(current);
      weeks.add(`${year}-${weekNumber}`);
      current.setDate(current.getDate() + 7); // Move to next week
    }

    return Array.from(weeks)
      .map((key) => {
        const [year, weekNumber] = key.split('-').map(Number);
        return { year, weekNumber };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.weekNumber - b.weekNumber;
      });
  }
}
