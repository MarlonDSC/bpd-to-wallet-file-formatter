/**
 * Extracts a rough table grid from PDF text runs (pdf.js).
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ParseError } from '../../../domain/csv/errors/CsvErrors';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface TextPiece {
  x: number;
  y: number;
  w: number;
  str: string;
}

function splitLineIntoColumns(line: TextPiece[]): string[] {
  if (line.length === 0) {
    return [];
  }
  line.sort((a, b) => a.x - b.x);
  if (line.length === 1) {
    return [line[0].str.trim()];
  }

  const gaps: number[] = [];
  for (let i = 1; i < line.length; i++) {
    const prev = line[i - 1];
    const prevEnd = prev.x + (prev.w || 0);
    gaps.push(line[i].x - prevEnd);
  }
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)] ?? 2;
  const threshold = Math.max(medianGap * 2.5, 8);

  const cells: string[] = [];
  let cellParts: string[] = [line[0].str];
  for (let i = 1; i < line.length; i++) {
    const g = gaps[i - 1];
    if (g > threshold) {
      cells.push(cellParts.join(' ').trim());
      cellParts = [line[i].str];
    } else {
      cellParts.push(line[i].str);
    }
  }
  cells.push(cellParts.join(' ').trim());
  return cells;
}

function bucketLines(pieces: TextPiece[], yTol: number): TextPiece[][] {
  pieces.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextPiece[][] = [];
  for (const p of pieces) {
    const last = lines[lines.length - 1];
    if (!last || Math.abs(last[0].y - p.y) > yTol) {
      lines.push([p]);
    } else {
      last.push(p);
    }
  }
  return lines;
}

export class PdfTextGridExtractorService {
  async extractRows(file: File): Promise<string[][]> {
    let bytes: ArrayBuffer;
    try {
      bytes = await file.arrayBuffer();
    } catch (e) {
      throw new ParseError(`Unable to read PDF file: ${(e as Error).message}`);
    }

    let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
    try {
      pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
    } catch (e) {
      throw new ParseError(
        `Unable to open PDF: ${e instanceof Error ? e.message : String(e)}`
      );
    }

    const allRows: string[][] = [];
    const yTol = 4;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pieces: TextPiece[] = [];

      for (const item of content.items) {
        if (!('str' in item) || typeof item.str !== 'string' || item.str.trim() === '') {
          continue;
        }
        const tm = item.transform;
        const x = tm[4];
        const y = tm[5];
        const w = 'width' in item && typeof item.width === 'number' ? item.width : 0;
        pieces.push({ x, y, w, str: item.str });
      }

      const lines = bucketLines(pieces, yTol);
      for (const line of lines) {
        allRows.push(splitLineIntoColumns(line));
      }
    }

    return allRows;
  }
}
