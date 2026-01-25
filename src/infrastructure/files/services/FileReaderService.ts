/**
 * FileReaderService - Handles file reading using Browser File API
 */

export interface FileReaderService {
  readFile(file: File): Promise<string>;
  readAsText(file: File, encoding?: string): Promise<string>;
}

export class BrowserFileReaderService implements FileReaderService {
  async readFile(file: File): Promise<string> {
    return await file.text();
  }

  async readAsText(file: File, encoding: string = 'UTF-8'): Promise<string> {
    if (encoding && encoding.toUpperCase() !== 'UTF-8') {
      throw new Error(`Unsupported encoding: ${encoding}. Only UTF-8 is supported.`);
    }

    return await file.text();
  }

  detectEncoding(): string {
    return 'UTF-8';
  }
}
