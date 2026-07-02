const SYMBOLS: Record<string, string> = {
  NGN: '\u20A6',
  USD: '$',
  GBP: '\u00A3',
  EUR: '\u20AC',
}

export function formatPrice(
  amount: number | string,
  currency = 'NGN',
): string {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount
  const symbol = SYMBOLS[currency] ?? ''
  return `${symbol}${value.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}
