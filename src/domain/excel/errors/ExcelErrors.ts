/**
 * Domain errors for Excel generation
 */

export class ExcelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExcelError';
  }
}

export class ExcelGenerationError extends ExcelError {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ExcelGenerationError';
    this.cause = cause;
  }
}

export class InvalidWorksheetError extends ExcelError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidWorksheetError';
  }
}
