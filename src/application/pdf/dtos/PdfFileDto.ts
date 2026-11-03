import type { BpdPdfLayout } from '../../../domain/files/value-objects/BpdUploadMode';

export interface PdfFileDto {
  file: File;
  /** Statement layout; defaults to bank-print PDF when omitted. */
  layout?: BpdPdfLayout;
}
