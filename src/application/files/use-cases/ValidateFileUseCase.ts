/**
 * ValidateFileUseCase - Orchestrates file validation logic
 */

import { FileMapper } from '../mappers/FileMapper';
import type { UploadedFileDto } from '../dtos/UploadedFileDto';
import { FileError } from '../../../domain/files/errors/FileErrors';

export type Result<T, E> = 
  | { success: true; data: T }
  | { success: false; error: E };

export class ValidateFileUseCase {
  execute(file: File, id?: string): Result<UploadedFileDto, FileError> {
    try {
      const uploadedFile = FileMapper.toDomain(file, id);
      uploadedFile.validate();
      
      const dto = FileMapper.toDto(uploadedFile);
      return { success: true, data: dto };
    } catch (error) {
      if (error instanceof FileError) {
        return { success: false, error };
      }
      // Re-throw unexpected errors
      throw error;
    }
  }
}
