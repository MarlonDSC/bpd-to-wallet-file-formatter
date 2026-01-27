/**
 * AmountFormatterService - Infrastructure service for amount formatting
 * Formats amounts with 2 decimal places and handles positive/negative formatting
 */

export class AmountFormatterService {
  /**
   * Formats an amount with 2 decimal places
   */
  format(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Formats an amount as a string with 2 decimal places
   */
  formatString(amount: number): string {
    return this.format(amount).toFixed(2);
  }

  /**
   * Parses an amount string to a number
   */
  parse(amountString: string): number {
    const trimmed = amountString.trim();
    const parsed = Number.parseFloat(trimmed);
    
    if (Number.isNaN(parsed)) {
      throw new TypeError(`Invalid amount format: ${amountString}`);
    }

    return parsed;
  }
}
