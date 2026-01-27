/**
 * Currency value object
 * Represents a currency code with validation.
 */

export class Currency {
  public readonly code: string;

  constructor(code: string) {
    if (!Currency.isValid(code)) {
      throw new Error(`Invalid currency code: ${code}. Expected: DOP`);
    }
    this.code = code.toUpperCase();
  }

  /**
   * Creates a Currency instance for DOP (Dominican Peso)
   */
  static DOP(): Currency {
    return new Currency('DOP');
  }

  /**
   * Validates that a currency code is valid
   * Currently only DOP is supported
   */
  static isValid(code: string): boolean {
    return code.trim().toUpperCase() === 'DOP';
  }

  /**
   * Validates the currency code
   */
  validate(): void {
    if (!Currency.isValid(this.code)) {
      throw new Error(`Invalid currency code: ${this.code}. Expected: DOP`);
    }
  }
}
