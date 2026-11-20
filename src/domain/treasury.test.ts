import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyLoanDrawdown,
  applyLoanRepayment,
  applyWalletFxConversion,
  calculatePortfolioSummary,
  calculateTotalLiquidityUsd,
  convertCurrency,
  evaluateAutoDrawdownTrigger,
  evaluateCardTransaction,
  evaluateCreditUnderwriting,
  generateAmortizationSchedule,
  reconcileFxTransaction,
  validateLeadCapture,
  validateOnboardingStage,
  type AutoDrawdownRule,
  type CardPolicy,
  type CorporateCard,
  type FxTransaction,
  type LoanFacility,
  type OnboardingConfig,
  type PortfolioHolding,
  type UnderwritingSignals,
  type WalletAccount,
} from './treasury';

const sampleWallets: WalletAccount[] = [
  {
    id: 'w-usd',
    currency: 'USD',
    label: 'Primary Operating USD',
    ibanOrAccount: '•••• 4812',
    balance: 1000000,
    yieldApr: 4.85,
  },
  {
    id: 'w-eur',
    currency: 'EUR',
    label: 'EMEA Settlement EUR',
    ibanOrAccount: 'DE89 •••• 3104',
    balance: 100000,
    yieldApr: 3.1,
  },
];

const sampleFacilities: LoanFacility[] = [
  {
    id: 'loan-1',
    name: 'Revolving Credit Line',
    type: 'Revolving Credit',
    creditLimit: 500000,
    principalBalance: 100000,
    aprPct: 7.5,
    termMonths: 24,
    nextPaymentDate: '2026-12-01',
    nextPaymentAmount: 4500,
    status: 'Active',
  },
];

const samplePolicy: CardPolicy = {
  perTransactionLimitUsd: 5000,
  dailyLimitUsd: 10000,
  monthlyLimitUsd: 25000,
  maxTransactionsPerDay: 5,
  maxTransactionsPerWeek: 20,
  allowedMccCodes: ['5734', '7372', '4511'],
  requireReceiptAboveUsd: 250,
};

const sampleCard: CorporateCard = {
  id: 'card-1',
  holderName: 'Elena Vance',
  department: 'Engineering',
  last4: '8821',
  kind: 'Virtual',
  status: 'Active',
  monthlyLimitUsd: 20000,
  spentThisMonthUsd: 12000,
  dailyTxCount: 2,
  allowedMccCodes: ['5734', '7372'],
  expiry: '08/29',
};

test('convertCurrency & calculateTotalLiquidityUsd accurately compute multi-currency USD totals', () => {
  const eurToUsd = convertCurrency(1000, 'EUR', 'USD');
  assert.equal(eurToUsd, 1084.2);

  const totalUsd = calculateTotalLiquidityUsd(sampleWallets);
  assert.equal(totalUsd, 1108420);
});

test('applyWalletFxConversion debits source wallet and credits destination wallet', () => {
  const res = applyWalletFxConversion(sampleWallets, 'USD', 'EUR', 10842);
  assert.equal(res.ok, true);
  if (res.ok) {
    const usd = res.wallets.find((w) => w.currency === 'USD');
    const eur = res.wallets.find((w) => w.currency === 'EUR');
    assert.equal(usd?.balance, 989158);
    assert.equal(eur?.balance, 110000);
    assert.equal(res.creditedAmount, 10000);
  }
});

test('applyWalletFxConversion rejects overdrafts and identical currency', () => {
  const overdraft = applyWalletFxConversion(sampleWallets, 'USD', 'EUR', 5000000);
  assert.equal(overdraft.ok, false);
  const same = applyWalletFxConversion(sampleWallets, 'USD', 'USD', 100);
  assert.equal(same.ok, false);
});

