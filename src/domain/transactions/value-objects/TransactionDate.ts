/**
 * TransactionDate value object
 * Handles date parsing, validation, and formatting for transaction dates.
 */

export class TransactionDate {
  public readonly date: Date;

  constructor(date: Date) {
    if (!this.isValidDate(date)) {
      throw new Error('Invalid date provided to TransactionDate');
    }
    this.date = new Date(date);
  }

  /**
   * Creates a TransactionDate from a date string
   * Supports formats: D/M/YYYY, DD/MM/YYYY, M/D/YYYY, MM/DD/YYYY 
   * For BPD CSV files, assumes DD/MM/YYYY format (day first)
   */
  static fromString(dateString: string): TransactionDate {
    const parsed = TransactionDate.parseDateString(dateString);
    if (!parsed) {
      throw new Error(`Invalid date format: ${dateString}. Expected format: DD/MM/YYYY or D/M/YYYY`);
    }
    return new TransactionDate(parsed);
  }

  /**
   * Formats the date as DD/MM/YYYY
   */
  format(): string {
    const day = String(this.date.getDate()).padStart(2, '0');
    const month = String(this.date.getMonth() + 1).padStart(2, '0');
    const year = this.date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Adds days to the date and returns a new TransactionDate
   * Handles month and year boundaries correctly
   */
  addDays(days: number): TransactionDate {
    const newDate = new Date(this.date);
    newDate.setDate(newDate.getDate() + days);
    return new TransactionDate(newDate);
  }

  /**
   * Returns the import date (transaction date + 1 day)
   */
  toImportDate(): TransactionDate {
    return this.addDays(1);
  }

  /**
   * Returns the underlying Date object (useful for Excel export)
   */
  toDate(): Date {
    return new Date(this.date);
  }

  /**
   * Parses a date string to a Date object
   * Supports formats: D/M/YYYY, DD/MM/YYYY (assumes day first for BPD CSV)
   * Also tries M/D/YYYY as fallback
   */
  private static parseDateString(dateString: string): Date | null {
    const trimmed = dateString.trim();
    
    // Try DD/MM/YYYY or D/M/YYYY format first (day first - BPD format)
    const match = new RegExp(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/).exec(trimmed);
    
    if (match) {
      const first = Number.parseInt(match[1], 10);
      const second = Number.parseInt(match[2], 10);
      const year = Number.parseInt(match[3], 10);
      
      // For BPD CSV, assume day first (DD/MM/YYYY format)
      // JavaScript months are 0-indexed
      let day = first;
      let month = second - 1;
      
      const date = new Date(year, month, day);
      
      // Validate that the date is valid and matches the input
      if (
        date.getDate() === day &&
        date.getMonth() === month &&
        date.getFullYear() === year
      ) {
        return date;
      }
      
      // If day-first failed, try month-first as fallback
      if (first <= 12 && second <= 12) {
        month = first - 1;
        day = second;
        const date2 = new Date(year, month, day);
        if (
          date2.getDate() === day &&
          date2.getMonth() === month &&
          date2.getFullYear() === year
        ) {
          return date2;
        }
      }
    }
    
    return null;
  }

  /**
   * Validates that a Date object is valid
   */
  private isValidDate(date: Date): boolean {
    return date instanceof Date && !Number.isNaN(date.getTime());
  }
}
