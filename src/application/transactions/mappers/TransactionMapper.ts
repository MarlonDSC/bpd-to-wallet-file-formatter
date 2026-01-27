/**
 * TransactionMapper - Maps between domain entities, DTOs, and view models
 */

import { Transaction } from '../../../domain/transactions/entities/Transaction';
import { TransactionDate } from '../../../domain/transactions/value-objects/TransactionDate';
import { Amount } from '../../../domain/transactions/value-objects/Amount';
import { Currency } from '../../../domain/transactions/value-objects/Currency';
import type { TransactionDto } from '../dtos/TransactionDto';
import type { CsvRowDto } from '../../csv/dtos/CsvRowDto';

export class TransactionMapper {
  /**
   * Maps a CsvRowDto to a Transaction domain entity
   */
  static toDomain(csvRow: CsvRowDto): Transaction {
    const date = TransactionDate.fromString(csvRow.fechaPosteo);
    const dateImport = date.toImportDate();
    const amount = Amount.fromString(csvRow.montoTransaccion);
    const currency = Currency.DOP();

    return new Transaction({
      date,
      dateImport,
      note: csvRow.descripcion,
      currency,
      amount,
    });
  }

  /**
   * Maps a Transaction domain entity to a TransactionDto
   */
  static toDto(transaction: Transaction): TransactionDto {
    return {
      date: transaction.date.format(),
      dateImport: transaction.dateImport.format(),
      note: transaction.note,
      currency: transaction.currency.code,
      amount: transaction.amount.toFormattedAmount(),
    };
  }

  /**
   * Maps a Transaction domain entity to an Excel row format
   * Returns an array of values in the order: Date, Date (Import), Note, Currency, Amount
   * Dates are returned as Date objects so Excel recognizes them as dates
   */
  static toExcelRow(transaction: Transaction): (string | number | Date)[] {
    return [
      transaction.date.toDate(), // Date object for Excel
      transaction.dateImport.toDate(), // Date object for Excel
      transaction.note,
      transaction.currency.code,
      transaction.amount.toFormattedAmount(),
    ];
  }
}
