export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', GBP: '£', EUR: '€', JPY: '¥', CNY: '¥', KRW: '₩',
  AED: 'د.إ', SAR: '﷼', BDT: '৳', PKR: '₨', IDR: 'Rp', MYR: 'RM',
  THB: '฿', PHP: '₱', BRL: 'R$', MXN: '$', ZAR: 'R', SGD: 'S$',
  HKD: 'HK$', CAD: 'CA$', AUD: 'A$', NZD: 'NZ$', CHF: 'CHF',
  SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', RUB: '₽', TRY: '₺',
  ILS: '₪', NGN: '₦', KES: 'KSh', GHS: 'GH₵', EGP: 'E£', VND: '₫',
  TWD: 'NT$', UAH: '₴', CZK: 'Kč', HUF: 'Ft', RON: 'lei',
};

/** Units that render as suffix labels (not currency prefixes). */
export const LABEL_UNITS = new Set(['%', 'people', 'months', '/mo', 'count', 'x', '$/mo', '$/wk']);

export function getCurrencySymbol(currencyCode: string | null | undefined): string {
  if (!currencyCode) return '$';
  const normalized = currencyCode.trim().toUpperCase();
  return CURRENCY_SYMBOLS[normalized] ?? normalized;
}

/** True if the unit string should be displayed as a prefix (before the number). */
export function isCurrencyPrefix(unit: string | undefined): boolean {
  return !!unit && unit !== '%' && !LABEL_UNITS.has(unit);
}
