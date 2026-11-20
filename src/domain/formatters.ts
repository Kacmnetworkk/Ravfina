import type { CurrencyCode } from './treasury';

export function toMinorUnits(amountMajor: number, currency: CurrencyCode = 'USD'): number {
  if (!Number.isFinite(amountMajor)) return 0;
  const factor = currency === 'JPY' ? 1 : 100;
  return Math.round(amountMajor * factor);
}

export function fromMinorUnits(amountMinor: number, currency: CurrencyCode = 'USD'): number {
  const factor = currency === 'JPY' ? 1 : 100;
  return amountMinor / factor;
}

export function formatMinorUnits(
  amountMinor: number,
  currency: CurrencyCode = 'USD',
  options?: { compact?: boolean },
): string {
  const major = fromMinorUnits(amountMinor, currency);
  const decimals = currency === 'JPY' ? 0 : 2;
  if (options?.compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(major);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

export function formatTabularNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatBasisPoints(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}
