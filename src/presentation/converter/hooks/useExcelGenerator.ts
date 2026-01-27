/**
 * useExcelGenerator - Hook to generate and download Excel files
 */

import { useCallback, useMemo, useState } from 'react';
import { GenerateExcelUseCase } from '../../../application/excel/use-cases/GenerateExcelUseCase';
import { ExportExcelUseCase } from '../../../application/excel/use-cases/ExportExcelUseCase';
import { BrowserExcelGeneratorService } from '../../../infrastructure/files/services/ExcelGeneratorService';
import { BrowserFileDownloadService } from '../../../infrastructure/files/services/FileDownloadService';
import type { TransactionDto } from '../../../application/transactions/dtos/TransactionDto';
import type { ExcelError } from '../../../domain/excel/errors/ExcelErrors';

export interface ExcelGeneratorState {
  isGenerating: boolean;
  error: ExcelError | null;
}

export function useExcelGenerator() {
  const excelGeneratorService = useMemo(
    () => new BrowserExcelGeneratorService(),
    []
  );
  const fileDownloadService = useMemo(
    () => new BrowserFileDownloadService(),
    []
  );
  const generateExcelUseCase = useMemo(
    () => new GenerateExcelUseCase(excelGeneratorService),
    [excelGeneratorService]
  );
  const exportExcelUseCase = useMemo(
    () => new ExportExcelUseCase(fileDownloadService),
    [fileDownloadService]
  );

  const [state, setState] = useState<ExcelGeneratorState>({
    isGenerating: false,
    error: null,
  });

  const generateAndDownload = useCallback(
    async (transactions: TransactionDto[]) => {
      setState({
        isGenerating: true,
        error: null,
      });

      try {
        // Generate Excel file
        const generateResult = generateExcelUseCase.execute(transactions);

        if (!generateResult.success) {
          setState({
            isGenerating: false,
            error: generateResult.error,
          });
          return;
        }

        // Export Excel file
        const exportResult = exportExcelUseCase.execute(generateResult.data);

        if (!exportResult.success) {
          setState({
            isGenerating: false,
            error: exportResult.error,
          });
          return;
        }

        // Success
        setState({
          isGenerating: false,
          error: null,
        });
      } catch (error) {
        setState({
          isGenerating: false,
          error:
            error instanceof Error
              ? (error as ExcelError)
              : new Error(String(error)) as ExcelError,
        });
      }
    },
    [generateExcelUseCase, exportExcelUseCase]
  );

  return {
    ...state,
    generateAndDownload,
  };
}
