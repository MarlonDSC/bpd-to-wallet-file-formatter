/**
 * useCsvParser - Hook to parse uploaded CSV files and expose status.
 */

import { useCallback, useMemo, useState } from 'react';
import { ParseCsvUseCase } from '../../../application/csv/use-cases/ParseCsvUseCase';
import type { CsvParseResultDto } from '../../../application/csv/dtos/CsvParseResultDto';
import type { FileUploadViewModel } from '../view-models/FileUploadViewModel';
import type { CsvError } from '../../../domain/csv/errors/CsvErrors';

export interface CsvParsingState {
  isParsing: boolean;
  error: CsvError | null;
  warningCount: number;
  results: CsvParseResultDto[] | null;
}

export function useCsvParser() {
  const useCase = useMemo(() => new ParseCsvUseCase(), []);
  const [state, setState] = useState<CsvParsingState>({
    isParsing: false,
    error: null,
    warningCount: 0,
    results: null,
  });

  const parseFiles = useCallback(
    async (files: FileUploadViewModel[]) => {
      setState({ isParsing: true, error: null, warningCount: 0, results: null });

      const results: CsvParseResultDto[] = [];
      let warningCount = 0;

      for (const f of files) {
        const res = await useCase.execute({ file: f.file });
        if (!res.success) {
          setState({ isParsing: false, error: res.error, warningCount, results: null });
          return;
        }

        warningCount += res.data.metadata.skippedInvalidRows;
        results.push(res.data);
      }

      setState({ isParsing: false, error: null, warningCount, results });
    },
    [useCase]
  );

  return { ...state, parseFiles };
}

