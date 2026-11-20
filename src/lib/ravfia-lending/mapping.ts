import type { LoanFacility } from "../../domain/treasury";
import {
  CLUSTER,
  LENDER_WALLET,
  LOAN_SERVICING_PROGRAM_ID,
  RUSD_LOAN_SERVICING_PROGRAM_ID,
  RUSD_MINT,
  RUSD_SYMBOL,
  type LendingConfig,
} from "./config";
import { formatTokenAmount, parseTokenAmount, sumUnits } from "./money";

/**
 * Maps Ravfina's off-chain LoanFacility records to Ravfia Lending (Solana,
 * devnet) settlement terms: the same amounts expressed in RUSD smallest
 * units, plus devnet explorer links for the on-chain accounts involved.
 * Ravfia is the lender of record for every facility.
 */

/** Devnet explorer URL for an address, in the services package's format. */
export function explorerUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=${CLUSTER}`;
}

export interface LendingExplorerLinks {
  rusdMint: string;
  loanServicingProgram: string;
  rusdLoanServicingProgram: string;
  lenderWallet: string;
}

export function lendingExplorerLinks(): LendingExplorerLinks {
  return {
    rusdMint: explorerUrl(RUSD_MINT),
    loanServicingProgram: explorerUrl(LOAN_SERVICING_PROGRAM_ID),
    rusdLoanServicingProgram: explorerUrl(RUSD_LOAN_SERVICING_PROGRAM_ID),
    lenderWallet: explorerUrl(LENDER_WALLET),
  };
}

/**
 * Converts a Ravfina USD number (a float in the treasury domain) into an
 * exact decimal string safe for parseTokenAmount: fixed to 6 places, then
 * trailing zeros trimmed. Money math itself is always bigint (money.ts).
 */
export function usdNumberToDecimalString(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid USD amount: ${value}`);
  }
  const fixed = value.toFixed(6);
  return fixed.includes(".")
    ? fixed.replace(/\.?0+$/, "") || "0"
    : fixed;
}

export interface FacilityLendingSummary {
  facilityId: string;
  facilityName: string;
  status: LoanFacility["status"];
  /** Lender of record for the facility — always Ravfia. */
  lender: "Ravfia";
  symbol: typeof RUSD_SYMBOL;
  /** Outstanding principal in RUSD smallest units, as a string. */
  principalUnits: string;
  /** Outstanding principal formatted as a decimal RUSD string. */
  principal: string;
  /** Credit limit in RUSD smallest units, as a string. */
  creditLimitUnits: string;
  /** Credit limit formatted as a decimal RUSD string. */
  creditLimit: string;
  explorer: LendingExplorerLinks;
}

export function mapFacilityToLendingSummary(
  facility: LoanFacility,
): FacilityLendingSummary {
  const principalUnits = parseTokenAmount(
    usdNumberToDecimalString(facility.principalBalance),
  );
  const creditLimitUnits = parseTokenAmount(
    usdNumberToDecimalString(facility.creditLimit),
  );
  return {
    facilityId: facility.id,
    facilityName: facility.name,
    status: facility.status,
    lender: "Ravfia",
    symbol: RUSD_SYMBOL,
    principalUnits: principalUnits.toString(),
    principal: formatTokenAmount(principalUnits),
    creditLimitUnits: creditLimitUnits.toString(),
    creditLimit: formatTokenAmount(creditLimitUnits),
    explorer: lendingExplorerLinks(),
  };
}

export interface PortfolioLendingSummary {
  facilityCount: number;
  /** Total outstanding principal across facilities, RUSD units as string. */
  totalPrincipalUnits: string;
  /** Total outstanding principal formatted as a decimal RUSD string. */
  totalPrincipal: string;
  /** Total credit limit across facilities, RUSD units as string. */
  totalCreditLimitUnits: string;
  /** Total credit limit formatted as a decimal RUSD string. */
  totalCreditLimit: string;
  facilities: FacilityLendingSummary[];
  explorer: LendingExplorerLinks;
}

export function mapFacilitiesToLendingSummary(
  facilities: LoanFacility[],
  _config?: LendingConfig,
): PortfolioLendingSummary {
  const summaries = facilities.map(mapFacilityToLendingSummary);
  const totalPrincipal = sumUnits(
    summaries.map((s) => BigInt(s.principalUnits)),
  );
  const totalCreditLimit = sumUnits(
    summaries.map((s) => BigInt(s.creditLimitUnits)),
  );
  return {
    facilityCount: facilities.length,
    totalPrincipalUnits: totalPrincipal.toString(),
    totalPrincipal: formatTokenAmount(totalPrincipal),
    totalCreditLimitUnits: totalCreditLimit.toString(),
    totalCreditLimit: formatTokenAmount(totalCreditLimit),
    facilities: summaries,
    explorer: lendingExplorerLinks(),
  };
}
