/**
 * DateFormatterService - Infrastructure service for date formatting
 * Formats dates as DD/MM/YYYY and handles date arithmetic
 */

export class DateFormatterService {
  /**
   * Formats a Date object as DD/MM/YYYY
   */
  format(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Adds days to a date and returns a new Date
   * Handles month and year boundaries correctly
   */
  addDays(date: Date, days: number): Date {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }

  /**
   * Parses a DD/MM/YYYY string to a Date object
   */
  parse(dateString: string): Date | null {
    const trimmed = dateString.trim();
    const match = new RegExp(/^(\d{2})\/(\d{2})\/(\d{4})$/).exec(trimmed);
    
    if (!match) {
      return null;
    }

    const day = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10) - 1; // JavaScript months are 0-indexed
    const year = Number.parseInt(match[3], 10);

    const date = new Date(year, month, day);
    
    // Validate that the date is valid and matches the input
    if (
      date.getDate() !== day ||
      date.getMonth() !== month ||
      date.getFullYear() !== year
    ) {
      return null;
    }

    return date;
  }
}