test('applyLoanDrawdown and applyLoanRepayment maintain principal and USD wallet invariants', () => {
  const drawdown = applyLoanDrawdown(sampleFacilities, sampleWallets, 'loan-1', 50000);
  assert.equal(drawdown.ok, true);
  if (drawdown.ok) {
    assert.equal(drawdown.facilities[0].principalBalance, 150000);
    assert.equal(drawdown.wallets[0].balance, 1050000);

    const repay = applyLoanRepayment(drawdown.facilities, drawdown.wallets, 'loan-1', 25000);
    assert.equal(repay.ok, true);
    if (repay.ok) {
      assert.equal(repay.facilities[0].principalBalance, 125000);
      assert.equal(repay.wallets[0].balance, 1025000);
    }
  }

  const excessiveDrawdown = applyLoanDrawdown(sampleFacilities, sampleWallets, 'loan-1', 450000);
  assert.equal(excessiveDrawdown.ok, false);
});

test('generateAmortizationSchedule zeroes out remaining balance at final term month', () => {
  const schedule = generateAmortizationSchedule(120000, 6, 12);
  assert.equal(schedule.length, 12);
  assert.equal(schedule[11].remainingBalance, 0);
  assert.ok(schedule[0].interestPaid > schedule[11].interestPaid);
});

test('evaluateCardTransaction enforces frozen status, MCC allowlist, per-tx cap, and monthly cap', () => {
  const okTx = evaluateCardTransaction(sampleCard, samplePolicy, 1500, '5734');
  assert.equal(okTx.approved, true);

  const badMcc = evaluateCardTransaction(sampleCard, samplePolicy, 200, '7995');
  assert.equal(badMcc.approved, false);
  assert.match(badMcc.reason, /MCC 7995/);

  const overPerTx = evaluateCardTransaction(sampleCard, samplePolicy, 6000, '5734');
  assert.equal(overPerTx.approved, false);

  const overMonthly = evaluateCardTransaction(
    { ...sampleCard, spentThisMonthUsd: 18500 },
    samplePolicy,
    2500,
    '5734',
  );
  assert.equal(overMonthly.approved, false);

  const frozen = evaluateCardTransaction({ ...sampleCard, status: 'Frozen' }, samplePolicy, 50, '5734');
  assert.equal(frozen.approved, false);
});

test('calculatePortfolioSummary computes weighted APY and total allocation', () => {
  const holdings: PortfolioHolding[] = [
    { id: '1', instrument: 'T-Bill', category: 'T-Bills', allocationUsd: 1000000, apyPct: 5.0, maturityLabel: '3M' },
    { id: '2', instrument: 'MMF', category: 'Money Market', allocationUsd: 1000000, apyPct: 4.0, maturityLabel: 'Daily' },
  ];
  const summary = calculatePortfolioSummary(holdings);
  assert.equal(summary.totalUsd, 2000000);
  assert.equal(summary.weightedApyPct, 4.5);
});

test('reconcileFxTransaction updates status to Matched and zeroes FX variance', () => {
  const txs: FxTransaction[] = [
    {
      id: 'fx-1',
      timestamp: '2026-11-16',
      merchant: 'Hetzner Cloud GmbH',
      department: 'Infrastructure',
      originalCurrency: 'EUR',
      originalAmount: 4200,
      lockedRateToUsd: 1.0842,
      usdEquivalent: 4553.64,
      fxFeeUsd: 12.5,
      fxVarianceUsd: 18.4,
      erpAccountCode: '6120',
      reconciliationStatus: 'Pending Review',
    },
  ];
  const updated = reconcileFxTransaction(txs, 'fx-1');
  assert.equal(updated[0].reconciliationStatus, 'Matched');
  assert.equal(updated[0].fxVarianceUsd, 0);
});

