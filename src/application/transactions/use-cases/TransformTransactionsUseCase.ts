/**
 * TransformTransactionsUseCase - Transforms multiple CSV rows to Transactions
 */

import type { CsvParseResultDto } from '../../csv/dtos/CsvParseResultDto';
import type { TransactionDto } from '../dtos/TransactionDto';
import { TransformTransactionUseCase } from './TransformTransactionUseCase';

export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

export interface TransformResult {
  transactions: TransactionDto[];
  errors: Array<{ rowNumber: number; error: string }>;
  skippedCount: number;
}

export class TransformTransactionsUseCase {
  private readonly transformTransactionUseCase: TransformTransactionUseCase;

  constructor(transformTransactionUseCase: TransformTransactionUseCase = new TransformTransactionUseCase()) {
    this.transformTransactionUseCase = transformTransactionUseCase;
  }

  execute(input: CsvParseResultDto): Result<TransformResult, never> {
    const transactions: TransactionDto[] = [];
    const errors: Array<{ rowNumber: number; error: string }> = [];
    let skippedCount = 0;

    for (const row of input.rows) {
      const result = this.transformTransactionUseCase.execute(row);
      
      if (result.success) {
        transactions.push(result.data);
      } else {
        skippedCount++;
        errors.push({
          rowNumber: row.rowNumber,
          error: result.error.message,
        });
      }
    }

    return {
      success: true,
      data: {
        transactions,
        errors,
        skippedCount,
      },
    };
  }
}
