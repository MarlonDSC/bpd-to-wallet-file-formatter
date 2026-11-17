/**
 * TransactionDto - Output DTO for transformed transactions
 */

export interface TransactionDto {
  date: string; // DD/MM/YYYY format
  /**
   * Wallet import date (DD/MM/YYYY): transaction date + 1 day.
   * Compensates for Wallet decreasing dates by one day on import.
   */
  dateImport: string;
  note: string;
  currency: string; // "DOP"
  amount: number; // Positive for credits, negative for debits, 2 decimal places
}
