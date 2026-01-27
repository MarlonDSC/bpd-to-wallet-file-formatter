/**
 * Domain errors for transaction transformation
 */

export class TransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class InvalidDateError extends TransactionError {
  public readonly rowNumber?: number;

  constructor(message: string, rowNumber?: number) {
    super(message);
    this.name = 'InvalidDateError';
    this.rowNumber = rowNumber;
  }
}

export class InvalidAmountError extends TransactionError {
  public readonly rowNumber?: number;

  constructor(message: string, rowNumber?: number) {
    super(message);
    this.name = 'InvalidAmountError';
    this.rowNumber = rowNumber;
  }
}

export class InvalidCurrencyError extends TransactionError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCurrencyError';
  }
}
