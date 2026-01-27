/**
 * Amount value object
 * Handles amount parsing, validation, and formatting with transaction type determination.
 */

export class Amount {
  public readonly value: number;
  public readonly isCredit: boolean;

  constructor(value: number) {
    if (!this.isValidNumber(value)) {
      throw new Error('Invalid amount: must be a valid number');
    }
    this.value = value;
    this.isCredit = value >= 0;
  }

  /**
   * Creates an Amount from a string (handles negative amounts for debits)
   */
  static fromString(amountString: string): Amount {
    const trimmed = amountString.trim();
    const parsed = Number.parseFloat(trimmed);

    if (Number.isNaN(parsed)) {
      throw new TypeError(`Invalid amount format: ${amountString}`);
    }

    return new Amount(parsed);
  }

  /**
   * Formats the amount with 2 decimal places
   * Returns positive for credits, negative for debits
   */
  toFormattedAmount(): number {
    return Math.round(this.value * 100) / 100;
  }

  /**
   * Returns the formatted amount as a string with 2 decimal places
   */
  toFormattedString(): string {
    return this.toFormattedAmount().toFixed(2);
  }

  /**
   * Checks if the amount is positive (credit)
   */
  isPositive(): boolean {
    return this.value > 0;
  }

  /**
   * Checks if the amount is negative (debit)
   */
  isNegative(): boolean {
    return this.value < 0;
  }

  /**
   * Checks if the amount is zero
   */
  isZero(): boolean {
    return this.value === 0;
  }

  /**
   * Validates that a number is valid
   */
  private isValidNumber(value: number): boolean {
    return typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value);
  }
}
