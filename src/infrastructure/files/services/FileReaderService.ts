/**
 * FileReaderService - Handles file reading using Browser File API
 */

export interface FileReaderService {
  readFile(file: File): Promise<string>;
  readAsText(file: File, encoding?: string): Promise<string>;
}

export class BrowserFileReaderService implements FileReaderService {
  async readFile(file: File): Promise<string> {
    return this.readAsText(file);
  }

  readAsText(file: File, encoding: string = 'UTF-8'): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file, encoding);
    });
  }

  detectEncoding(): string {
    // Default to UTF-8, can be enhanced with actual encoding detection
    return 'UTF-8';
  }
}