test('validateLeadCapture and validateOnboardingStage reject invalid inputs', () => {
  const badLead = validateLeadCapture({ workEmail: 'bad-email', companyName: 'A', monthlyVolume: '' });
  assert.equal(badLead.valid, false);
  assert.ok(badLead.errors.workEmail);
  assert.ok(badLead.errors.companyName);
  assert.ok(badLead.errors.monthlyVolume);

  const goodLead = validateLeadCapture({
    workEmail: 'cfo@meridianlabs.io',
    companyName: 'Meridian Labs Inc.',
    monthlyVolume: '$500K - $2M',
  });
  assert.equal(goodLead.valid, true);

  const config: OnboardingConfig = {
    entityName: 'Meridian Labs Inc.',
    ein: '84-2910482',
    baseCurrency: 'USD',
    mfaPolicy: 'Hardware Key + TOTP',
    fraudSensitivity: 'Strict',
    linkedBanks: [
      {
        id: 'b1',
        institution: 'Silicon Valley Commercial',
        accountName: 'Operating Checking',
        mask: '4812',
        type: 'Checking',
        balanceUsd: 1450000,
        connected: false,
        lastSynced: 'Never',
      },
    ],
    cardPolicy: samplePolicy,
    erpConfig: {
      provider: 'NetSuite',
      environment: 'Production',
      syncCadence: 'Real-Time Webhook',
      costCenterTagging: true,
      autoReconcileFxUnderUsd: 25,
      lastSyncAt: '2026-11-17 05:20 UTC',
      mappings: [],
    },
  };

  assert.equal(validateOnboardingStage(1, config).valid, true);
  assert.equal(validateOnboardingStage(2, config).valid, false);
  config.linkedBanks[0].connected = true;
  assert.equal(validateOnboardingStage(2, config).valid, true);
});

test('evaluateCreditUnderwriting approves strong bank + ERP profile and flags excessive request', () => {
  const strongSignals: UnderwritingSignals = {
    linkedBankBalanceUsd: 4492500,
    connectedBankCount: 2,
    monthlyInflowsUsd: 1510000,
    monthlyOpexUsd: 812000,
    existingDebtServiceMonthlyUsd: 62000,
    erpProvider: 'NetSuite',
    erpMatchedRatioPct: 92,
    arDaysOutstanding: 28,
  };

  const approved = evaluateCreditUnderwriting(strongSignals, 750000, 24, 'Term Growth Loan');
  assert.equal(approved.decision, 'Instant Approval');
  assert.equal(approved.riskTier, 'Prime (Tier A)');
  assert.ok(approved.aprPct > 5 && approved.aprPct < 10);
  assert.ok(approved.monthlyPaymentUsd > 30000);
  assert.ok(approved.dscr >= 1.2);

  const oversized = evaluateCreditUnderwriting(strongSignals, 10000000, 24, 'Term Growth Loan');
  assert.equal(oversized.decision, 'Amount Exceeds Capacity');
});

test('evaluateAutoDrawdownTrigger triggers only when enabled and below cash floor', () => {
  const rule: AutoDrawdownRule = {
    enabled: true,
    facilityId: 'fac-rev-01',
    minCashFloorUsd: 500000,
    replenishAmountUsd: 150000,
    lastTriggeredAt: null,
  };

  const above = evaluateAutoDrawdownTrigger(rule, 800000, 500000);
  assert.equal(above.shouldTrigger, false);

  const below = evaluateAutoDrawdownTrigger(rule, 420000, 500000);
  assert.equal(below.shouldTrigger, true);
  assert.equal(below.drawAmountUsd, 150000);

  const capped = evaluateAutoDrawdownTrigger(rule, 420000, 90000);
  assert.equal(capped.shouldTrigger, true);
  assert.equal(capped.drawAmountUsd, 90000);

  const disabled = evaluateAutoDrawdownTrigger({ ...rule, enabled: false }, 420000, 500000);
  assert.equal(disabled.shouldTrigger, false);
});

import {
  createAuditActivityEntry,
  filterAuditActivities,
  formatAuditActivitiesCsv,
  summarizeAuditActivities,
  type AuditActivityItem,
} from './treasury';

