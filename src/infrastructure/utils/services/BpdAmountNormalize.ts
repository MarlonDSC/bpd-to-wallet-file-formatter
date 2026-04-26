/**
 * Normalizes BPD-style amount strings from PDFs (currency symbol, thousands, trailing minus).
 */

export function normalizeBpdAmountString(raw: string): string {
  let s = raw.trim().replaceAll('$', '').replaceAll(',', '').replaceAll(/\s+/g, '');
  let negative = false;
  if (s.endsWith('-')) {
    negative = true;
    s = s.slice(0, -1).trim();
  }
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1).trim();
  }
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  const n = Number.parseFloat(s);
  if (Number.isNaN(n)) {
    return raw.trim();
  }
  const v = negative ? -Math.abs(n) : n;
  return String(v);
}
