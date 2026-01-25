/**
 * FileMapper - Maps between domain entities, DTOs, and view models
 */

import { UploadedFile } from '../../../domain/files/entities/UploadedFile';
import type { UploadedFileDto } from '../dtos/UploadedFileDto';
import type { FileUploadViewModel } from '../../../presentation/converter/view-models/FileUploadViewModel';

export class FileMapper {
  private static fromDomainToDto(entity: UploadedFile): UploadedFileDto {
    return {
      id: entity.id,
      name: entity.name,
      size: entity.size.getBytes(),
      sizeInMB: entity.size.toMB(),
      type: entity.type.getExtension(),
      file: entity.file,
    };
  }

  static toDomain(file: File, id?: string): UploadedFile {
    return UploadedFile.fromFile(file, id);
  }

  static toDto(entity: UploadedFile): UploadedFileDto {
    return FileMapper.fromDomainToDto(entity);
  }

  static toViewModel(entity: UploadedFile): FileUploadViewModel {
    return FileMapper.toViewModelFromDto(FileMapper.toDto(entity));
  }

  static toViewModelFromDto(dto: UploadedFileDto): FileUploadViewModel {
    return dto;
  }
}
