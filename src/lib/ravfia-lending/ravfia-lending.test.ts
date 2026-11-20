import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLUSTER,
  DEVNET_RPC_ENDPOINT,
  LENDER_WALLET,
  LOAN_SERVICING_PROGRAM_ID,
  RAVFIA_COIN_NAME,
  RAVFIA_COIN_SYMBOL,
  RUSD_DECIMALS,
  RUSD_LOAN_SERVICING_PROGRAM_ID,
  RUSD_MINT,
  TOKEN_IMAGE_URI,
  TOKEN_METADATA_URI,
  MainnetRefusedError,
  assertDevnet,
  assertDevnetEndpoint,
  createLendingConfig,
} from './config';
import {
  bpsOf,
  formatTokenAmount,
  parseTokenAmount,
  sumUnits,
} from './money';
import { getLendingStatus, planDisbursement } from './client';
import {
  explorerUrl,
  mapFacilitiesToLendingSummary,
  mapFacilityToLendingSummary,
} from './mapping';
import type { LoanFacility } from '../../domain/treasury';

const sampleFacility: LoanFacility = {
  id: 'loan-1',
  name: 'Revolving Credit Line',
  type: 'Revolving Credit',
  creditLimit: 500000,
  principalBalance: 100000.5,
  aprPct: 7.5,
  termMonths: 24,
  nextPaymentDate: '2026-12-01',
  nextPaymentAmount: 4500,
  status: 'Active',
};

// A syntactically valid base58 token-account-shaped string (the RUSD mint).
const BORROWER_TOKEN_ACCOUNT = RUSD_MINT;

test('config pins the exact devnet constants from solana-lending', () => {
  const config = createLendingConfig();
  assert.equal(config.cluster, 'devnet');
  assert.equal(CLUSTER, 'devnet');
  assert.equal(config.rpcEndpoint, DEVNET_RPC_ENDPOINT);
  assert.equal(config.rpcEndpoint, 'https://api.devnet.solana.com');
  assert.equal(config.rusdMint, 'RavjJ8xMrGpZbfs6XzRf8V5fg2LXjMwL3YT6aTWqoeV');
  assert.equal(config.rusdDecimals, 6);
  assert.equal(config.rusdSymbol, 'RUSD');
  assert.equal(
    config.rusdLoanServicingProgramId,
    'AsksuXLhQ2fJKV3VkGzEnQiAqkxa1PCnoMSZkTwnjdpZ',
  );
  assert.equal(
    config.loanServicingProgramId,
    'AZwMFQFgkNw87Q3tTxpdkBH1ozU5xCAKyiZgnY4fUBbc',
  );
  assert.equal(
    config.lenderWallet,
    '2ZQg42CPRKFqdUQeQRueHwYEpFJS76mq2yWHVpGEkJFc',
  );
  assert.equal(LENDER_WALLET, config.lenderWallet);
  assert.equal(LOAN_SERVICING_PROGRAM_ID, config.loanServicingProgramId);
  assert.equal(RUSD_LOAN_SERVICING_PROGRAM_ID, config.rusdLoanServicingProgramId);
});

test('devnet guard rejects mainnet clusters and endpoints', () => {
  assert.throws(() => assertDevnet('mainnet-beta'), MainnetRefusedError);
  assert.throws(() => assertDevnet('mainnet'), MainnetRefusedError);
  assert.throws(() => assertDevnet('localnet'), MainnetRefusedError);
  assert.throws(
    () => assertDevnetEndpoint('https://api.mainnet-beta.solana.com'),
    MainnetRefusedError,
  );
  assert.throws(
    () => createLendingConfig({ cluster: 'mainnet-beta' }),
    MainnetRefusedError,
  );
  assert.throws(
    () =>
      createLendingConfig({
        rpcEndpoint: 'https://api.mainnet-beta.solana.com',
      }),
    MainnetRefusedError,
  );
  // Devnet values pass.
  assertDevnet('devnet');
  assertDevnetEndpoint(DEVNET_RPC_ENDPOINT);
  const custom = createLendingConfig({
    rpcEndpoint: 'https://devnet.example-provider.com',
  });
  assert.equal(custom.cluster, 'devnet');
});

test('money parse/format round-trips exactly', () => {
  assert.equal(parseTokenAmount('100'), 100_000_000n);
  assert.equal(parseTokenAmount('100.5'), 100_500_000n);
  assert.equal(parseTokenAmount('0.000001'), 1n);
  assert.equal(parseTokenAmount('0'), 0n);
  assert.equal(formatTokenAmount(100_500_000n), '100.5');
  assert.equal(formatTokenAmount(1n), '0.000001');
  assert.equal(formatTokenAmount(0n), '0');
  for (const s of ['1', '12.34', '1000000', '0.5', '999999.999999']) {
    assert.equal(formatTokenAmount(parseTokenAmount(s)), s);
  }
  assert.throws(() => parseTokenAmount('1.0000001'));
  assert.throws(() => parseTokenAmount('-5'));
  assert.throws(() => parseTokenAmount('1,000'));
  assert.throws(() => parseTokenAmount('1e3'));
  assert.throws(() => formatTokenAmount(-1n));
});

test('money sumUnits and bpsOf use floor bigint math', () => {
  assert.equal(sumUnits([1n, 2n, 3n]), 6n);
  assert.equal(sumUnits([]), 0n);
  assert.throws(() => sumUnits([1n, -1n]));
  assert.equal(bpsOf(1_000_000n, 250), 25_000n);
  assert.equal(bpsOf(3n, 3333), 0n);
  assert.throws(() => bpsOf(1n, 10_001));
});

