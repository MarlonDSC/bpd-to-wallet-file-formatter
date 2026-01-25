import { describe, it, expect } from 'vitest';
import { FileSize } from '../../../../src/domain/files/value-objects/FileSize';

describe('FileSize', () => {
  describe('create', () => {
    it('should create a FileSize instance with valid bytes', () => {
      const fileSize = FileSize.create(1024);
      expect(fileSize.getBytes()).toBe(1024);
    });

    it('should throw error for negative bytes', () => {
      expect(() => FileSize.create(-1)).toThrow('File size cannot be negative');
    });
  });

  describe('getBytes', () => {
    it('should return the size in bytes', () => {
      const fileSize = FileSize.create(2048);
      expect(fileSize.getBytes()).toBe(2048);
    });
  });

  describe('toMB', () => {
    it('should convert bytes to megabytes', () => {
      const fileSize = FileSize.create(5 * 1024 * 1024); // 5MB
      expect(fileSize.toMB()).toBe(5);
    });

    it('should handle fractional megabytes', () => {
      const fileSize = FileSize.create(1.5 * 1024 * 1024); // 1.5MB
      expect(fileSize.toMB()).toBeCloseTo(1.5, 2);
    });
  });

  describe('isWithinLimit', () => {
    it('should return true for files within 10MB limit', () => {
      const fileSize = FileSize.create(5 * 1024 * 1024); // 5MB
      expect(fileSize.isWithinLimit()).toBe(true);
    });

    it('should return true for files exactly at 10MB limit', () => {
      const fileSize = FileSize.create(10 * 1024 * 1024); // 10MB
      expect(fileSize.isWithinLimit()).toBe(true);
    });

    it('should return false for files exceeding 10MB limit', () => {
      const fileSize = FileSize.create(11 * 1024 * 1024); // 11MB
      expect(fileSize.isWithinLimit()).toBe(false);
    });
  });

  describe('exceedsLimit', () => {
    it('should return false for files within limit', () => {
      const fileSize = FileSize.create(5 * 1024 * 1024);
      expect(fileSize.exceedsLimit()).toBe(false);
    });

    it('should return true for files exceeding limit', () => {
      const fileSize = FileSize.create(11 * 1024 * 1024);
      expect(fileSize.exceedsLimit()).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for equal file sizes', () => {
      const size1 = FileSize.create(1024);
      const size2 = FileSize.create(1024);
      expect(size1.equals(size2)).toBe(true);
    });

    it('should return false for different file sizes', () => {
      const size1 = FileSize.create(1024);
      const size2 = FileSize.create(2048);
      expect(size1.equals(size2)).toBe(false);
    });
  });
});
