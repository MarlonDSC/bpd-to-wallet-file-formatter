/**
 * ExcelMapper - Maps between domain entities and DTOs
 */

import { ExcelWorkbook } from '../../../domain/excel/entities/ExcelWorkbook';
import { ExcelWorksheet } from '../../../domain/excel/entities/ExcelWorksheet';
import { ExcelRow } from '../../../domain/excel/value-objects/ExcelRow';
import type { TransactionDto } from '../../transactions/dtos/TransactionDto';
import type { ExcelFileDto } from '../dtos/ExcelFileDto';

export class ExcelMapper {
  /**
   * Converts TransactionDto[] to ExcelWorkbook domain entity
   */
  static toDomain(transactions: TransactionDto[]): ExcelWorkbook {
    if (transactions.length === 0) {
      throw new Error('Cannot create Excel workbook from empty transaction list');
    }

    // Create Excel rows from transactions
    const rows = transactions.map(
      (transaction) =>
        new ExcelRow({
          date: transaction.date,
          dateImport: transaction.dateImport,
          note: transaction.note,
          currency: transaction.currency,
          amount: transaction.amount,
        })
    );

    // Create worksheet with all rows
    const worksheet = new ExcelWorksheet({
      name: 'Transactions',
      rows,
    });

    // Calculate date range for metadata
    const dates = transactions.map((t) => {
      const [day, month, year] = t.date.split('/').map(Number);
      return new Date(year, month - 1, day);
    });
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    const formatDate = (date: Date): string => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Create workbook
    const workbook = new ExcelWorkbook({
      worksheets: [worksheet],
      metadata: {
        createdAt: new Date(),
        transactionCount: transactions.length,
        dateRange: {
          minDate: formatDate(minDate),
          maxDate: formatDate(maxDate),
        },
      },
    });

    return workbook;
  }

  /**
   * Converts ExcelWorkbook to ExcelFileDto
   * Note: The actual Excel file generation happens in the infrastructure layer
   */
  static toDto(
    excelBuffer: ArrayBuffer,
    fileName: string
  ): ExcelFileDto {
    return {
      workbook: excelBuffer,
      fileName,
      fileSize: excelBuffer.byteLength,
    };
  }

  /**
   * Converts ExcelWorkbook to view model for preview
   */
  static toViewModel(workbook: ExcelWorkbook): {
    headers: string[];
    rows: Array<{
      date: string;
      dateImport: string;
      note: string;
      currency: string;
      amount: number;
    }>;
  } {
    if (workbook.worksheets.length === 0) {
      return { headers: [], rows: [] };
    }

    const worksheet = workbook.worksheets[0];
    return {
      headers: worksheet.formatHeaders(),
      rows: worksheet.rows.map((row) => ({
        date: row.date,
        dateImport: row.dateImport,
        note: row.note,
        currency: row.currency,
        amount: row.amount,
      })),
    };
  }
}
