/**
 * ExcelFileDto - Output DTO for Excel file generation
 */

export interface ExcelFileDto {
  workbook: ArrayBuffer; // Excel file as ArrayBuffer
  fileName: string;
  fileSize: number; // Size in bytes
}
