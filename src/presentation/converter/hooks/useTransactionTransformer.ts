/**
 * useTransactionTransformer - Hook to transform parsed CSV data to transactions
 */

import { useCallback, useMemo, useState } from 'react';
import { TransformTransactionsUseCase } from '../../../application/transactions/use-cases/TransformTransactionsUseCase';
import type { CsvParseResultDto } from '../../../application/csv/dtos/CsvParseResultDto';
import type { TransactionDto } from '../../../application/transactions/dtos/TransactionDto';
import type { TransactionError } from '../../../domain/transactions/errors/TransactionErrors';

export interface TransformationState {
  isTransforming: boolean;
  error: TransactionError | null;
  transactions: TransactionDto[];
  errors: Array<{ rowNumber: number; error: string }>;
  skippedCount: number;
}

export function useTransactionTransformer() {
  const useCase = useMemo(() => new TransformTransactionsUseCase(), []);
  const [state, setState] = useState<TransformationState>({
    isTransforming: false,
    error: null,
    transactions: [],
    errors: [],
    skippedCount: 0,
  });

  const transformResults = useCallback(
    async (parseResults: CsvParseResultDto[]) => {
      setState({
        isTransforming: true,
        error: null,
        transactions: [],
        errors: [],
        skippedCount: 0,
      });

      const allTransactions: TransactionDto[] = [];
      const allErrors: Array<{ rowNumber: number; error: string }> = [];
      let totalSkipped = 0;

      for (const parseResult of parseResults) {
        const result = useCase.execute(parseResult);
        
        if (result.success) {
          allTransactions.push(...result.data.transactions);
          allErrors.push(...result.data.errors);
          totalSkipped += result.data.skippedCount;
        } else {
          setState({
            isTransforming: false,
            error: result.error,
            transactions: [],
            errors: [],
            skippedCount: 0,
          });
          return;
        }
      }

      setState({
        isTransforming: false,
        error: null,
        transactions: allTransactions,
        errors: allErrors,
        skippedCount: totalSkipped,
      });
    },
    [useCase]
  );

  return { ...state, transformResults };
}
