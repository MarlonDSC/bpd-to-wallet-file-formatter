/**
 * useFilteredExcelGenerator - Hook to generate and download filtered Excel files
 */

import { useCallback, useMemo, useState } from 'react';
import { GenerateFilteredExcelUseCase } from '../../../application/excel/use-cases/GenerateFilteredExcelUseCase';
import { ExportExcelUseCase } from '../../../application/excel/use-cases/ExportExcelUseCase';
import { BrowserExcelGeneratorService } from '../../../infrastructure/files/services/ExcelGeneratorService';
import { BrowserFileDownloadService } from '../../../infrastructure/files/services/FileDownloadService';
import type { TransactionDto } from '../../../application/transactions/dtos/TransactionDto';
import type { DateFilterDto } from '../../../application/excel/dtos/DateFilterDto';
import type { ExcelError } from '../../../domain/excel/errors/ExcelErrors';
import type { DateFilterError } from '../../../domain/excel/errors/DateFilterErrors';

export interface FilteredExcelGeneratorState {
  isGenerating: boolean;
  error: ExcelError | DateFilterError | null;
}

export function useFilteredExcelGenerator() {
  const excelGeneratorService = useMemo(
    () => new BrowserExcelGeneratorService(),
    []
  );
  const fileDownloadService = useMemo(
    () => new BrowserFileDownloadService(),
    []
  );
  const generateFilteredExcelUseCase = useMemo(
    () => new GenerateFilteredExcelUseCase(excelGeneratorService),
    [excelGeneratorService]
  );
  const exportExcelUseCase = useMemo(
    () => new ExportExcelUseCase(fileDownloadService),
    [fileDownloadService]
  );

  const [state, setState] = useState<FilteredExcelGeneratorState>({
    isGenerating: false,
    error: null,
  });

  const generateAndDownload = useCallback(
    async (transactions: TransactionDto[], filter: DateFilterDto | null) => {
      if (!filter) {
        setState({
          isGenerating: false,
          error: new Error('No date filter selected') as ExcelError,
        });
        return;
      }

      setState({
        isGenerating: true,
        error: null,
      });

      try {
        // Generate Excel file with filter
        const generateResult = generateFilteredExcelUseCase.execute(transactions, filter);

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
              ? (error as ExcelError | DateFilterError)
              : new Error(String(error)) as ExcelError | DateFilterError,
        });
      }
    },
    [generateFilteredExcelUseCase, exportExcelUseCase]
  );

  const generateAndDownloadMultiple = useCallback(
    async (transactions: TransactionDto[], filters: DateFilterDto[]) => {
      if (filters.length === 0) {
        setState({
          isGenerating: false,
          error: new Error('No date filters selected') as ExcelError,
        });
        return;
      }

      setState({
        isGenerating: true,
        error: null,
      });

      try {
        // Generate and download Excel file for each filter
        for (const filter of filters) {
          const generateResult = generateFilteredExcelUseCase.execute(transactions, filter);

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

          // Small delay between downloads to avoid browser blocking multiple downloads
          if (filters.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
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
              ? (error as ExcelError | DateFilterError)
              : new Error(String(error)) as ExcelError | DateFilterError,
        });
      }
    },
    [generateFilteredExcelUseCase, exportExcelUseCase]
  );

  return {
    ...state,
    generateAndDownload,
    generateAndDownloadMultiple,
  };
}
