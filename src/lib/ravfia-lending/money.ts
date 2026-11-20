import { RUSD_DECIMALS } from "./config";

/**
 * Exact token-amount handling, ported from `@ravfia/lending-services`
 * (services/src/money.ts in kurtmorales-tech/solana-lending). All amounts
 * are bigint counts of the mint's smallest unit (for RUSD, 6 decimals:
 * 1 RUSD = 1,000,000 units). Decimal strings are parsed exactly; floats
 * are never used for money.
 */

const DECIMAL_RE = /^\d+(\.\d+)?$/;

/**
 * Parses a non-negative decimal string (e.g. "100.5") into smallest units.
 * Rejects signs, exponents, thousands separators, and more fractional
 * digits than the mint supports.
 */
export function parseTokenAmount(input: string, decimals: number = RUSD_DECIMALS): bigint {
  if (!DECIMAL_RE.test(input)) {
    throw new Error(`Invalid token amount: "${input}"`);
  }
  const [whole, fraction = ""] = input.split(".");
  if (fraction.length > decimals) {
    throw new Error(
      `Amount "${input}" has more than ${decimals} decimal places`,
    );
  }
  const scale = 10n ** BigInt(decimals);
  const wholeUnits = BigInt(whole as string) * scale;
  const fractionUnits =
    fraction.length === 0
      ? 0n
      : BigInt(fraction.padEnd(decimals, "0"));
  return wholeUnits + fractionUnits;
}

/** Formats smallest units back into a plain decimal string. */
export function formatTokenAmount(units: bigint, decimals: number = RUSD_DECIMALS): string {
  if (units < 0n) {
    throw new Error("Cannot format a negative token amount");
  }
  const scale = 10n ** BigInt(decimals);
  const whole = units / scale;
  const fraction = units % scale;
  if (fraction === 0n) {
    return whole.toString();
  }
  const fractionStr = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return `${whole.toString()}.${fractionStr}`;
}

/** Adds amounts with a sanity check that the result stays non-negative. */
export function sumUnits(amounts: Iterable<bigint>): bigint {
  let total = 0n;
  for (const amount of amounts) {
    if (amount < 0n) {
      throw new Error("Negative token amount in sum");
    }
    total += amount;
  }
  return total;
}

/** Basis-point share of an amount, floor rounding (matches repo convention). */
export function bpsOf(amount: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    throw new Error(`Invalid basis points: ${bps}`);
  }
  return (amount * BigInt(bps)) / 10_000n;
}
