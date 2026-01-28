/**
 * Domain errors for date filtering
 */

export class DateFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateFilterError';
  }
}

export class InvalidDateFilterError extends DateFilterError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDateFilterError';
  }
}

export class NoDataForFilterError extends DateFilterError {
  constructor(message: string) {
    super(message);
    this.name = 'NoDataForFilterError';
  }
}

export class InvalidDateRangeError extends DateFilterError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDateRangeError';
  }
}
