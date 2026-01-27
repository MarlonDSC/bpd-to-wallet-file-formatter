/**
 * ExcelGeneratorService - Generates Excel files using xlsx library
 */

import * as XLSX from 'xlsx';
import type { ExcelWorkbook } from '../../../domain/excel/entities/ExcelWorkbook';
import { ExcelGenerationError } from '../../../domain/excel/errors/ExcelErrors';
import { DateFormatterService } from '../../utils/services/DateFormatterService';

export interface ExcelGeneratorService {
  generateWorkbook(workbook: ExcelWorkbook): ArrayBuffer;
  createWorksheet(worksheet: import('../../../domain/excel/entities/ExcelWorksheet').ExcelWorksheet): XLSX.WorkSheet;
  formatCells(worksheet: XLSX.WorkSheet): void;
  formatHeaders(worksheet: XLSX.WorkSheet): void;
}

export class BrowserExcelGeneratorService implements ExcelGeneratorService {
  generateWorkbook(workbook: ExcelWorkbook): ArrayBuffer {
    try {
      workbook.validate();

      const xlsxWorkbook = XLSX.utils.book_new();

      // Create worksheets
      for (const worksheet of workbook.worksheets) {
        const xlsxWorksheet = this.createWorksheet(worksheet);
        XLSX.utils.book_append_sheet(xlsxWorkbook, xlsxWorksheet, worksheet.name);
      }

      // Generate Excel file as ArrayBuffer
      const excelBuffer = XLSX.write(xlsxWorkbook, {
        type: 'array',
        bookType: 'xlsx',
      });

      return excelBuffer;
    } catch (error) {
      throw new ExcelGenerationError(
        `Failed to generate Excel workbook: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  createWorksheet(
    worksheet: import('../../../domain/excel/entities/ExcelWorksheet').ExcelWorksheet
  ): XLSX.WorkSheet {
    try {
      // Get headers and rows
      const headers = worksheet.formatHeaders();
      const rows = worksheet.formatCells();

      // Create data array with headers first
      const data: Array<Array<string | number>> = [headers, ...rows];

      // Create worksheet from data
      const xlsxWorksheet = XLSX.utils.aoa_to_sheet(data);

      // Format cells
      this.formatCells(xlsxWorksheet);
      this.formatHeaders(xlsxWorksheet);

      return xlsxWorksheet;
    } catch (error) {
      throw new ExcelGenerationError(
        `Failed to create worksheet: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  formatCells(worksheet: XLSX.WorkSheet): void {
    if (!worksheet['!ref']) {
      return;
    }

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const dateFormatterService = new DateFormatterService();

    // Format each cell
    for (let row = 1; row <= range.e.r; row++) {
      // Skip header row (row 0)
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];

        if (!cell) {
          continue;
        }

        // Column 0: Date (DD/MM/YYYY)
        // Column 1: Date (Import) (DD/MM/YYYY)
        if (col === 0 || col === 1) {
          // Parse date string (DD/MM/YYYY) to Date object
          const dateString = String(cell.v);
          const date = dateFormatterService.parse(dateString);
          
          if (date) {
            // Set as date value for Excel
            cell.t = 'd'; // date type
            cell.v = date;
            cell.z = 'dd/mm/yyyy'; // Excel date format
          }
        }
        // Column 2: Note (text) - no formatting needed
        // Column 3: Currency (text) - no formatting needed
        // Column 4: Amount (number with 2 decimal places)
        else if (col === 4) {
          cell.t = 'n'; // number type
          cell.z = '#,##0.00'; // Excel number format with 2 decimal places
        }
      }
    }
  }

  formatHeaders(worksheet: XLSX.WorkSheet): void {
    if (!worksheet['!ref']) {
      return;
    }

    const range = XLSX.utils.decode_range(worksheet['!ref']);

    // Format header row (row 0)
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellAddress];

      if (!cell) {
        continue;
      }

      // Make headers bold
      cell.s = {
        font: { bold: true },
        alignment: { horizontal: 'left', vertical: 'top' },
      };
    }
  }
}
