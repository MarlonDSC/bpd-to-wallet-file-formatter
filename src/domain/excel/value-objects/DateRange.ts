/**
 * DateRange - Value object representing a date range
 */

export class DateRange {
  public readonly startDate: Date;
  public readonly endDate: Date;

  constructor(startDate: Date, endDate: Date) {
    if (!this.isValidDate(startDate)) {
      throw new Error('Invalid start date provided to DateRange');
    }
    if (!this.isValidDate(endDate)) {
      throw new Error('Invalid end date provided to DateRange');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be less than or equal to end date');
    }

    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
  }

  /**
   * Creates a DateRange from transaction dates
   */
  static fromTransactions(transactions: Array<{ date: string }>): DateRange {
    if (transactions.length === 0) {
      throw new Error('Cannot create DateRange from empty transaction list');
    }

    const dates = transactions.map((t) => {
      const [day, month, year] = t.date.split('/').map(Number);
      return new Date(year, month - 1, day);
    });

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    return new DateRange(minDate, maxDate);
  }

  /**
   * Checks if a date is contained within this range
   */
  contains(date: Date): boolean {
    if (!this.isValidDate(date)) {
      return false;
    }
    return date >= this.startDate && date <= this.endDate;
  }

  /**
   * Checks if this range overlaps with another range
   */
  overlaps(other: DateRange): boolean {
    return this.startDate <= other.endDate && this.endDate >= other.startDate;
  }

  /**
   * Gets the duration of the range in days
   */
  getDuration(): number {
    const diffTime = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Formats the start date as DD/MM/YYYY
   */
  formatStartDate(): string {
    return this.formatDate(this.startDate);
  }

  /**
   * Formats the end date as DD/MM/YYYY
   */
  formatEndDate(): string {
    return this.formatDate(this.endDate);
  }

  /**
   * Formats the range as YYYY-MM-DD_YYYY-MM-DD for filename
   */
  formatForFilename(): string {
    const start = this.formatDateForFilename(this.startDate);
    const end = this.formatDateForFilename(this.endDate);
    return `${start}_${end}`;
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private formatDateForFilename(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  }

  private isValidDate(date: Date): boolean {
    return date instanceof Date && !Number.isNaN(date.getTime());
  }
}
