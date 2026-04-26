/**
 * Domain errors for CSV parsing/extraction
 */

export class CsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvError';
  }
}

export class InvalidCsvFormatError extends CsvError {
  constructor(message: string = 'Invalid CSV format. Unable to parse file.') {
    super(message);
    this.name = 'InvalidCsvFormatError';
  }
}

export class MissingColumnError extends CsvError {
  constructor(expected: string[], source: 'csv' | 'pdf' = 'csv') {
    const prefix =
      source === 'csv'
        ? 'CSV file is missing required columns.'
        : 'PDF statement is missing required columns.';
    super(`${prefix} Expected: ${expected.join(', ')}`);
    this.name = 'MissingColumnError';
  }
}

export class EncodingError extends CsvError {
  constructor(message: string) {
    super(message);
    this.name = 'EncodingError';
  }
}

export class ParseError extends CsvError {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

