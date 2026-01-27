/**
 * TransformTransactionUseCase - Transforms a single CSV row to a Transaction
 */

import type { CsvRowDto } from '../../csv/dtos/CsvRowDto';
import type { TransactionDto } from '../dtos/TransactionDto';
import { TransactionMapper } from '../mappers/TransactionMapper';
import { InvalidDateError, InvalidAmountError } from '../../../domain/transactions/errors/TransactionErrors';

export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

export class TransformTransactionUseCase {
  execute(input: CsvRowDto): Result<TransactionDto, InvalidDateError | InvalidAmountError> {
    try {
      const transaction = TransactionMapper.toDomain(input);
      transaction.validate();
      const dto = TransactionMapper.toDto(transaction);
      return { success: true, data: dto };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid date format') || error.message.includes('Invalid date')) {
          return {
            success: false,
            error: new InvalidDateError(
              `Invalid date format in row ${input.rowNumber}. Expected format: DD/MM/YYYY`,
              input.rowNumber
            ),
          };
        }
        if (error.message.includes('Invalid amount format') || error.message.includes('Invalid amount')) {
          return {
            success: false,
            error: new InvalidAmountError(
              `Invalid amount format in row ${input.rowNumber}`,
              input.rowNumber
            ),
          };
        }
      }
      throw error;
    }
  }
}