test('createAuditActivityEntry, filterAuditActivities, summarizeAuditActivities, and formatAuditActivitiesCsv work accurately', () => {
  const items: AuditActivityItem[] = [
    createAuditActivityEntry(
      {
        category: 'credit_drawdown',
        title: 'Revolving Credit Drawdown',
        actor: 'Clara Lindqvist',
        counterpartyOrTarget: 'Ravfina Revolving Working Capital',
        amountUsd: 150000,
        status: 'Settled',
        channel: 'Manual Drawdown',
        metadata: { facilityId: 'fac-rev-01', destination: 'Operating USD' },
        timestamp: '2026-11-17 06:10:00 UTC',
      },
      101,
    ),
    createAuditActivityEntry(
      {
        category: 'erp_sync',
        title: 'NetSuite General Ledger Sync',
        actor: 'Ravfina ERP Bridge',
        counterpartyOrTarget: 'NetSuite Production',
        amountUsd: null,
        status: 'Synced',
        channel: 'Real-Time Webhook',
        metadata: { entriesPosted: '14', glAccount: '6120' },
        timestamp: '2026-11-17 05:55:00 UTC',
      },
      102,
    ),
    createAuditActivityEntry(
      {
        category: 'card_transaction',
        title: 'AWS Cloud Compute Charge',
        actor: 'Marcus Chen (•••• 4409)',
        counterpartyOrTarget: 'Amazon Web Services · MCC 7372',
        amountUsd: 4280.5,
        status: 'Approved',
        channel: 'Virtual Card',
        metadata: { mcc: '7372', cardLast4: '4409' },
        timestamp: '2026-11-17 05:40:00 UTC',
      },
      103,
    ),
    createAuditActivityEntry(
      {
        category: 'card_transaction',
        title: 'Blocked Restricted Merchant',
        actor: 'Devon Brooks (•••• 3371)',
        counterpartyOrTarget: 'Unverified Exchange · MCC 7995',
        amountUsd: 3840,
        status: 'Declined',
        channel: 'Virtual Card',
        metadata: { mcc: '7995', reason: 'MCC not on allowlist' },
        timestamp: '2026-11-17 05:25:00 UTC',
      },
      104,
    ),
  ];

  assert.equal(items[0].auditRef, 'AUD-2026-0101');
  assert.equal(filterAuditActivities(items, { category: 'all', query: '' }).length, 4);
  assert.equal(filterAuditActivities(items, { category: 'erp_sync', query: '' }).length, 1);
  assert.equal(filterAuditActivities(items, { category: 'all', query: '7995' }).length, 1);
  assert.equal(filterAuditActivities(items, { category: 'card_transaction', query: 'Marcus' }).length, 1);

  const summary = summarizeAuditActivities(items);
  assert.equal(summary.totalCount, 4);
  assert.equal(summary.creditDrawdownCount, 1);
  assert.equal(summary.creditDrawdownTotalUsd, 150000);
  assert.equal(summary.erpSyncCount, 1);
  assert.equal(summary.cardTxCount, 2);
  assert.equal(summary.cardTxApprovedUsd, 4280.5);
  assert.equal(summary.declinedCount, 1);

  const csv = formatAuditActivitiesCsv(items);
  const lines = csv.split('\n');
  assert.equal(lines.length, 5);
  assert.match(lines[0], /^Audit Ref,Timestamp,Category/);
  assert.match(lines[1], /AUD-2026-0101/);
  assert.match(lines[3], /4280\.50/);
});

import {
  buildCashFlowTrendModel,
  formatAxisCurrency,
} from './treasury';

test('formatAxisCurrency switches cleanly between short and long formats', () => {
  assert.equal(formatAxisCurrency(1500000, 'short'), '$1.5M');
  assert.equal(formatAxisCurrency(750000, 'short'), '$750K');
  assert.equal(formatAxisCurrency(10000, 'short'), '$10K');
  assert.equal(formatAxisCurrency(10000, 'long'), '$10,000');
  assert.equal(formatAxisCurrency(750000, 'long'), '$750,000');
});

