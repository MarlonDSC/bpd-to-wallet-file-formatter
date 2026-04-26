/**
 * FileType value object
 * Represents file type/extension with validation
 */

const VALID_EXTENSIONS = ['csv'] as const;
type ValidExtension = typeof VALID_EXTENSIONS[number];

export class FileType {
  private readonly extension: string;

  private constructor(extension: string) {
    this.extension = extension;
  }

  static create(extension: string): FileType {
    const normalized = extension.toLowerCase().replace(/^\./, '');
    return new FileType(normalized);
  }

  static fromFileName(fileName: string): FileType {
    const parts = fileName.split('.');
    // If there's no dot or only one part, there's no extension
    const extension = parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
    return FileType.create(extension);
  }

  getExtension(): string {
    return this.extension;
  }

  isValid(): boolean {
    return VALID_EXTENSIONS.includes(this.extension as ValidExtension);
  }

  isCsv(): boolean {
    return this.extension === 'csv';
  }

  isPdf(): boolean {
    return this.extension === 'pdf';
  }

  equals(other: FileType): boolean {
    return this.extension === other.extension;
  }
}
