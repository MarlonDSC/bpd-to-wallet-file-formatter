/**
 * usePdfParser - Parses uploaded BPD statement PDFs into CsvParseResultDto.
 */

import { useCallback, useMemo, useState } from 'react';
import { ParsePdfUseCase } from '../../../application/pdf/use-cases/ParsePdfUseCase';
import type { CsvParseResultDto } from '../../../application/csv/dtos/CsvParseResultDto';
import type { FileUploadViewModel } from '../view-models/FileUploadViewModel';
import type { CsvError } from '../../../domain/csv/errors/CsvErrors';

export interface PdfParsingState {
  isParsing: boolean;
  error: CsvError | null;
  warningCount: number;
  results: CsvParseResultDto[] | null;
}

export function usePdfParser() {
  const useCase = useMemo(() => new ParsePdfUseCase(), []);
  const [state, setState] = useState<PdfParsingState>({
    isParsing: false,
    error: null,
    warningCount: 0,
    results: null,
  });

  const parsePdfFiles = useCallback(
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

  const reset = useCallback(() => {
    setState({ isParsing: false, error: null, warningCount: 0, results: null });
  }, []);

  return { ...state, parsePdfFiles, reset };
}
