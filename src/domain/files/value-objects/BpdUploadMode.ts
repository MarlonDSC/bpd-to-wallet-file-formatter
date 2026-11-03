export type BpdUploadMode = 'bpd-csv' | 'bpd-pdf-print' | 'bpd-pdf-inbox';

/**
 * PDF statement layout:
 * - print: bank-account print (Fecha efectiva, Descripción, Monto)
 * - inbox: emailed statement / al corte style (DETALLE, DÉBITO, CRÉDITO)
 */
export type BpdPdfLayout = 'print' | 'inbox';

export function isPdfUploadMode(mode: BpdUploadMode): boolean {
  return mode === 'bpd-pdf-print' || mode === 'bpd-pdf-inbox';
}

export function pdfLayoutForUploadMode(mode: BpdUploadMode): BpdPdfLayout | null {
  if (mode === 'bpd-pdf-print') {
    return 'print';
  }
  if (mode === 'bpd-pdf-inbox') {
    return 'inbox';
  }
  return null;
}
