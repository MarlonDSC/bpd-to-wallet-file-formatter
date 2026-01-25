/**
 * CsvRow domain entity
 * Represents a parsed CSV row with helpers for extraction.
 */

export class CsvRow {
  public readonly rowNumber: number;
  public readonly data: readonly string[];

  constructor(rowNumber: number, data: readonly string[]) {
    this.rowNumber = rowNumber;
    this.data = Object.freeze([...data]);
  }

  isEmpty(): boolean {
    return this.data.every((cell) => (cell ?? '').trim() === '');
  }

  getColumnValue(index: number): string {
    const value = this.data[index];
    return (value ?? '').toString();
  }

  /**
   * Checks if this row is a column header row for the given required columns.
   * Matching is case-insensitive and accent-insensitive.
   */
  isHeaderRow(requiredColumns: readonly string[]): boolean {
    const normalizedCells = this.data.map(CsvRow.normalizeHeaderToken);
    return requiredColumns
      .map(CsvRow.normalizeHeaderToken)
      .every((required) => normalizedCells.includes(required));
  }

  private static normalizeHeaderToken(value: string): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }
}

