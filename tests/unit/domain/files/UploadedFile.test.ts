import { describe, it, expect, beforeEach } from 'vitest';
import { UploadedFile } from '../../../../src/domain/files/entities/UploadedFile';
import { FileSize } from '../../../../src/domain/files/value-objects/FileSize';
import { FileType } from '../../../../src/domain/files/value-objects/FileType';
import {
  InvalidFileTypeError,
  FileTooLargeError,
  EmptyFileError,
} from '../../../../src/domain/files/errors/FileErrors';

describe('UploadedFile', () => {
  let validFile: File;
  let largeFile: File;
  let emptyFile: File;
  let txtFile: File;

  beforeEach(() => {
    // Create mock File objects
    validFile = new File(['content'], 'test.csv', { type: 'text/csv' });
    largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.csv', {
      type: 'text/csv',
    });
    emptyFile = new File([], 'empty.csv', { type: 'text/csv' });
    txtFile = new File(['content'], 'test.txt', { type: 'text/plain' });
  });

  describe('fromFile', () => {
    it('should create UploadedFile from valid File', () => {
      const uploadedFile = UploadedFile.fromFile(validFile);
      expect(uploadedFile.name).toBe('test.csv');
      expect(uploadedFile.file).toBe(validFile);
    });

    it('should generate unique ID if not provided', () => {
      const file1 = UploadedFile.fromFile(validFile);
      const file2 = UploadedFile.fromFile(validFile);
      expect(file1.id).not.toBe(file2.id);
    });

    it('should use provided ID', () => {
      const customId = 'custom-id-123';
      const uploadedFile = UploadedFile.fromFile(validFile, customId);
      expect(uploadedFile.id).toBe(customId);
    });

    it('should create FileSize and FileType from file', () => {
      const uploadedFile = UploadedFile.fromFile(validFile);
      expect(uploadedFile.size).toBeInstanceOf(FileSize);
      expect(uploadedFile.type).toBeInstanceOf(FileType);
    });
  });

  describe('create', () => {
    it('should create UploadedFile with provided props', () => {
      const props = {
        id: 'test-id',
        name: 'test.csv',
        size: FileSize.create(1024),
        type: FileType.create('csv'),
        file: validFile,
      };
      const uploadedFile = UploadedFile.create(props);
      expect(uploadedFile.id).toBe('test-id');
      expect(uploadedFile.name).toBe('test.csv');
    });
  });

  describe('validate', () => {
    it('should not throw for valid CSV file', () => {
      const uploadedFile = UploadedFile.fromFile(validFile);
      expect(() => uploadedFile.validate()).not.toThrow();
    });

    it('should throw EmptyFileError for empty file', () => {
      const uploadedFile = UploadedFile.fromFile(emptyFile);
      expect(() => uploadedFile.validate()).toThrow(EmptyFileError);
    });

    it('should throw InvalidFileTypeError for non-CSV file', () => {
      const uploadedFile = UploadedFile.fromFile(txtFile);
      expect(() => uploadedFile.validate()).toThrow(InvalidFileTypeError);
    });

    it('should throw FileTooLargeError for file exceeding 10MB', () => {
      const uploadedFile = UploadedFile.fromFile(largeFile);
      expect(() => uploadedFile.validate()).toThrow(FileTooLargeError);
    });
  });

  describe('isValidCsv', () => {
    it('should return true for CSV files', () => {
      const uploadedFile = UploadedFile.fromFile(validFile);
      expect(uploadedFile.isValidCsv()).toBe(true);
    });

    it('should return false for non-CSV files', () => {
      const uploadedFile = UploadedFile.fromFile(txtFile);
      expect(uploadedFile.isValidCsv()).toBe(false);
    });
  });

  describe('isWithinSizeLimit', () => {
    it('should return true for files within size limit', () => {
      const uploadedFile = UploadedFile.fromFile(validFile);
      expect(uploadedFile.isWithinSizeLimit()).toBe(true);
    });

    it('should return false for files exceeding size limit', () => {
      const uploadedFile = UploadedFile.fromFile(largeFile);
      expect(uploadedFile.isWithinSizeLimit()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for files with same ID', () => {
      const id = 'same-id';
      const file1 = UploadedFile.fromFile(validFile, id);
      const file2 = UploadedFile.fromFile(validFile, id);
      expect(file1.equals(file2)).toBe(true);
    });

    it('should return false for files with different IDs', () => {
      const file1 = UploadedFile.fromFile(validFile, 'id1');
      const file2 = UploadedFile.fromFile(validFile, 'id2');
      expect(file1.equals(file2)).toBe(false);
    });
  });
});
