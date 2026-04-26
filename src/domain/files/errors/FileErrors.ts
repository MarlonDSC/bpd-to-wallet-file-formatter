/**
 * Domain errors for file operations
 */

export class FileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileError';
  }
}

import type { BpdUploadMode } from '../value-objects/BpdUploadMode';

export class InvalidFileTypeError extends FileError {
  constructor(extension: string, mode: BpdUploadMode = 'bpd-csv') {
    const expected =
      mode === 'bpd-csv'
        ? 'Only CSV files are supported'
        : 'Only PDF files are supported';
    super(`Invalid file type. ${expected}, but received: ${extension}`);
    this.name = 'InvalidFileTypeError';
  }
}

export class FileTooLargeError extends FileError {
  constructor(size: number, maxSize: number) {
    super(`File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds the maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`);
    this.name = 'FileTooLargeError';
  }
}

export class EmptyFileError extends FileError {
  constructor() {
    super('File is empty. Please upload a file with content.');
    this.name = 'EmptyFileError';
  }
}
