/**
 * UploadedFileDto - Data Transfer Object for file uploads
 */

export interface UploadedFileDto {
  id: string;
  name: string;
  size: number; // in bytes
  sizeInMB: number;
  type: string; // file extension
  file: File;
}