test('buildCashFlowTrendModel normalizes 6-month vs 30-day windows and reacts to drawdown adjustments', () => {
  const baseInput = {
    cashflow: [
      { month: 'Sep', inflowsUsd: 1290000, opexUsd: 742000, treasuryYieldUsd: 17900 },
      { month: 'Oct', inflowsUsd: 1365000, opexUsd: 795000, treasuryYieldUsd: 19120 },
      { month: 'Nov', inflowsUsd: 1510000, opexUsd: 812000, treasuryYieldUsd: 21450 },
    ],
    wallets: sampleWallets,
    linkedBanks: [
      {
        id: 'b1',
        institution: 'Silicon Valley Commercial',
        accountName: 'Operating Checking',
        mask: '4812',
        type: 'Checking' as const,
        balanceUsd: 1842500,
        connected: true,
        lastSynced: '2 mins ago',
      },
    ],
    facilities: sampleFacilities,
    autoDrawdownRule: {
      enabled: true,
      facilityId: 'loan-1',
      minCashFloorUsd: 750000,
      replenishAmountUsd: 200000,
      lastTriggeredAt: null,
    },
  };

  const sixMonth = buildCashFlowTrendModel({ ...baseInput, horizonMonths: 6, scheduleAdjustmentUsd: 0 });
  assert.equal(sixMonth.points.length, 6);
  assert.ok(sixMonth.points.some((p) => p.status === 'surplus'));
  assert.ok(sixMonth.points.some((p) => p.status === 'burn'));
  assert.equal(sixMonth.summary.plaidLiquidityUsd, 1842500);
  assert.ok(sixMonth.summary.quickInsight.length > 20);

  const thirtyDay = buildCashFlowTrendModel({ ...baseInput, horizonMonths: 1, scheduleAdjustmentUsd: 0 });
  assert.equal(thirtyDay.points.length, 5);
  assert.equal(thirtyDay.points[0].monthShort, 'Nov 17');

  const stressed = buildCashFlowTrendModel({
    ...baseInput,
    horizonMonths: 6,
    scheduleAdjustmentUsd: -1600000,
  });
  assert.equal(stressed.summary.fallsBelowFloor, true);
  assert.ok(stressed.summary.belowFloorPeriod !== null);
});

import { buildSocialShareUrls, filterCfoTestimonials, type CfoTestimonial } from './treasury';

test('buildSocialShareUrls encodes URL, title, and summary for LinkedIn, X, and email', () => {
  const share = buildSocialShareUrls({
    url: 'https://ravfina.example.com/cfo-proof',
    title: 'Ravfina CFO Benchmark',
    summary: '4 days to 5.5 hrs NetSuite close',
  });

  assert.match(share.linkedIn, /^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?url=https%3A%2F%2Fravfina\.example\.com%2Fcfo-proof$/);
  assert.match(share.xTwitter, /^https:\/\/twitter\.com\/intent\/tweet\?text=/);
  assert.match(share.xTwitter, /Ravfina%20CFO%20Benchmark/);
  assert.match(share.email, /^mailto:\?subject=Ravfina%20CFO%20Benchmark&body=/);
});

test('filterCfoTestimonials filters accurately by vertical segment', () => {
  const sample: CfoTestimonial[] = [
    {
      id: '1',
      cfoName: 'Elena Rostova',
      initials: 'ER',
      role: 'CFO',
      company: 'Vanguard Robotics',
      industry: 'Hardware & Robotics',
      stageAndScale: 'Series B',
      avatarSrc: '/a.jpg',
      quote: 'Quote 1',
      beforeState: 'Before 1',
      afterOutcome: 'After 1',
      headlineMetric: '+$184K',
      headlineMetricLabel: 'Yield',
      proofMetrics: [],
    },
    {
      id: '2',
      cfoName: 'David Mercer',
      initials: 'DM',
      role: 'CFO',
      company: 'Northstar Cloud',
      industry: 'Enterprise SaaS',
      stageAndScale: 'Series C',
      avatarSrc: '/b.jpg',
      quote: 'Quote 2',
      beforeState: 'Before 2',
      afterOutcome: 'After 2',
      headlineMetric: '72 sec',
      headlineMetricLabel: 'Approval',
      proofMetrics: [],
    },
  ];

  assert.equal(filterCfoTestimonials(sample, 'All').length, 2);
  const saasOnly = filterCfoTestimonials(sample, 'Enterprise SaaS');
  assert.equal(saasOnly.length, 1);
  assert.equal(saasOnly[0].cfoName, 'David Mercer');
});

