/**
 * Resolves a preview calendar date range from download preset selection
 */

import type { TransactionDto } from '../../../application/transactions/dtos/TransactionDto';
import type { DateFilterDto } from '../../../application/excel/dtos/DateFilterDto';
import { DateFilterMapper } from '../../../application/excel/mappers/DateFilterMapper';
import { DateRange } from '../../../domain/excel/value-objects/DateRange';
import { DateFilterService } from '../../../domain/excel/services/DateFilterService';
import { BrowserDateCalculationService } from '../../../infrastructure/dates/services/DateCalculationService';
import type { DateRangeValue } from '../components/DateRangeCalendar';

const dateFilterService = new DateFilterService(new BrowserDateCalculationService());

function toRangeValue(dateRange: DateRange): DateRangeValue {
  return {
    startDate: new Date(dateRange.startDate),
    endDate: new Date(dateRange.endDate),
  };
}

function boundingBox(ranges: DateRange[]): DateRange | null {
  if (ranges.length === 0) {
    return null;
  }

  let start = ranges[0].startDate.getTime();
  let end = ranges[0].endDate.getTime();

  for (const range of ranges.slice(1)) {
    start = Math.min(start, range.startDate.getTime());
    end = Math.max(end, range.endDate.getTime());
  }

  return new DateRange(new Date(start), new Date(end));
}

/**
 * Full span of transaction dates, or null when there are no transactions.
 */
export function resolveFullTransactionsRange(
  transactions: TransactionDto[]
): DateRangeValue | null {
  if (transactions.length === 0) {
    return null;
  }
  return toRangeValue(DateRange.fromTransactions(transactions));
}

/**
 * Maps the current download preset selection into a calendar range.
 * Multi-select uses the earliest start → latest end bounding box.
 */
export function resolvePreviewDateRangeFromPresets(
  transactions: TransactionDto[],
  selectedFilter: DateFilterDto | null,
  selectedFilters: DateFilterDto[]
): DateRangeValue | null {
  if (transactions.length === 0) {
    return null;
  }

  if (selectedFilters.length > 0) {
    const ranges: DateRange[] = [];
    for (const filterDto of selectedFilters) {
      if (!filterDto.isAvailable) {
        continue;
      }
      try {
        const option = DateFilterMapper.toDomain(filterDto);
        ranges.push(dateFilterService.getDateRangeForFilter(transactions, option));
      } catch {
        // Skip filters that cannot be resolved
      }
    }
    const box = boundingBox(ranges);
    return box ? toRangeValue(box) : resolveFullTransactionsRange(transactions);
  }

  if (selectedFilter?.isAvailable) {
    try {
      const option = DateFilterMapper.toDomain(selectedFilter);
      return toRangeValue(dateFilterService.getDateRangeForFilter(transactions, option));
    } catch {
      return resolveFullTransactionsRange(transactions);
    }
  }

  return resolveFullTransactionsRange(transactions);
}