test('planDisbursement validates inputs and returns the operator steps', () => {
  const plan = planDisbursement({
    borrowerTokenAccount: BORROWER_TOKEN_ACCOUNT,
    amount: '250.25',
  });
  assert.equal(plan.amountUnits, '250250000');
  assert.equal(plan.amount, '250.25');
  assert.equal(plan.borrowerTokenAccount, BORROWER_TOKEN_ACCOUNT);
  assert.deepEqual(plan.steps, [
    "Confirm the loan is approved and recorded in Ravfia's off-chain systems",
    'Create or confirm the loan record via loan_servicing create_loan',
    'Refresh the blockhash, sign with the lender key outside this package, submit on devnet',
    "Reconcile the settlement against Ravfia's ledger from the transaction signature",
  ]);

  assert.throws(() =>
    planDisbursement({ borrowerTokenAccount: 'not an address', amount: '10' }),
  );
  assert.throws(() =>
    planDisbursement({
      borrowerTokenAccount: '0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl',
      amount: '10',
    }),
  );
  assert.throws(() =>
    planDisbursement({ borrowerTokenAccount: BORROWER_TOKEN_ACCOUNT, amount: '0' }),
  );
  assert.throws(() =>
    planDisbursement({
      borrowerTokenAccount: BORROWER_TOKEN_ACCOUNT,
      amount: '10.0000001',
    }),
  );
});

test('facility mapping converts USD amounts to RUSD units', () => {
  const summary = mapFacilityToLendingSummary(sampleFacility);
  assert.equal(summary.principalUnits, '100000500000');
  assert.equal(summary.principal, '100000.5');
  assert.equal(summary.creditLimitUnits, '500000000000');
  assert.equal(summary.creditLimit, '500000');
  assert.equal(summary.lender, 'Ravfia');
  assert.equal(summary.symbol, 'RUSD');
  assert.equal(
    summary.explorer.rusdMint,
    `https://explorer.solana.com/address/${RUSD_MINT}?cluster=devnet`,
  );
  assert.equal(
    explorerUrl(LENDER_WALLET),
    `https://explorer.solana.com/address/${LENDER_WALLET}?cluster=devnet`,
  );

  const portfolio = mapFacilitiesToLendingSummary([sampleFacility, sampleFacility]);
  assert.equal(portfolio.facilityCount, 2);
  assert.equal(portfolio.totalPrincipalUnits, '200001000000');
  assert.equal(portfolio.totalPrincipal, '200001');
  assert.equal(portfolio.totalCreditLimit, '1000000');
});

test('getLendingStatus parses real devnet RPC response shapes', async () => {
  // Every Solana JSON-RPC method used here returns { context, value }.
  // Regression: getBalance was once treated as a bare number, so
  // BigInt(result) threw "Cannot convert [object Object] to a BigInt"
  // and the panel showed "Devnet status unavailable".
  const resultsByMethod: Record<string, unknown> = {
    getTokenSupply: {
      context: { slot: 1 },
      value: {
        amount: '1000000000000',
        decimals: 6,
        uiAmount: 1000000,
        uiAmountString: '1000000',
      },
    },
    getBalance: { context: { slot: 1 }, value: 11400000000 },
    getTokenAccountsByOwner: {
      context: { slot: 1 },
      value: [{ pubkey: RUSD_MINT, account: {} }],
    },
    getTokenAccountBalance: {
      context: { slot: 1 },
      value: {
        amount: '250000000000',
        decimals: 6,
        uiAmount: 250000,
        uiAmountString: '250000',
      },
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: unknown, init?: { body?: unknown }) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { method: string };
    const result = resultsByMethod[body.method];
    assert.ok(result !== undefined, `unexpected RPC method ${body.method}`);
    return {
      ok: true,
      status: 200,
      json: async () => ({ jsonrpc: '2.0', id: 1, result }),
    } as Response;
  }) as typeof fetch;
  try {
    const status = await getLendingStatus(createLendingConfig());
    assert.equal(status.rusdSupplyUnits, '1000000000000');
    assert.equal(status.rusdSupply, '1000000');
    assert.equal(status.lenderSolLamports, '11400000000');
    assert.equal(status.lenderSol, '11.4');
    assert.equal(status.lenderRusdAccountCount, 1);
    assert.equal(status.lenderRusdUnits, '250000000000');
    assert.equal(status.lenderRusd, '250000');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('presentation rename: Ravfia Coin (RVCN) constants, RUSD details unchanged', () => {
  assert.equal(RAVFIA_COIN_NAME, 'Ravfia Coin');
  assert.equal(RAVFIA_COIN_SYMBOL, 'RVCN');
  assert.equal(
    TOKEN_METADATA_URI,
    'https://raw.githubusercontent.com/kurtmorales-tech/ravfia-token/main/metadata.json',
  );
  assert.equal(
    TOKEN_IMAGE_URI,
    'https://raw.githubusercontent.com/kurtmorales-tech/ravfia-token/main/ravfia-coin.png',
  );
  // The rename is presentation only: the mint and decimals stay as issued.
  assert.equal(RUSD_MINT, 'RavjJ8xMrGpZbfs6XzRf8V5fg2LXjMwL3YT6aTWqoeV');
  assert.equal(RUSD_DECIMALS, 6);
});
