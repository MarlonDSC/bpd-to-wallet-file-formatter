/**
 * FileDownloadService - Handles file download using browser APIs
 */

export interface FileDownloadService {
  downloadFile(
    buffer: ArrayBuffer,
    fileName: string,
    mimeType: string
  ): void;
  generateFileName(baseName: string, extension: string): string;
}

export class BrowserFileDownloadService implements FileDownloadService {
  downloadFile(
    buffer: ArrayBuffer,
    fileName: string,
    mimeType: string
  ): void {
    try {
      // Create blob from buffer
      const blob = new Blob([buffer], { type: mimeType });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Clean up object URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      throw new Error(
        `Failed to download file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  generateFileName(baseName: string, extension: string): string {
    // Remove extension if already present
    const nameWithoutExt = baseName.replaceAll(/\.\w+$/, '');
    return `${nameWithoutExt}.${extension}`;
  }
}
