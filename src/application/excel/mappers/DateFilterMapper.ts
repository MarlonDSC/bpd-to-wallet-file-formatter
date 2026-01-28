/**
 * DateFilterMapper - Maps between domain value objects and DTOs
 */

import { DateFilterOption, type DateFilterType } from '../../../domain/excel/value-objects/DateFilterOption';
import type { DateFilterDto, DateFilterMetadataDto } from '../dtos/DateFilterDto';

export class DateFilterMapper {
  /**
   * Converts DateFilterOption domain value object to DTO
   */
  static toDto(filterOption: DateFilterOption): DateFilterDto {
    const metadata: DateFilterMetadataDto | undefined = filterOption.metadata
      ? {
          month: filterOption.metadata.month,
          year: filterOption.metadata.year,
          weekNumber: filterOption.metadata.weekNumber,
          payPeriodDate: filterOption.metadata.payPeriodDate
            ? filterOption.metadata.payPeriodDate.toISOString()
            : undefined,
        }
      : undefined;

    return {
      type: filterOption.type,
      label: filterOption.label,
      isAvailable: filterOption.isAvailable,
      unavailableReason: filterOption.unavailableReason,
      metadata,
    };
  }

  /**
   * Converts DTO to DateFilterOption domain value object
   */
  static toDomain(dto: DateFilterDto): DateFilterOption {
    const metadata = dto.metadata
      ? {
          month: dto.metadata.month,
          year: dto.metadata.year,
          weekNumber: dto.metadata.weekNumber,
          payPeriodDate: dto.metadata.payPeriodDate
            ? new Date(dto.metadata.payPeriodDate)
            : undefined,
        }
      : undefined;

    return new DateFilterOption({
      type: dto.type,
      label: dto.label,
      isAvailable: dto.isAvailable,
      unavailableReason: dto.unavailableReason,
      metadata,
    });
  }

  /**
   * Converts DateFilterOption to view model for UI
   */
  static toViewModel(filterOption: DateFilterOption): {
    type: DateFilterType;
    label: string;
    isAvailable: boolean;
    unavailableReason?: string;
    metadata?: DateFilterMetadataDto;
  } {
    return {
      type: filterOption.type,
      label: filterOption.label,
      isAvailable: filterOption.isAvailable,
      unavailableReason: filterOption.unavailableReason,
      metadata: filterOption.metadata
        ? {
            month: filterOption.metadata.month,
            year: filterOption.metadata.year,
            weekNumber: filterOption.metadata.weekNumber,
            payPeriodDate: filterOption.metadata.payPeriodDate
              ? filterOption.metadata.payPeriodDate.toISOString()
              : undefined,
          }
        : undefined,
    };
  }
}
