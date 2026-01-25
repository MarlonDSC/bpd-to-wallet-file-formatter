/**
 * FileSize value object
 * Represents file size in bytes with validation
 */

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export class FileSize {
  private readonly bytes: number;

  private constructor(bytes: number) {
    if (bytes < 0) {
      throw new Error('File size cannot be negative');
    }
    this.bytes = bytes;
  }

  static create(bytes: number): FileSize {
    return new FileSize(bytes);
  }

  getBytes(): number {
    return this.bytes;
  }

  toMB(): number {
    return this.bytes / 1024 / 1024;
  }

  isWithinLimit(): boolean {
    return this.bytes <= MAX_FILE_SIZE_BYTES;
  }

  exceedsLimit(): boolean {
    return !this.isWithinLimit();
  }

  getMaxSizeBytes(): number {
    return MAX_FILE_SIZE_BYTES;
  }

  equals(other: FileSize): boolean {
    return this.bytes === other.bytes;
  }
}
