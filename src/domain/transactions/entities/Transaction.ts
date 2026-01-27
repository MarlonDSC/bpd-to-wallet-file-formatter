/**
 * Transaction domain entity
 * Represents a transformed transaction with all required fields.
 */

import { TransactionDate } from '../value-objects/TransactionDate';
import { Amount } from '../value-objects/Amount';
import { Currency } from '../value-objects/Currency';

export class Transaction {
  public readonly date: TransactionDate;
  public readonly dateImport: TransactionDate;
  public readonly note: string;
  public readonly currency: Currency;
  public readonly amount: Amount;

  constructor(params: {
    date: TransactionDate;
    dateImport: TransactionDate;
    note: string;
    currency: Currency;
    amount: Amount;
  }) {
    this.date = params.date;
    this.dateImport = params.dateImport;
    this.note = params.note.trim();
    this.currency = params.currency;
    this.amount = params.amount;
  }

  /**
   * Checks if this is a credit transaction (positive amount)
   */
  isCredit(): boolean {
    return this.amount.isCredit;
  }

  /**
   * Checks if this is a debit transaction (negative amount)
   */
  isDebit(): boolean {
    return !this.amount.isCredit;
  }

  /**
   * Validates the transaction
   */
  validate(): void {
    if (!this.note || this.note.length === 0) {
      throw new Error('Transaction note cannot be empty');
    }
    this.currency.validate();
  }
}
