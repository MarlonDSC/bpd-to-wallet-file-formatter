/**
 * DateFilterDto - DTO for date filter options
 */

import type { DateFilterType } from '../../../domain/excel/value-objects/DateFilterOption';

export interface DateFilterMetadataDto {
  month?: number;
  year?: number;
  weekNumber?: number;
  payPeriodDate?: string; // ISO date string
}

export interface DateFilterDto {
  type: DateFilterType;
  label: string;
  isAvailable: boolean;
  unavailableReason?: string;
  metadata?: DateFilterMetadataDto;
}
