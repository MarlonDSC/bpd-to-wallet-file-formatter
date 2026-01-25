/**
 * UploadedFile domain entity
 * Represents a file that has been uploaded with validation
 */

import { FileSize } from '../value-objects/FileSize';
import { FileType } from '../value-objects/FileType';
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
    const fileId = id || `${Date.now()}-${Math.random().toString(36).substring(7)}`;
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

  validate(): void {
    if (this.file.size === 0) {
      throw new EmptyFileError();
    }

    if (!this.type.isValid()) {
      throw new InvalidFileTypeError(this.type.getExtension());
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
