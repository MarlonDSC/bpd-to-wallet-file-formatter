/**
 * FileMapper - Maps between domain entities, DTOs, and view models
 */

import { UploadedFile } from '../../../domain/files/entities/UploadedFile';
import type { UploadedFileDto } from '../dtos/UploadedFileDto';
import type { FileUploadViewModel } from '../../../presentation/converter/view-models/FileUploadViewModel';

export class FileMapper {
  static toDomain(file: File, id?: string): UploadedFile {
    return UploadedFile.fromFile(file, id);
  }

  static toDto(entity: UploadedFile): UploadedFileDto {
    return {
      id: entity.id,
      name: entity.name,
      size: entity.size.getBytes(),
      sizeInMB: entity.size.toMB(),
      type: entity.type.getExtension(),
      file: entity.file,
    };
  }

  static toViewModel(entity: UploadedFile): FileUploadViewModel {
    return {
      id: entity.id,
      name: entity.name,
      size: entity.size.getBytes(),
      sizeInMB: entity.size.toMB(),
      type: entity.type.getExtension(),
      file: entity.file,
    };
  }

  static toViewModelFromDto(dto: UploadedFileDto): FileUploadViewModel {
    return {
      id: dto.id,
      name: dto.name,
      size: dto.size,
      sizeInMB: dto.sizeInMB,
      type: dto.type,
      file: dto.file,
    };
  }
}
