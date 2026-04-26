/**
 * UploadedFile domain entity
 * Represents a file that has been uploaded with validation
 */

import { FileSize } from '../value-objects/FileSize';
import { FileType } from '../value-objects/FileType';
import type { BpdUploadMode } from '../value-objects/BpdUploadMode';
import { InvalidFileTypeError, FileTooLargeError, EmptyFileError } from '../errors/FileErrors';

export interface UploadedFileProps {
  id: string;
  name: string;
  size: FileSize;
  type: FileType;
  file: File;
}

export class UploadedFile {
  public readonly id: string;
  public readonly name: string;
  public readonly size: FileSize;
  public readonly type: FileType;
  public readonly file: File;

  /**
   * Generate a non-guessable, collision-resistant identifier for client-side usage.
   *
   * Note: This is NOT an auth token. We still require cryptographic randomness to
   * avoid predictable IDs and accidental collisions across rapid uploads.
   */
  private static generateId(): string {
    const cryptoObj = globalThis.crypto;
    if (!cryptoObj) {
      throw new Error(
        'Secure ID generation requires Web Crypto (globalThis.crypto).'
      );
    }

    if (typeof cryptoObj.randomUUID === 'function') {
      return cryptoObj.randomUUID();
    }

    if (typeof cryptoObj.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      cryptoObj.getRandomValues(bytes);

      // RFC 4122 version 4 UUID
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
      return [
        hex.slice(0, 4).join(''),
        hex.slice(4, 6).join(''),
        hex.slice(6, 8).join(''),
        hex.slice(8, 10).join(''),
        hex.slice(10, 16).join(''),
      ].join('-');
    }

    throw new Error(
      'Secure ID generation requires crypto.randomUUID or crypto.getRandomValues.'
    );
  }

  private constructor(
    id: string,
    name: string,
    size: FileSize,
    type: FileType,
    file: File
  ) {
    this.id = id;
    this.name = name;
    this.size = size;
    this.type = type;
    this.file = file;
  }

  static create(props: UploadedFileProps): UploadedFile {
    return new UploadedFile(
      props.id,
      props.name,
      props.size,
      props.type,
      props.file
    );
  }

  static fromFile(file: File, id?: string): UploadedFile {
    const fileId = id ?? UploadedFile.generateId();
    const fileSize = FileSize.create(file.size);
    const fileType = FileType.fromFileName(file.name);

    return new UploadedFile(
      fileId,
      file.name,
      fileSize,
      fileType,
      file
    );
  }

  validate(mode: BpdUploadMode = 'bpd-csv'): void {
    if (this.file.size === 0) {
      throw new EmptyFileError();
    }

    const typeOk =
      mode === 'bpd-csv' ? this.type.isCsv() : this.type.isPdf();
    if (!typeOk) {
      throw new InvalidFileTypeError(this.type.getExtension(), mode);
    }

    if (this.size.exceedsLimit()) {
      throw new FileTooLargeError(this.size.getBytes(), this.size.getMaxSizeBytes());
    }
  }

  isValidCsv(): boolean {
    return this.type.isCsv();
  }

  isWithinSizeLimit(): boolean {
    return this.size.isWithinLimit();
  }

  equals(other: UploadedFile): boolean {
    return this.id === other.id;
  }
}
