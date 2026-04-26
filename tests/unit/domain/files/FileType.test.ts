import { describe, it, expect } from 'vitest';
import { FileType } from '../../../../src/domain/files/value-objects/FileType';

describe('FileType', () => {
  describe('create', () => {
    it('should create a FileType instance with valid extension', () => {
      const fileType = FileType.create('csv');
      expect(fileType.getExtension()).toBe('csv');
    });

    it('should normalize extension to lowercase', () => {
      const fileType = FileType.create('CSV');
      expect(fileType.getExtension()).toBe('csv');
    });

    it('should remove leading dot from extension', () => {
      const fileType = FileType.create('.csv');
      expect(fileType.getExtension()).toBe('csv');
    });
  });

  describe('fromFileName', () => {
    it('should extract extension from filename', () => {
      const fileType = FileType.fromFileName('test.csv');
      expect(fileType.getExtension()).toBe('csv');
    });

    it('should handle uppercase extensions', () => {
      const fileType = FileType.fromFileName('test.CSV');
      expect(fileType.getExtension()).toBe('csv');
    });

    it('should handle filenames with multiple dots', () => {
      const fileType = FileType.fromFileName('test.file.csv');
      expect(fileType.getExtension()).toBe('csv');
    });

    it('should handle filenames without extension', () => {
      const fileType = FileType.fromFileName('test');
      expect(fileType.getExtension()).toBe('');
    });
  });

  describe('isValid', () => {
    it('should return true for CSV files', () => {
      const fileType = FileType.create('csv');
      expect(fileType.isValid()).toBe(true);
    });

    it('should return false for non-CSV files', () => {
      const fileType = FileType.create('txt');
      expect(fileType.isValid()).toBe(false);
    });

    it('should return false for empty extension', () => {
      const fileType = FileType.create('');
      expect(fileType.isValid()).toBe(false);
    });
  });

  describe('isCsv', () => {
    it('should return true for CSV extension', () => {
      const fileType = FileType.create('csv');
      expect(fileType.isCsv()).toBe(true);
    });

    it('should return false for non-CSV extension', () => {
      const fileType = FileType.create('txt');
      expect(fileType.isCsv()).toBe(false);
    });
  });

  describe('isPdf', () => {
    it('should return true for PDF extension', () => {
      const fileType = FileType.create('pdf');
      expect(fileType.isPdf()).toBe(true);
    });

    it('should return false for non-PDF extension', () => {
      const fileType = FileType.create('csv');
      expect(fileType.isPdf()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for equal file types', () => {
      const type1 = FileType.create('csv');
      const type2 = FileType.create('csv');
      expect(type1.equals(type2)).toBe(true);
    });

    it('should return false for different file types', () => {
      const type1 = FileType.create('csv');
      const type2 = FileType.create('txt');
      expect(type1.equals(type2)).toBe(false);
    });
  });
});
