/**
 * ExcelRow value object
 * Represents a single row in an Excel worksheet with all required fields.
 */

export class ExcelRow {
  public readonly date: string; // DD/MM/YYYY format
  public readonly dateImport: string; // DD/MM/YYYY format
  public readonly note: string;
  public readonly currency: string; // "DOP"
  public readonly amount: number; // Number with 2 decimal places

  constructor(params: {
    date: string;
    dateImport: string;
    note: string;
    currency: string;
    amount: number;
  }) {
    this.date = params.date.trim();
    this.dateImport = params.dateImport.trim();
    this.note = params.note.trim();
    this.currency = params.currency.trim();
    this.amount = Number.parseFloat(params.amount.toFixed(2));
  }

  /**
   * Converts the row to an array format for Excel export
   * Order: Date, Date (Import), Note, Currency, Amount
   */
  toArray(): [string, string, string, string, number] {
    return [this.date, this.dateImport, this.note, this.currency, this.amount];
  }

  /**
   * Validates the row data
   */
  validate(): void {
    if (!this.date || this.date.length === 0) {
      throw new Error('Excel row date cannot be empty');
    }
    if (!this.dateImport || this.dateImport.length === 0) {
      throw new Error('Excel row dateImport cannot be empty');
    }
    if (!this.note || this.note.length === 0) {
      throw new Error('Excel row note cannot be empty');
    }
    if (this.currency !== 'DOP') {
      throw new Error(`Excel row currency must be "DOP", got: ${this.currency}`);
    }
    if (Number.isNaN(this.amount)) {
      throw new TypeError('Excel row amount must be a valid number');
    }
  }
}
