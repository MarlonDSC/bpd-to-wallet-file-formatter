/**
 * TransactionDto - Output DTO for transformed transactions
 */

export interface TransactionDto {
  date: string; // DD/MM/YYYY format
  dateImport: string; // DD/MM/YYYY format (date + 1 day)
  note: string;
  currency: string; // "DOP"
  amount: number; // Positive for credits, negative for debits, 2 decimal places
}
