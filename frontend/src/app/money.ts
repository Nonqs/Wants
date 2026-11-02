export function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Parse the fractional digits directly: never multiply a decimal float by 100.
export function signedCents(raw: string): number | null {
  const text = raw.trim();
  if (!/^-?\d+(?:[,.]\d{1,2})?$/.test(text)) return null;
  const negative = text.startsWith('-');
  const [whole, dec = ''] = text.replace('-', '').replace(',', '.').split('.');
  const amount = Number(whole) * 100 + Number(dec.padEnd(2, '0'));
  return Number.isSafeInteger(amount) ? (negative ? -amount : amount) : null;
}
export function cents(raw: string): number | null {
  const amount = signedCents(raw);
  return amount !== null && amount > 0 ? amount : null;
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function euro(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount / 100);
}
