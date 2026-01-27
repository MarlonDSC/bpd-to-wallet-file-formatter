/**
 * ExcelFileNameGenerator - Domain service for generating Excel filenames based on date filters
 */

import { DateRange } from '../value-objects/DateRange';
import type { DateFilterOption } from '../value-objects/DateFilterOption';

export class ExcelFileNameGenerator {
  /**
   * Generates filename for "All" filter
   * Format: YYYY-MM-DD_YYYY-MM-DD.xlsx
   */
  generateForAll(dateRange: DateRange): string {
    return `${dateRange.formatForFilename()}.xlsx`;
  }

  /**
   * Generates filename for month filter
   * Format: [Month] YYYY.xlsx (e.g., November 2025.xlsx)
   */
  generateForMonth(month: number, year: number): string {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${monthNames[month - 1]} ${year}.xlsx`;
  }

  /**
   * Generates filename for fortnightly pay period
   * Format: YYYY_Mmm_DD.xlsx (e.g., 2024_Jan_15.xlsx, 2024_Jan_31.xlsx)
   */
  generateForFortnightlyPay(date: Date): string {
    const year = date.getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    return `${year}_${month}_${day}.xlsx`;
  }

  /**
   * Generates filename for week filter
   * Format: YYYY_W[week-number].xlsx (e.g., 2025_W2.xlsx)
   */
  generateForWeek(year: number, weekNumber: number): string {
    return `${year}_W${weekNumber}.xlsx`;
  }

  /**
   * Calculates ISO 8601 week number for a date
   */
  private calculateWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // Convert Sunday (0) to 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Set to Thursday of the week
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Generates filename based on filter option
   */
  generate(filterOption: DateFilterOption, dateRange: DateRange): string {
    switch (filterOption.type) {
      case 'all':
        return this.generateForAll(dateRange);

      case 'last-month':
      case 'by-month':
        if (!filterOption.metadata?.month || !filterOption.metadata?.year) {
          throw new Error('Month filter requires month and year in metadata');
        }
        return this.generateForMonth(filterOption.metadata.month, filterOption.metadata.year);

      case 'by-fortnightly-pay':
        if (!filterOption.metadata?.payPeriodDate) {
          throw new Error('Fortnightly pay filter requires payPeriodDate in metadata');
        }
        return this.generateForFortnightlyPay(filterOption.metadata.payPeriodDate);

      case 'by-week':
        if (!filterOption.metadata?.year || !filterOption.metadata?.weekNumber) {
          throw new Error('Week filter requires year and weekNumber in metadata');
        }
        return this.generateForWeek(filterOption.metadata.year, filterOption.metadata.weekNumber);

      case 'last-week':
        // For last-week, calculate week number from the start date of the range
        // This is a fallback if metadata is not provided
        { if (filterOption.metadata?.year && filterOption.metadata?.weekNumber) {
          return this.generateForWeek(filterOption.metadata.year, filterOption.metadata.weekNumber);
        }
        // Calculate from dateRange start date (should match the filtered week)
        const startDate = dateRange.startDate;
        // Use a simple calculation - get the week number from the start date
        // This is a fallback, but metadata should always be provided
        const year = startDate.getFullYear();
        const weekNumber = this.calculateWeekNumber(startDate);
        return this.generateForWeek(year, weekNumber); }

      default:
        throw new Error(`Unknown filter type: ${filterOption.type}`);
    }
  }
}
