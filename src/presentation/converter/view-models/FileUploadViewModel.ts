/**
 * FileUploadViewModel - UI-specific data structure for file display
 */

export interface FileUploadViewModel {
  id: string;
  name: string;
  size: number; // in bytes
  sizeInMB: number;
  type: string; // file extension
  file: File;
}
