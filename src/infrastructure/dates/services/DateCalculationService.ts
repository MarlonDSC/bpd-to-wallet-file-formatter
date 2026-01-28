/**
 * DateCalculationService - Provides date calculation utilities
 * Implements ISO 8601 week number calculation and other date operations
 */

export interface DateCalculationService {
  /**
   * Gets the ISO 8601 week number for a given date
   * Week starts on Monday, week 1 contains January 4th
   */
  getWeekNumber(date: Date): { year: number; weekNumber: number };

  /**
   * Gets all fortnightly pay periods (15th and last day of month) within a date range
   */
  getFortnightlyPayPeriods(startDate: Date, endDate: Date): Date[];

  /**
   * Gets the start and end dates of a calendar month
   */
  getMonthRange(year: number, month: number): { startDate: Date; endDate: Date };

  /**
   * Gets the start and end dates of a calendar week (ISO 8601)
   */
  getWeekRange(year: number, weekNumber: number): { startDate: Date; endDate: Date };

  /**
   * Gets the previous calendar month
   */
  getLastMonth(): { year: number; month: number };

  /**
   * Gets the previous calendar week (ISO 8601)
   */
  getLastWeek(): { year: number; weekNumber: number };

  /**
   * Gets all unique months present in a date range
   */
  getMonthsInRange(startDate: Date, endDate: Date): Array<{ year: number; month: number }>;
}

export class BrowserDateCalculationService implements DateCalculationService {
  /**
   * Gets the ISO 8601 week number for a given date
   * Based on ISO 8601: Week starts on Monday, week 1 contains January 4th
   */
  getWeekNumber(date: Date): { year: number; weekNumber: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // Convert Sunday (0) to 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Set to Thursday of the week
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { year: d.getUTCFullYear(), weekNumber };
  }

  /**
   * Gets all fortnightly pay periods (15th and last day of month) within a date range
   */
  getFortnightlyPayPeriods(startDate: Date, endDate: Date): Date[] {
    const periods: Date[] = [];
    const current = new Date(startDate);
    current.setDate(1); // Start from the first day of the month

    while (current <= endDate) {
      const year = current.getFullYear();
      const month = current.getMonth();

      // 15th of the month
      const fifteenth = new Date(year, month, 15);
      if (fifteenth >= startDate && fifteenth <= endDate) {
        periods.push(new Date(fifteenth));
      }

      // Last day of the month
      const lastDay = new Date(year, month + 1, 0);
      if (lastDay >= startDate && lastDay <= endDate) {
        periods.push(new Date(lastDay));
      }

      // Move to next month
      current.setMonth(month + 1);
    }

    return periods.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Gets the start and end dates of a calendar month
   */
  getMonthRange(year: number, month: number): { startDate: Date; endDate: Date } {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    return { startDate, endDate };
  }

  /**
   * Gets the start and end dates of a calendar week (ISO 8601)
   * Week starts on Monday
   */
  getWeekRange(year: number, weekNumber: number): { startDate: Date; endDate: Date } {
    // Get January 4th of the year (always in week 1)
    const jan4 = new Date(year, 0, 4);
    const jan4Week = this.getWeekNumber(jan4);
    
    // Calculate the date of the Monday of the target week
    const daysToAdd = (weekNumber - jan4Week.weekNumber) * 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() + daysToAdd);
    
    // Adjust to Monday (ISO week starts on Monday)
    const dayOfWeek = monday.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(monday.getDate() + daysToMonday);
    
    const startDate = new Date(monday);
    const endDate = new Date(monday);
    endDate.setDate(endDate.getDate() + 6); // Sunday (end of week)
    
    return { startDate, endDate };
  }

  /**
   * Gets the previous calendar month
   */
  getLastMonth(): { year: number; month: number } {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      year: lastMonth.getFullYear(),
      month: lastMonth.getMonth() + 1,
    };
  }

  /**
   * Gets the previous calendar week (ISO 8601)
   */
  getLastWeek(): { year: number; weekNumber: number } {
    const now = new Date();
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return this.getWeekNumber(lastWeek);
  }

  /**
   * Gets all unique months present in a date range
   */
  getMonthsInRange(startDate: Date, endDate: Date): Array<{ year: number; month: number }> {
    const months: Array<{ year: number; month: number }> = [];
    const current = new Date(startDate);
    current.setDate(1); // Start from the first day of the month

    while (current <= endDate) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
      });

      // Move to next month
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }
}
