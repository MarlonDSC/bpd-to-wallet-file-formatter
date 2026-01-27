/**
 * CsvRowDto - Extracted BPD transaction row DTO
 */

export interface CsvRowDto {
  rowNumber: number;
  fechaPosteo: string;
  descripcion: string;
  montoTransaccion: string;
  rawData: string[];
}

