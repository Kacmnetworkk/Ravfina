import {
  assertDevnetEndpoint,
  getLendingConfig,
  type LendingConfig,
} from "./config";
import { formatTokenAmount, parseTokenAmount } from "./money";

/**
 * Read-only devnet client for Ravfia Lending, built on plain fetch
 * JSON-RPC — no Solana dependency, and it never signs or sends a
 * transaction. The on-chain program and the full services package live in
 * kurtmorales-tech/solana-lending; this client only reads devnet state and
 * produces disbursement *plans* for a Ravfia operator to act on elsewhere.
 */

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

/**
 * Validates a Solana address string by base58 charset and decoded length
 * (32 bytes => 32–44 base58 chars). Mirrors the intent of the services
 * package's `toPublicKey` check without pulling in @solana/web3.js.
 */
export function assertBase58Address(value: string, field: string): string {
  if (
    typeof value !== "string" ||
    value.length < 32 ||
    value.length > 44 ||
    !BASE58_RE.test(value)
  ) {
    throw new Error(`Invalid public key for ${field}: "${value}"`);
  }
  return value;
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

async function rpc<T>(
  config: LendingConfig,
  method: string,
  params: unknown[],
): Promise<T> {
  assertDevnetEndpoint(config.rpcEndpoint);
  const res = await fetch(config.rpcEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) {
    throw new Error(`Devnet RPC ${method} failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as JsonRpcResponse<T>;
  if (body.error) {
    throw new Error(`Devnet RPC ${method} failed: ${body.error.message}`);
  }
  if (body.result === undefined) {
    throw new Error(`Devnet RPC ${method} returned no result`);
  }
  return body.result;
}

export interface LendingStatus {
  cluster: LendingConfig["cluster"];
  rpcEndpoint: string;
  /** Total RUSD supply, in smallest units (bigint serialized as string). */
  rusdSupplyUnits: string;
  /** Total RUSD supply, formatted as a decimal string. */
  rusdSupply: string;
  /** Lender wallet SOL balance, in lamports (bigint serialized as string). */
  lenderSolLamports: string;
  /** Lender wallet SOL balance, formatted as a decimal string. */
  lenderSol: string;
  /** Lender RUSD token accounts found on devnet (0 is a valid state). */
  lenderRusdAccountCount: number;
  /** Lender RUSD balance across those accounts, smallest units as string. */
  lenderRusdUnits: string;
  /** Lender RUSD balance, formatted as a decimal string. */
  lenderRusd: string;
  rusdMint: string;
  loanServicingProgramId: string;
  rusdLoanServicingProgramId: string;
  lenderWallet: string;
}

interface TokenSupplyResult {
  value: { amount: string; decimals: number };
}

interface BalanceResult {
  value: number;
}

interface TokenAccountsResult {
  value: Array<{ pubkey: string }>;
}

interface TokenAccountBalanceResult {
  value: { amount: string };
}

/**
 * Reads the current Ravfia Lending devnet state: RUSD mint supply, the
 * lender wallet's SOL balance, and the lender's RUSD token balance.
 * Read-only — this function cannot move funds.
 */
export async function getLendingStatus(
  config: LendingConfig = getLendingConfig(),
): Promise<LendingStatus> {
  const supply = await rpc<TokenSupplyResult>(config, "getTokenSupply", [
    config.rusdMint,
  ]);

  // getBalance returns { context, value } like the other RPC methods —
  // value is the lamport count. Treating the whole result as a number
  // makes BigInt(result) throw "Cannot convert [object Object] to a BigInt".
  const lamports = await rpc<BalanceResult>(config, "getBalance", [
    config.lenderWallet,
  ]);

  const accounts = await rpc<TokenAccountsResult>(
    config,
    "getTokenAccountsByOwner",
    [
      config.lenderWallet,
      { mint: config.rusdMint },
      { encoding: "jsonParsed" },
    ],
  );

  let lenderRusdUnits = 0n;
  for (const account of accounts.value) {
    const balance = await rpc<TokenAccountBalanceResult>(
      config,
      "getTokenAccountBalance",
      [account.pubkey],
    );
    lenderRusdUnits += BigInt(balance.value.amount);
  }

  return {
    cluster: config.cluster,
    rpcEndpoint: config.rpcEndpoint,
    rusdSupplyUnits: supply.value.amount,
    rusdSupply: formatTokenAmount(
      BigInt(supply.value.amount),
      supply.value.decimals,
    ),
    lenderSolLamports: String(lamports.value),
    lenderSol: formatTokenAmount(BigInt(lamports.value), 9),
    lenderRusdAccountCount: accounts.value.length,
    lenderRusdUnits: lenderRusdUnits.toString(),
    lenderRusd: formatTokenAmount(lenderRusdUnits, config.rusdDecimals),
    rusdMint: config.rusdMint,
    loanServicingProgramId: config.loanServicingProgramId,
    rusdLoanServicingProgramId: config.rusdLoanServicingProgramId,
    lenderWallet: config.lenderWallet,
  };
}

export interface DisbursementPlanInput {
  /** Borrower's RUSD token account (base58 address string). */
  borrowerTokenAccount: string;
  /** Principal as a decimal RUSD string, e.g. "100.5". */
  amount: string;
}

export interface DisbursementPlan {
  model: "rails";
  borrowerTokenAccount: string;
  /** Principal in RUSD smallest units (6 decimals), serialized as string. */
  amountUnits: string;
  /** Principal formatted as a decimal RUSD string. */
  amount: string;
  /** Steps a Ravfia operator/system performs outside this app. */
  steps: string[];
}

/**
 * Plans a loan disbursement over stablecoin rails, mirroring
 * `planDisbursement` in the services package's Embedded Finance playbook
 * (services/src/embedded-finance.ts). Plan only: nothing is built, signed,
 * or sent from the browser. The matching loan record is created through
 * the loan_servicing program by Ravfia's operator, outside this app.
 */
export function planDisbursement(input: DisbursementPlanInput): DisbursementPlan {
  const borrowerTokenAccount = assertBase58Address(
    input.borrowerTokenAccount.trim(),
    "borrowerTokenAccount",
  );
  const amountUnits = parseTokenAmount(input.amount.trim());
  if (amountUnits <= 0n) {
    throw new Error("Disbursement amount must be positive");
  }
  return {
    model: "rails",
    borrowerTokenAccount,
    amountUnits: amountUnits.toString(),
    amount: formatTokenAmount(amountUnits),
    steps: [
      "Confirm the loan is approved and recorded in Ravfia's off-chain systems",
      "Create or confirm the loan record via loan_servicing create_loan",
      "Refresh the blockhash, sign with the lender key outside this package, submit on devnet",
      "Reconcile the settlement against Ravfia's ledger from the transaction signature",
    ],
  };
}
