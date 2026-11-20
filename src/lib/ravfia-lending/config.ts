/**
 * Ravfia Lending on Solana — devnet configuration for the Ravfina app.
 *
 * Mirrors the constants and guard logic of the `@ravfia/lending-services`
 * package in kurtmorales-tech/solana-lending (services/src/config.ts),
 * without any Solana dependency: addresses are plain strings and all
 * on-chain reads in this app go through plain JSON-RPC fetch.
 *
 * Hard rule: devnet only. There are no real funds, no live lending, and no
 * mainnet path here. Any attempt to point this config at mainnet throws.
 * Ravfia is the lender of record; the lender wallet below is the on-chain
 * `config.lender` and the RUSD mint authority.
 */

export const CLUSTER = "devnet" as const;
export type Cluster = typeof CLUSTER;

export const DEVNET_RPC_ENDPOINT = "https://api.devnet.solana.com";

/** RUSD — Ravfia USD, Ravfia-controlled devnet mint, 6 decimals. */
export const RUSD_MINT = "RavjJ8xMrGpZbfs6XzRf8V5fg2LXjMwL3YT6aTWqoeV";
export const RUSD_DECIMALS = 6;
export const RUSD_SYMBOL = "RUSD";

/**
 * Presentation name (rename, 2026-11-17): the mint above was issued as
 * Ravfia USD (RUSD); its presentation name is now Ravfia Coin (RVCN).
 * Token details — mint, decimals, supply — are unchanged.
 */
export const RAVFIA_COIN_NAME = "Ravfia Coin";
export const RAVFIA_COIN_SYMBOL = "RVCN";
export const TOKEN_METADATA_URI =
  "https://raw.githubusercontent.com/kurtmorales-tech/ravfia-token/main/metadata.json";
export const TOKEN_IMAGE_URI =
  "https://raw.githubusercontent.com/kurtmorales-tech/ravfia-token/main/ravfia-coin.png";

/** Canonical loan_servicing deployment (devnet USDC instance), per Anchor.toml. */
export const LOAN_SERVICING_PROGRAM_ID =
  "AZwMFQFgkNw87Q3tTxpdkBH1ozU5xCAKyiZgnY4fUBbc";

/** Second loan_servicing deployment bound to the RUSD mint. */
export const RUSD_LOAN_SERVICING_PROGRAM_ID =
  "AsksuXLhQ2fJKV3VkGzEnQiAqkxa1PCnoMSZkTwnjdpZ";

/** Ravfia wallet: lender of record, RUSD mint authority, upgrade authority. */
export const LENDER_WALLET = "2ZQg42CPRKFqdUQeQRueHwYEpFJS76mq2yWHVpGEkJFc";

export class MainnetRefusedError extends Error {
  constructor(detail: string) {
    super(`Refused: ${detail}. This integration is devnet-only; no real funds.`);
    this.name = "MainnetRefusedError";
  }
}

/**
 * Throws unless the given cluster string is exactly "devnet".
 * "mainnet-beta", "mainnet", localnet, and anything else are refused.
 */
export function assertDevnet(cluster: string): asserts cluster is Cluster {
  if (cluster !== CLUSTER) {
    throw new MainnetRefusedError(`cluster "${cluster}" is not devnet`);
  }
}

/** Throws if an RPC endpoint points at mainnet. */
export function assertDevnetEndpoint(endpoint: string): void {
  if (/mainnet/i.test(endpoint)) {
    throw new MainnetRefusedError(`RPC endpoint "${endpoint}" targets mainnet`);
  }
}

export interface LendingConfig {
  readonly cluster: Cluster;
  readonly rpcEndpoint: string;
  readonly rusdMint: string;
  readonly rusdDecimals: number;
  readonly rusdSymbol: string;
  readonly loanServicingProgramId: string;
  readonly rusdLoanServicingProgramId: string;
  readonly lenderWallet: string;
}

export interface LendingConfigOverrides {
  cluster?: string;
  rpcEndpoint?: string;
}

/**
 * Builds the frozen lending config. Defaults are the devnet values above.
 * The RPC endpoint may be overridden (e.g. a devnet provider URL) but the
 * cluster can never change away from devnet and mainnet endpoints throw.
 */
export function createLendingConfig(
  overrides: LendingConfigOverrides = {},
): LendingConfig {
  const cluster = overrides.cluster ?? CLUSTER;
  assertDevnet(cluster);
  const rpcEndpoint = overrides.rpcEndpoint ?? DEVNET_RPC_ENDPOINT;
  assertDevnetEndpoint(rpcEndpoint);
  return Object.freeze({
    cluster,
    rpcEndpoint,
    rusdMint: RUSD_MINT,
    rusdDecimals: RUSD_DECIMALS,
    rusdSymbol: RUSD_SYMBOL,
    loanServicingProgramId: LOAN_SERVICING_PROGRAM_ID,
    rusdLoanServicingProgramId: RUSD_LOAN_SERVICING_PROGRAM_ID,
    lenderWallet: LENDER_WALLET,
  });
}

/**
 * The app-wide config. Reads the optional Vite env override
 * `VITE_SOLANA_RPC_URL`; a mainnet URL there throws (see assertDevnetEndpoint),
 * so a misconfigured deployment fails loudly instead of touching mainnet.
 */
export function getLendingConfig(): LendingConfig {
  const env = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env;
  const rpcOverride = env?.VITE_SOLANA_RPC_URL;
  return createLendingConfig(
    rpcOverride ? { rpcEndpoint: rpcOverride } : {},
  );
}
