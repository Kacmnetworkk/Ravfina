export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'JPY';

export const FX_RATES_TO_USD: Record<CurrencyCode, number> = {
  USD: 1.0,
  EUR: 1.0842,
  GBP: 1.2715,
  CAD: 0.7285,
  JPY: 0.00662,
};

export interface WalletAccount {
  id: string;
  currency: CurrencyCode;
  label: string;
  ibanOrAccount: string;
  balance: number;
  yieldApr: number;
}

export interface PortfolioHolding {
  id: string;
  instrument: string;
  category: 'T-Bills' | 'Money Market' | 'Sovereign Debt' | 'Cash Reserve';
  allocationUsd: number;
  apyPct: number;
  maturityLabel: string;
}

export interface MonthlyCashflowPoint {
  month: string;
  inflowsUsd: number;
  opexUsd: number;
  treasuryYieldUsd: number;
}

export interface LoanFacility {
  id: string;
  name: string;
  type: 'Revolving Credit' | 'Term Growth Loan' | 'Equipment Financing';
  creditLimit: number;
  principalBalance: number;
  aprPct: number;
  termMonths: number;
  nextPaymentDate: string;
  nextPaymentAmount: number;
  status: 'Active' | 'Pending Review';
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

export interface MccCategory {
  code: string;
  label: string;
  group: string;
}

export interface CardPolicy {
  perTransactionLimitUsd: number;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  maxTransactionsPerDay: number;
  maxTransactionsPerWeek: number;
  allowedMccCodes: string[];
  requireReceiptAboveUsd: number;
}

export interface CorporateCard {
  id: string;
  holderName: string;
  department: string;
  last4: string;
  kind: 'Physical' | 'Virtual';
  status: 'Active' | 'Frozen';
  monthlyLimitUsd: number;
  spentThisMonthUsd: number;
  dailyTxCount: number;
  allowedMccCodes: string[];
  expiry: string;
}

export interface FxTransaction {
  id: string;
  timestamp: string;
  merchant: string;
  department: string;
  originalCurrency: CurrencyCode;
  originalAmount: number;
  lockedRateToUsd: number;
  usdEquivalent: number;
  fxFeeUsd: number;
  fxVarianceUsd: number;
  erpAccountCode: string;
  reconciliationStatus: 'Matched' | 'Pending Review' | 'Variance Flagged';
}

export interface FraudAlert {
  id: string;
  timestamp: string;
  severity: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  amountUsd: number;
  relatedCardId?: string;
  location: string;
  status: 'Open' | 'Approved' | 'Blocked';
}

export interface LinkedBankAccount {
  id: string;
  institution: string;
  accountName: string;
  mask: string;
  type: 'Checking' | 'Treasury Sweep' | 'Savings';
  balanceUsd: number;
  connected: boolean;
  lastSynced: string;
}

export type ErpProvider = 'NetSuite' | 'SAP S/4HANA' | 'QuickBooks Online';

export interface ErpMappingRule {
  id: string;
  treasuryCategory: string;
  glCode: string;
  glAccountName: string;
  autoSync: boolean;
}

export interface ErpConfig {
  provider: ErpProvider;
  environment: 'Production' | 'Sandbox';
  syncCadence: 'Real-Time Webhook' | 'Hourly Batch' | 'Daily Close';
  costCenterTagging: boolean;
  autoReconcileFxUnderUsd: number;
  lastSyncAt: string;
  mappings: ErpMappingRule[];
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string;
  status: 'Active' | 'Revoked';
}

export interface WebhookLog {
  id: string;
  event: string;
  endpoint: string;
  httpStatus: number;
  latencyMs: number;
  timestamp: string;
}

export interface MfaSettings {
  enforceHardwareKey: boolean;
  totpEnabled: boolean;
  sessionTimeoutMinutes: number;
  wireDualApprovalAboveUsd: number;
  hardwareKeys: { id: string; label: string; addedAt: string; lastVerified: string }[];
}

export interface OnboardingConfig {
  entityName: string;
  ein: string;
  baseCurrency: CurrencyCode;
  mfaPolicy: 'Hardware Key + TOTP' | 'TOTP Authenticator';
  fraudSensitivity: 'Strict' | 'Balanced' | 'Custom';
  linkedBanks: LinkedBankAccount[];
  cardPolicy: CardPolicy;
  erpConfig: ErpConfig;
}

export function formatCurrency(amount: number, currency: CurrencyCode = 'USD'): string {
  const decimals = currency === 'JPY' ? 0 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<CurrencyCode, number> = FX_RATES_TO_USD,
): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Conversion amount must be a non-negative finite number.');
  }
  if (from === to) return amount;
  const usdAmount = amount * rates[from];
  const converted = usdAmount / rates[to];
  return to === 'JPY' ? Math.round(converted) : Math.round(converted * 100) / 100;
}

export function calculateTotalLiquidityUsd(
  wallets: WalletAccount[],
  rates: Record<CurrencyCode, number> = FX_RATES_TO_USD,
): number {
  const total = wallets.reduce((sum, wallet) => {
    return sum + wallet.balance * rates[wallet.currency];
  }, 0);
  return Math.round(total * 100) / 100;
}

export function calculatePortfolioSummary(holdings: PortfolioHolding[]): {
  totalUsd: number;
  weightedApyPct: number;
} {
  const totalUsd = holdings.reduce((sum, item) => sum + item.allocationUsd, 0);
  if (totalUsd === 0) {
    return { totalUsd: 0, weightedApyPct: 0 };
  }
  const weightedSum = holdings.reduce(
    (sum, item) => sum + item.allocationUsd * item.apyPct,
    0,
  );
  return {
    totalUsd: Math.round(totalUsd * 100) / 100,
    weightedApyPct: Math.round((weightedSum / totalUsd) * 100) / 100,
  };
}

export function applyWalletFxConversion(
  wallets: WalletAccount[],
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  sourceAmount: number,
  rates: Record<CurrencyCode, number> = FX_RATES_TO_USD,
): { ok: true; wallets: WalletAccount[]; creditedAmount: number } | { ok: false; error: string } {
  if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) {
    return { ok: false, error: 'Enter a transfer amount greater than zero.' };
  }
  if (fromCurrency === toCurrency) {
    return { ok: false, error: 'Source and destination currencies must differ.' };
  }
  const sourceWallet = wallets.find((w) => w.currency === fromCurrency);
  const destWallet = wallets.find((w) => w.currency === toCurrency);
  if (!sourceWallet || !destWallet) {
    return { ok: false, error: 'Selected currency wallet was not found.' };
  }
  if (sourceAmount > sourceWallet.balance) {
    return {
      ok: false,
      error: `Insufficient ${fromCurrency} balance (${formatCurrency(sourceWallet.balance, fromCurrency)} available).`,
    };
  }

  const creditedAmount = convertCurrency(sourceAmount, fromCurrency, toCurrency, rates);
  const nextWallets = wallets.map((w) => {
    if (w.currency === fromCurrency) {
      return { ...w, balance: Math.round((w.balance - sourceAmount) * 100) / 100 };
    }
    if (w.currency === toCurrency) {
      return { ...w, balance: Math.round((w.balance + creditedAmount) * 100) / 100 };
    }
    return w;
  });

  return { ok: true, wallets: nextWallets, creditedAmount };
}

export function applyLoanDrawdown(
  facilities: LoanFacility[],
  wallets: WalletAccount[],
  facilityId: string,
  amountUsd: number,
): { ok: true; facilities: LoanFacility[]; wallets: WalletAccount[] } | { ok: false; error: string } {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { ok: false, error: 'Drawdown amount must be greater than $0.' };
  }
  const target = facilities.find((f) => f.id === facilityId);
  if (!target) {
    return { ok: false, error: 'Credit facility not found.' };
  }
  const availableCredit = target.creditLimit - target.principalBalance;
  if (amountUsd > availableCredit) {
    return {
      ok: false,
      error: `Drawdown exceeds available credit (${formatCurrency(availableCredit)} remaining).`,
    };
  }

  const nextFacilities = facilities.map((f) =>
    f.id === facilityId
      ? { ...f, principalBalance: Math.round((f.principalBalance + amountUsd) * 100) / 100 }
      : f,
  );
  const nextWallets = wallets.map((w) =>
    w.currency === 'USD'
      ? { ...w, balance: Math.round((w.balance + amountUsd) * 100) / 100 }
      : w,
  );
  return { ok: true, facilities: nextFacilities, wallets: nextWallets };
}

export function applyLoanRepayment(
  facilities: LoanFacility[],
  wallets: WalletAccount[],
  facilityId: string,
  amountUsd: number,
): { ok: true; facilities: LoanFacility[]; wallets: WalletAccount[] } | { ok: false; error: string } {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { ok: false, error: 'Repayment amount must be greater than $0.' };
  }
  const target = facilities.find((f) => f.id === facilityId);
  if (!target) {
    return { ok: false, error: 'Credit facility not found.' };
  }
  if (amountUsd > target.principalBalance) {
    return {
      ok: false,
      error: `Repayment exceeds outstanding principal (${formatCurrency(target.principalBalance)}).`,
    };
  }
  const usdWallet = wallets.find((w) => w.currency === 'USD');
  if (!usdWallet || amountUsd > usdWallet.balance) {
    return {
      ok: false,
      error: 'Insufficient USD operating wallet balance for repayment.',
    };
  }

  const nextFacilities = facilities.map((f) =>
    f.id === facilityId
      ? { ...f, principalBalance: Math.round((f.principalBalance - amountUsd) * 100) / 100 }
      : f,
  );
  const nextWallets = wallets.map((w) =>
    w.currency === 'USD'
      ? { ...w, balance: Math.round((w.balance - amountUsd) * 100) / 100 }
      : w,
  );
  return { ok: true, facilities: nextFacilities, wallets: nextWallets };
}

export function generateAmortizationSchedule(
  principal: number,
  annualRatePct: number,
  termMonths: number,
): AmortizationRow[] {
  if (principal <= 0 || termMonths <= 0) return [];
  const monthlyRate = annualRatePct / 100 / 12;
  const rows: AmortizationRow[] = [];
  const fixedPayment =
    monthlyRate === 0
      ? principal / termMonths
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));

  let remaining = principal;
  for (let month = 1; month <= termMonths; month++) {
    const interest = remaining * monthlyRate;
    const principalPaid = Math.min(remaining, fixedPayment - interest);
    remaining = Math.max(0, remaining - principalPaid);
    rows.push({
      month,
      payment: Math.round((principalPaid + interest) * 100) / 100,
      principalPaid: Math.round(principalPaid * 100) / 100,
      interestPaid: Math.round(interest * 100) / 100,
      remainingBalance: Math.round(remaining * 100) / 100,
    });
  }
  return rows;
}

export function evaluateCardTransaction(
  card: CorporateCard,
  policy: CardPolicy,
  amountUsd: number,
  mccCode: string,
): { approved: boolean; reason: string } {
  if (card.status === 'Frozen') {
    return { approved: false, reason: 'Declined: Card is currently frozen.' };
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { approved: false, reason: 'Declined: Transaction amount must be positive.' };
  }
  const normalizedMcc = mccCode.trim();
  const effectiveAllowlist =
    card.allowedMccCodes.length > 0 ? card.allowedMccCodes : policy.allowedMccCodes;
  if (!effectiveAllowlist.includes(normalizedMcc)) {
    return {
      approved: false,
      reason: `Declined: MCC ${normalizedMcc} is not on the approved allowlist.`,
    };
  }
  if (amountUsd > policy.perTransactionLimitUsd) {
    return {
      approved: false,
      reason: `Declined: Exceeds per-transaction limit of ${formatCurrency(policy.perTransactionLimitUsd)}.`,
    };
  }
  if (card.dailyTxCount + 1 > policy.maxTransactionsPerDay) {
    return {
      approved: false,
      reason: `Declined: Exceeds daily velocity cap (${policy.maxTransactionsPerDay} txns/day).`,
    };
  }
  const effectiveMonthlyLimit = Math.min(card.monthlyLimitUsd, policy.monthlyLimitUsd);
  if (card.spentThisMonthUsd + amountUsd > effectiveMonthlyLimit) {
    return {
      approved: false,
      reason: `Declined: Exceeds monthly card cap of ${formatCurrency(effectiveMonthlyLimit)}.`,
    };
  }
  return {
    approved: true,
    reason:
      amountUsd > policy.requireReceiptAboveUsd
        ? 'Approved: Receipt attachment required within 24h.'
        : 'Approved: Within all policy and MCC guardrails.',
  };
}

export function reconcileFxTransaction(
  transactions: FxTransaction[],
  txId: string,
): FxTransaction[] {
  return transactions.map((tx) =>
    tx.id === txId
      ? {
          ...tx,
          reconciliationStatus: 'Matched',
          fxVarianceUsd: 0,
        }
      : tx,
  );
}

export function validateLeadCapture(input: {
  workEmail: string;
  companyName: string;
  monthlyVolume: string;
}): { valid: boolean; errors: Partial<Record<'workEmail' | 'companyName' | 'monthlyVolume', string>> } {
  const errors: Partial<Record<'workEmail' | 'companyName' | 'monthlyVolume', string>> = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!input.workEmail.trim() || !emailRegex.test(input.workEmail.trim())) {
    errors.workEmail = 'Enter a valid corporate email address.';
  }
  if (input.companyName.trim().length < 2) {
    errors.companyName = 'Enter your legal or operating company name.';
  }
  if (!input.monthlyVolume.trim()) {
    errors.monthlyVolume = 'Select an estimated monthly treasury volume.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateOnboardingStage(
  stage: number,
  config: OnboardingConfig,
): { valid: boolean; message?: string } {
  if (stage === 1) {
    if (config.entityName.trim().length < 2) {
      return { valid: false, message: 'Legal Entity Name must be at least 2 characters.' };
    }
    if (!/^\d{2}-\d{7}$/.test(config.ein.trim())) {
      return { valid: false, message: 'Enter a valid US EIN in XX-XXXXXXX format.' };
    }
    return { valid: true };
  }
  if (stage === 2) {
    const connectedCount = config.linkedBanks.filter((b) => b.connected).length;
    if (connectedCount === 0) {
      return {
        valid: false,
        message: 'Connect at least one corporate bank account via Plaid to verify liquidity.',
      };
    }
    return { valid: true };
  }
  if (stage === 3) {
    const p = config.cardPolicy;
    if (p.perTransactionLimitUsd <= 0 || p.dailyLimitUsd < p.perTransactionLimitUsd) {
      return {
        valid: false,
        message: 'Daily limit must be greater than or equal to the per-transaction limit.',
      };
    }
    if (p.monthlyLimitUsd < p.dailyLimitUsd) {
      return {
        valid: false,
        message: 'Monthly spending cap must be greater than or equal to the daily limit.',
      };
    }
    if (p.allowedMccCodes.length === 0) {
      return {
        valid: false,
        message: 'Select at least one Merchant Category Code (MCC) on the allowlist.',
      };
    }
    return { valid: true };
  }
  if (stage === 4) {
    if (!config.erpConfig.provider) {
      return { valid: false, message: 'Select an ERP platform to configure.' };
    }
    return { valid: true };
  }
  return { valid: true };
}

export interface UnderwritingSignals {
  linkedBankBalanceUsd: number;
  connectedBankCount: number;
  monthlyInflowsUsd: number;
  monthlyOpexUsd: number;
  existingDebtServiceMonthlyUsd: number;
  erpProvider: ErpProvider;
  erpMatchedRatioPct: number;
  arDaysOutstanding: number;
}

export interface UnderwritingCheck {
  label: string;
  value: string;
  passed: boolean;
}

export interface UnderwritingEvaluation {
  riskScore: number;
  riskTier: 'Prime (Tier A)' | 'Standard (Tier B)' | 'Elevated (Tier C)';
  decision: 'Instant Approval' | 'Conditional Review' | 'Amount Exceeds Capacity';
  maxApprovedLimitUsd: number;
  aprPct: number;
  monthlyPaymentUsd: number;
  totalInterestUsd: number;
  dscr: number;
  runwayMonths: number;
  checks: UnderwritingCheck[];
}

export interface AutoDrawdownRule {
  enabled: boolean;
  facilityId: string;
  minCashFloorUsd: number;
  replenishAmountUsd: number;
  lastTriggeredAt: string | null;
}

export function evaluateCreditUnderwriting(
  signals: UnderwritingSignals,
  requestedAmountUsd: number,
  termMonths: number,
  facilityType: LoanFacility['type'],
): UnderwritingEvaluation {
  const safeRequested = Math.max(10000, requestedAmountUsd);
  const safeMonths = Math.max(6, Math.min(60, termMonths));

  const netMonthlyCashflow = signals.monthlyInflowsUsd - signals.monthlyOpexUsd;
  const runwayMonths =
    signals.monthlyOpexUsd > 0
      ? Math.round((signals.linkedBankBalanceUsd / signals.monthlyOpexUsd) * 10) / 10
      : 24;

  // Base risk score out of 100 driven by bank + ERP fundamentals
  let score = 50;
  if (signals.connectedBankCount >= 2) score += 10;
  else if (signals.connectedBankCount === 1) score += 5;

  if (netMonthlyCashflow > 0) score += 16;
  else if (runwayMonths >= 12) score += 8;

  if (signals.erpMatchedRatioPct >= 80) score += 10;
  else if (signals.erpMatchedRatioPct >= 50) score += 6;

  if (signals.arDaysOutstanding <= 35) score += 8;
  else if (signals.arDaysOutstanding <= 50) score += 4;

  if (runwayMonths >= 6) score += 6;

  const riskScore = Math.max(35, Math.min(98, Math.round(score)));

  const riskTier: UnderwritingEvaluation['riskTier'] =
    riskScore >= 82
      ? 'Prime (Tier A)'
      : riskScore >= 68
        ? 'Standard (Tier B)'
        : 'Elevated (Tier C)';

  const baseApr =
    riskTier === 'Prime (Tier A)' ? 6.95 : riskTier === 'Standard (Tier B)' ? 8.65 : 11.2;
  const typeAdj =
    facilityType === 'Equipment Financing'
      ? -0.45
      : facilityType === 'Revolving Credit'
        ? 0.25
        : 0;
  const termAdj = safeMonths > 24 ? 0.55 : safeMonths <= 12 ? -0.3 : 0;
  const aprPct = Math.round((baseApr + typeAdj + termAdj) * 100) / 100;

  // Max capacity combines cash liquidity multiplier + annualized inflow capacity
  const liquidityCapacity = signals.linkedBankBalanceUsd * 0.45;
  const inflowCapacity = Math.max(0, signals.monthlyInflowsUsd * 1.45);
  const tierMultiplier =
    riskTier === 'Prime (Tier A)' ? 1.1 : riskTier === 'Standard (Tier B)' ? 0.9 : 0.65;
  const maxApprovedLimitUsd = Math.round(((liquidityCapacity + inflowCapacity) * tierMultiplier) / 10000) * 10000;

  const monthlyRate = aprPct / 100 / 12;
  const monthlyPaymentUsd =
    monthlyRate === 0
      ? Math.round((safeRequested / safeMonths) * 100) / 100
      : Math.round(
          ((safeRequested * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -safeMonths))) * 100,
        ) / 100;

  const totalInterestUsd = Math.max(
    0,
    Math.round((monthlyPaymentUsd * safeMonths - safeRequested) * 100) / 100,
  );

  const operatingSurplusBeforeDebt = Math.max(
    signals.monthlyInflowsUsd * 0.28,
    netMonthlyCashflow + signals.existingDebtServiceMonthlyUsd,
  );
  const totalMonthlyDebtService = signals.existingDebtServiceMonthlyUsd + monthlyPaymentUsd;
  const dscr =
    totalMonthlyDebtService > 0
      ? Math.round((operatingSurplusBeforeDebt / totalMonthlyDebtService) * 100) / 100
      : 3.0;

  let decision: UnderwritingEvaluation['decision'] = 'Instant Approval';
  if (safeRequested > maxApprovedLimitUsd) {
    decision = 'Amount Exceeds Capacity';
  } else if (dscr < 1.2 || signals.connectedBankCount === 0) {
    decision = 'Conditional Review';
  }

  const checks: UnderwritingCheck[] = [
    {
      label: 'Plaid Bank Liquidity Coverage',
      value: `${formatCurrency(signals.linkedBankBalanceUsd)} across ${signals.connectedBankCount} bank(s)`,
      passed: signals.connectedBankCount >= 1 && signals.linkedBankBalanceUsd >= 250000,
    },
    {
      label: 'Debt Service Coverage Ratio (DSCR)',
      value: `${dscr.toFixed(2)}x (min 1.20x)`,
      passed: dscr >= 1.2,
    },
    {
      label: `${signals.erpProvider} Ledger Reconciliation`,
      value: `${signals.erpMatchedRatioPct}% matched · ${signals.arDaysOutstanding}d DSO`,
      passed: signals.erpMatchedRatioPct >= 50,
    },
    {
      label: 'Requested Facility vs. Cap',
      value: `${formatCurrency(safeRequested)} / ${formatCurrency(maxApprovedLimitUsd)}`,
      passed: safeRequested <= maxApprovedLimitUsd,
    },
  ];

  return {
    riskScore,
    riskTier,
    decision,
    maxApprovedLimitUsd,
    aprPct,
    monthlyPaymentUsd,
    totalInterestUsd,
    dscr,
    runwayMonths,
    checks,
  };
}

export function evaluateAutoDrawdownTrigger(
  rule: AutoDrawdownRule,
  currentUsdBalance: number,
  availableFacilityCreditUsd: number,
): { shouldTrigger: boolean; drawAmountUsd: number; reason: string } {
  if (!rule.enabled) {
    return {
      shouldTrigger: false,
      drawAmountUsd: 0,
      reason: 'Automatic working-capital drawdown rule is paused.',
    };
  }
  if (currentUsdBalance >= rule.minCashFloorUsd) {
    return {
      shouldTrigger: false,
      drawAmountUsd: 0,
      reason: `USD operating balance (${formatCurrency(currentUsdBalance)}) is above ${formatCurrency(rule.minCashFloorUsd)} floor.`,
    };
  }
  if (availableFacilityCreditUsd <= 0) {
    return {
      shouldTrigger: false,
      drawAmountUsd: 0,
      reason: 'No undrawn facility credit available for auto-replenishment.',
    };
  }
  const drawAmountUsd = Math.min(rule.replenishAmountUsd, availableFacilityCreditUsd);
  return {
    shouldTrigger: true,
    drawAmountUsd,
    reason: `Balance fell below ${formatCurrency(rule.minCashFloorUsd)} floor; drawing ${formatCurrency(drawAmountUsd)} automatically.`,
  };
}

export type AuditCategory = 'credit_drawdown' | 'erp_sync' | 'card_transaction';

export type AuditStatus =
  | 'Settled'
  | 'Synced'
  | 'Approved'
  | 'Declined'
  | 'Auto-Triggered';

export interface AuditActivityItem {
  id: string;
  auditRef: string;
  timestamp: string;
  category: AuditCategory;
  title: string;
  actor: string;
  counterpartyOrTarget: string;
  amountUsd: number | null;
  status: AuditStatus;
  channel: string;
  metadata: Record<string, string>;
}

export function formatUtcTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

export function createAuditActivityEntry(
  input: Omit<AuditActivityItem, 'id' | 'auditRef' | 'timestamp'> & {
    id?: string;
    auditRef?: string;
    timestamp?: string;
  },
  sequenceNum?: number,
): AuditActivityItem {
  const now = new Date();
  const suffix =
    sequenceNum !== undefined
      ? String(sequenceNum).padStart(4, '0')
      : String(Math.floor(1000 + (now.getTime() % 9000)));
  return {
    id: input.id ?? `act-${now.getTime()}-${suffix}`,
    auditRef: input.auditRef ?? `AUD-2026-${suffix}`,
    timestamp: input.timestamp ?? formatUtcTimestamp(now),
    category: input.category,
    title: input.title,
    actor: input.actor,
    counterpartyOrTarget: input.counterpartyOrTarget,
    amountUsd: input.amountUsd,
    status: input.status,
    channel: input.channel,
    metadata: input.metadata,
  };
}

export function filterAuditActivities(
  items: AuditActivityItem[],
  filter: {
    category: 'all' | AuditCategory;
    query: string;
    status?: 'all' | AuditStatus;
  },
): AuditActivityItem[] {
  const normalizedQuery = filter.query.trim().toLowerCase();
  return items.filter((item) => {
    if (filter.category !== 'all' && item.category !== filter.category) {
      return false;
    }
    if (filter.status && filter.status !== 'all' && item.status !== filter.status) {
      return false;
    }
    if (!normalizedQuery) return true;
    const metaValues = Object.values(item.metadata).join(' ').toLowerCase();
    return (
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.actor.toLowerCase().includes(normalizedQuery) ||
      item.counterpartyOrTarget.toLowerCase().includes(normalizedQuery) ||
      item.auditRef.toLowerCase().includes(normalizedQuery) ||
      item.channel.toLowerCase().includes(normalizedQuery) ||
      item.status.toLowerCase().includes(normalizedQuery) ||
      metaValues.includes(normalizedQuery)
    );
  });
}

export function summarizeAuditActivities(items: AuditActivityItem[]): {
  totalCount: number;
  creditDrawdownCount: number;
  creditDrawdownTotalUsd: number;
  erpSyncCount: number;
  cardTxCount: number;
  cardTxApprovedUsd: number;
  declinedCount: number;
} {
  let creditDrawdownCount = 0;
  let creditDrawdownTotalUsd = 0;
  let erpSyncCount = 0;
  let cardTxCount = 0;
  let cardTxApprovedUsd = 0;
  let declinedCount = 0;

  for (const item of items) {
    if (item.category === 'credit_drawdown') {
      creditDrawdownCount += 1;
      creditDrawdownTotalUsd += item.amountUsd ?? 0;
    } else if (item.category === 'erp_sync') {
      erpSyncCount += 1;
    } else if (item.category === 'card_transaction') {
      cardTxCount += 1;
      if (item.status === 'Approved') {
        cardTxApprovedUsd += item.amountUsd ?? 0;
      }
    }
    if (item.status === 'Declined') {
      declinedCount += 1;
    }
  }

  return {
    totalCount: items.length,
    creditDrawdownCount,
    creditDrawdownTotalUsd: Math.round(creditDrawdownTotalUsd * 100) / 100,
    erpSyncCount,
    cardTxCount,
    cardTxApprovedUsd: Math.round(cardTxApprovedUsd * 100) / 100,
    declinedCount,
  };
}

function escapeCsvCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  return /[",\n]/.test(safe) ? `"${safe}"` : safe;
}

export function formatAuditActivitiesCsv(items: AuditActivityItem[]): string {
  const header = [
    'Audit Ref',
    'Timestamp',
    'Category',
    'Event',
    'Actor',
    'Target',
    'Amount USD',
    'Status',
    'Channel',
  ].join(',');

  const rows = items.map((item) =>
    [
      item.auditRef,
      item.timestamp,
      item.category,
      item.title,
      item.actor,
      item.counterpartyOrTarget,
      item.amountUsd !== null ? item.amountUsd.toFixed(2) : '',
      item.status,
      item.channel,
    ]
      .map(escapeCsvCell)
      .join(','),
  );

  return [header, ...rows].join('\n');
}

export interface CashFlowTrendPoint {
  id: string;
  dateIso: string;
  monthShort: string;
  monthLong: string;
  isProjected: boolean;
  actualCashUsd: number | null;
  projectedCashUsd: number;
  netCashFlowUsd: number;
  inflowsUsd: number;
  opexUsd: number;
  creditDrawdownUsd: number;
  debtServiceUsd: number;
  safetyFloorUsd: number;
  status: 'surplus' | 'burn';
  humanSummary: string;
}

export interface CashFlowTrendSummary {
  quickInsight: string;
  burnRateLabel: string;
  runwayLabel: string;
  floorStatusLabel: string;
  monthlyNetFlowUsd: number;
  runwayMonths: number | null;
  minProjectedCashUsd: number;
  fallsBelowFloor: boolean;
  belowFloorPeriod: string | null;
  plaidLiquidityUsd: number;
  safetyFloorUsd: number;
}

export function formatAxisCurrency(value: number, mode: 'short' | 'long'): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (mode === 'short') {
    if (abs >= 1_000_000) {
      const m = abs / 1_000_000;
      return `${sign}$${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}$${Math.round(abs / 1_000)}K`;
    }
    return `${sign}$${Math.round(abs)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactDelta(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `$${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `$${Math.round(abs / 1_000)}k`;
  }
  return `$${Math.round(abs)}`;
}

export interface BuildCashFlowTrendInput {
  cashflow: MonthlyCashflowPoint[];
  wallets: WalletAccount[];
  linkedBanks: LinkedBankAccount[];
  facilities: LoanFacility[];
  autoDrawdownRule: AutoDrawdownRule;
  horizonMonths: number; // 1 = Next 30 Days, 2..6 = rolling 2..6 month window
  scheduleAdjustmentUsd?: number; // interactive drawdown (+)/payment (-) scenario delta
}

export function buildCashFlowTrendModel(input: BuildCashFlowTrendInput): {
  points: CashFlowTrendPoint[];
  summary: CashFlowTrendSummary;
} {
  const usdWallet = input.wallets.find((w) => w.currency === 'USD');
  const currentUsdCash = usdWallet?.balance ?? 2_482_500;
  const plaidLiquidityUsd = input.linkedBanks
    .filter((b) => b.connected)
    .reduce((sum, b) => sum + b.balanceUsd, 0);

  const safetyFloorUsd = Math.max(0, input.autoDrawdownRule.minCashFloorUsd);
  const monthlyDebtService = input.facilities.reduce(
    (sum, f) => sum + f.nextPaymentAmount,
    0,
  );
  const scheduleDelta = input.scheduleAdjustmentUsd ?? 0;

  // Baseline Sep/Oct/Nov from ERP cashflow ledger
  const sepPoint = input.cashflow.find((m) => m.month === 'Sep') ?? {
    month: 'Sep',
    inflowsUsd: 1_290_000,
    opexUsd: 742_000,
    treasuryYieldUsd: 17_900,
  };
  const octPoint = input.cashflow.find((m) => m.month === 'Oct') ?? {
    month: 'Oct',
    inflowsUsd: 1_365_000,
    opexUsd: 795_000,
    treasuryYieldUsd: 19_120,
  };
  const novPoint = input.cashflow.find((m) => m.month === 'Nov') ?? {
    month: 'Nov',
    inflowsUsd: 1_510_000,
    opexUsd: 812_000,
    treasuryYieldUsd: 21_450,
  };

  const sepNet = sepPoint.inflowsUsd - sepPoint.opexUsd - monthlyDebtService;
  const octNet = octPoint.inflowsUsd - octPoint.opexUsd - monthlyDebtService;
  const novNet = novPoint.inflowsUsd - novPoint.opexUsd - monthlyDebtService;

  const novActualCash = currentUsdCash;
  const octActualCash = Math.max(0, novActualCash - novNet);
  const sepActualCash = Math.max(0, octActualCash - octNet);

  // Rolling 6-month trajectory (Sep actual -> Feb projected)
  const decInflows = Math.round(novPoint.inflowsUsd * 0.94);
  const decOpex = Math.round(novPoint.opexUsd * 1.48); // Year-end vendor & tax commitments
  const decDraw = 0;
  const decNet = decInflows - decOpex - monthlyDebtService + decDraw + scheduleDelta * 0.5;
  const decProjectedCash = Math.max(0, Math.round(novActualCash + decNet));

  // Jan seasonal Q1 inventory + enterprise renewals create a realistic burn period unless offset
  const janInflows = Math.round(novPoint.inflowsUsd * 0.72);
  const janOpex = Math.round(novPoint.opexUsd * 1.62);
  const janPreAutoCash = Math.round(
    decProjectedCash + janInflows - janOpex - monthlyDebtService + scheduleDelta * 0.5,
  );
  const janAutoDraw =
    input.autoDrawdownRule.enabled && janPreAutoCash < safetyFloorUsd
      ? input.autoDrawdownRule.replenishAmountUsd
      : 0;
  const janNet = janInflows - janOpex - monthlyDebtService + janAutoDraw + scheduleDelta * 0.5;
  const janProjectedCash = Math.max(0, janPreAutoCash + janAutoDraw);

  // Feb rebound as receivables clear
  const febInflows = Math.round(novPoint.inflowsUsd * 1.06);
  const febOpex = Math.round(novPoint.opexUsd * 1.05);
  const febNet = febInflows - febOpex - monthlyDebtService;
  const febProjectedCash = Math.max(0, Math.round(janProjectedCash + febNet));

  const sixMonthPoints: CashFlowTrendPoint[] = [
    {
      id: 'cf-sep',
      dateIso: '2026-09-01',
      monthShort: 'Sep',
      monthLong: 'September',
      isProjected: false,
      actualCashUsd: Math.round(sepActualCash),
      projectedCashUsd: Math.round(sepActualCash * 0.98),
      netCashFlowUsd: Math.round(sepNet),
      inflowsUsd: sepPoint.inflowsUsd,
      opexUsd: sepPoint.opexUsd,
      creditDrawdownUsd: 0,
      debtServiceUsd: monthlyDebtService,
      safetyFloorUsd,
      status: sepNet >= 0 ? 'surplus' : 'burn',
      humanSummary:
        sepNet >= 0
          ? `Actual surplus of ${formatCompactDelta(sepNet)} in September`
          : `Actual net burn of ${formatCompactDelta(sepNet)} in September`,
    },
    {
      id: 'cf-oct',
      dateIso: '2026-10-01',
      monthShort: 'Oct',
      monthLong: 'October',
      isProjected: false,
      actualCashUsd: Math.round(octActualCash),
      projectedCashUsd: Math.round(octActualCash * 0.97),
      netCashFlowUsd: Math.round(octNet),
      inflowsUsd: octPoint.inflowsUsd,
      opexUsd: octPoint.opexUsd,
      creditDrawdownUsd: 0,
      debtServiceUsd: monthlyDebtService,
      safetyFloorUsd,
      status: octNet >= 0 ? 'surplus' : 'burn',
      humanSummary:
        octNet >= 0
          ? `Actual surplus of ${formatCompactDelta(octNet)} in October`
          : `Actual net burn of ${formatCompactDelta(octNet)} in October`,
    },
    {
      id: 'cf-nov',
      dateIso: '2026-11-01',
      monthShort: 'Nov',
      monthLong: 'November',
      isProjected: false,
      actualCashUsd: Math.round(novActualCash),
      projectedCashUsd: Math.round(novActualCash + scheduleDelta * 0.15),
      netCashFlowUsd: Math.round(novNet),
      inflowsUsd: novPoint.inflowsUsd,
      opexUsd: novPoint.opexUsd,
      creditDrawdownUsd: 195000,
      debtServiceUsd: monthlyDebtService,
      safetyFloorUsd,
      status: novNet >= 0 ? 'surplus' : 'burn',
      humanSummary:
        novNet >= 0
          ? `Actual surplus of ${formatCompactDelta(novNet)} in November`
          : `Actual net burn of ${formatCompactDelta(novNet)} in November`,
    },
    {
      id: 'cf-dec',
      dateIso: '2026-12-01',
      monthShort: 'Dec',
      monthLong: 'December',
      isProjected: true,
      actualCashUsd: null,
      projectedCashUsd: decProjectedCash,
      netCashFlowUsd: Math.round(decNet),
      inflowsUsd: decInflows,
      opexUsd: decOpex,
      creditDrawdownUsd: Math.max(0, Math.round(scheduleDelta * 0.5)),
      debtServiceUsd: monthlyDebtService,
      safetyFloorUsd,
      status: decNet >= 0 ? 'surplus' : 'burn',
      humanSummary:
        decNet >= 0
          ? `Expected surplus of ${formatCompactDelta(decNet)} in December`
          : `Expected burn of ${formatCompactDelta(decNet)} in December`,
    },
    {
      id: 'cf-jan',
      dateIso: '2027-01-01',
      monthShort: 'Jan',
      monthLong: 'January',
      isProjected: true,
      actualCashUsd: null,
      projectedCashUsd: janProjectedCash,
      netCashFlowUsd: Math.round(janNet),
      inflowsUsd: janInflows,
      opexUsd: janOpex,
      creditDrawdownUsd: janAutoDraw + Math.max(0, Math.round(scheduleDelta * 0.5)),
      debtServiceUsd: monthlyDebtService,
      safetyFloorUsd,
      status: janNet >= 0 ? 'surplus' : 'burn',
      humanSummary:
        janNet >= 0
          ? `Expected surplus of ${formatCompactDelta(janNet)} in January`
          : `Expected burn of ${formatCompactDelta(janNet)} in January`,
    },
    {
      id: 'cf-feb',
      dateIso: '2027-02-01',
      monthShort: 'Feb',
      monthLong: 'February',
      isProjected: true,
      actualCashUsd: null,
      projectedCashUsd: febProjectedCash,
      netCashFlowUsd: Math.round(febNet),
      inflowsUsd: febInflows,
      opexUsd: febOpex,
      creditDrawdownUsd: 0,
      debtServiceUsd: monthlyDebtService,
      safetyFloorUsd,
      status: febNet >= 0 ? 'surplus' : 'burn',
      humanSummary:
        febNet >= 0
          ? `Expected surplus of ${formatCompactDelta(febNet)} in February`
          : `Expected burn of ${formatCompactDelta(febNet)} in February`,
    },
  ];

  // When horizonMonths === 1, zoom into the Next 30 Days weekly checkpoints (Nov 17 -> Dec 15)
  let visiblePoints: CashFlowTrendPoint[];
  if (input.horizonMonths <= 1) {
    const weeklyLabels = [
      { id: 'w-1', dateIso: '2026-11-17', short: 'Nov 17', long: 'Nov 17 (Today)', projected: false },
      { id: 'w-2', dateIso: '2026-11-24', short: 'Nov 24', long: 'Nov 24', projected: true },
      { id: 'w-3', dateIso: '2026-12-01', short: 'Dec 01', long: 'Dec 01 (Loan Due)', projected: true },
      { id: 'w-4', dateIso: '2026-12-08', short: 'Dec 08', long: 'Dec 08 (Payroll)', projected: true },
      { id: 'w-5', dateIso: '2026-12-15', short: 'Dec 15', long: 'Dec 15 (30d Out)', projected: true },
    ];
    const weeklyNetDeltas = [
      Math.round(novNet / 4),
      Math.round((novPoint.inflowsUsd * 0.24 - novPoint.opexUsd * 0.22)),
      Math.round((decInflows * 0.2 - decOpex * 0.28 - monthlyDebtService * 0.55) + scheduleDelta * 0.4),
      Math.round((decInflows * 0.21 - decOpex * 0.34 - monthlyDebtService * 0.45) + scheduleDelta * 0.35),
      Math.round((decInflows * 0.28 - decOpex * 0.21) + scheduleDelta * 0.25),
    ];

    let runningCash = novActualCash;
    visiblePoints = weeklyLabels.map((w, idx) => {
      const delta = weeklyNetDeltas[idx];
      if (idx > 0) {
        runningCash = Math.max(0, runningCash + delta);
      }
      return {
        id: w.id,
        dateIso: w.dateIso,
        monthShort: w.short,
        monthLong: w.long,
        isProjected: w.projected,
        actualCashUsd: idx === 0 ? Math.round(novActualCash) : null,
        projectedCashUsd: Math.round(runningCash),
        netCashFlowUsd: delta,
        inflowsUsd: Math.round(decInflows * 0.24),
        opexUsd: Math.round(decOpex * 0.25),
        creditDrawdownUsd: idx === 2 && scheduleDelta > 0 ? Math.round(scheduleDelta) : 0,
        debtServiceUsd: idx === 2 || idx === 3 ? Math.round(monthlyDebtService * 0.5) : 0,
        safetyFloorUsd,
        status: delta >= 0 ? 'surplus' : 'burn',
        humanSummary:
          delta >= 0
            ? `Expected weekly surplus of ${formatCompactDelta(delta)} by ${w.short}`
            : `Expected weekly burn of ${formatCompactDelta(delta)} by ${w.short}`,
      };
    });
  } else {
    const clampedCount = Math.max(2, Math.min(6, input.horizonMonths));
    visiblePoints = sixMonthPoints.slice(sixMonthPoints.length - clampedCount);
  }

  const avgNetFlow = Math.round(
    visiblePoints.reduce((sum, p) => sum + p.netCashFlowUsd, 0) / (visiblePoints.length || 1),
  );
  const minProjectedCashUsd = Math.min(...visiblePoints.map((p) => p.projectedCashUsd));
  const belowPoint = visiblePoints.find((p) => p.projectedCashUsd < safetyFloorUsd) ?? null;
  const fallsBelowFloor = belowPoint !== null;

  const burnRateLabel =
    avgNetFlow >= 0
      ? `Net surplus of ${formatAxisCurrency(avgNetFlow, 'long')} per month on average`
      : `Net burn of ${formatAxisCurrency(Math.abs(avgNetFlow), 'long')} per month on average`;

  const runwayMonths =
    avgNetFlow < 0
      ? Math.max(0.5, Math.round((currentUsdCash / Math.abs(avgNetFlow)) * 10) / 10)
      : null;

  const runwayLabel =
    runwayMonths === null
      ? 'Self-sustaining cash flow (positive net trajectory)'
      : `${runwayMonths} months of operating cash runway at current burn`;

  const floorStatusLabel = fallsBelowFloor
    ? `Dips below ${formatAxisCurrency(safetyFloorUsd, 'short')} safety floor in ${belowPoint.monthLong}`
    : `Remains above your ${formatAxisCurrency(safetyFloorUsd, 'short')} safety floor`;

  const decPointRef = sixMonthPoints.find((p) => p.id === 'cf-dec');
  const q4Positive = (decPointRef?.netCashFlowUsd ?? 0) >= 0 && !fallsBelowFloor;

  let quickInsight: string;
  if (fallsBelowFloor && belowPoint) {
    quickInsight = `Projected liquidity dips below your ${formatAxisCurrency(safetyFloorUsd, 'long')} safety floor in ${belowPoint.monthLong}—consider scheduling a credit drawdown.`;
  } else if (q4Positive) {
    quickInsight = `Cash flow is projected to remain positive through Q4, staying comfortably above your ${formatAxisCurrency(safetyFloorUsd, 'long')} liquidity safety floor.`;
  } else {
    quickInsight = `Seasonal Q1 expenses create a temporary burn window, but operating reserves stay safely above your ${formatAxisCurrency(safetyFloorUsd, 'long')} safety floor.`;
  }

  return {
    points: visiblePoints,
    summary: {
      quickInsight,
      burnRateLabel,
      runwayLabel,
      floorStatusLabel,
      monthlyNetFlowUsd: avgNetFlow,
      runwayMonths,
      minProjectedCashUsd,
      fallsBelowFloor,
      belowFloorPeriod: belowPoint?.monthLong ?? null,
      plaidLiquidityUsd,
      safetyFloorUsd,
    },
  };
}

export type TestimonialIndustry =
  | 'All'
  | 'Hardware & Robotics'
  | 'Enterprise SaaS'
  | 'Cross-Border Biotech';

export interface CfoProofMetric {
  label: string;
  value: string;
  context: string;
}

export interface CfoTestimonial {
  id: string;
  cfoName: string;
  initials: string;
  role: string;
  company: string;
  industry: Exclude<TestimonialIndustry, 'All'>;
  stageAndScale: string;
  avatarSrc: string;
  quote: string;
  beforeState: string;
  afterOutcome: string;
  headlineMetric: string;
  headlineMetricLabel: string;
  proofMetrics: CfoProofMetric[];
}

export interface SocialShareUrls {
  linkedIn: string;
  xTwitter: string;
  email: string;
  canonicalUrl: string;
}

export function buildSocialShareUrls(params: {
  url: string;
  title: string;
  summary: string;
}): SocialShareUrls {
  const safeUrl = params.url.trim() || 'https://ravfina.com';
  const encodedUrl = encodeURIComponent(safeUrl);
  const encodedTitle = encodeURIComponent(params.title.trim());
  const encodedText = encodeURIComponent(`${params.title.trim()} — ${params.summary.trim()}`);

  return {
    linkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    xTwitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(
      `${params.summary.trim()}\n\n${safeUrl}`,
    )}`,
    canonicalUrl: safeUrl,
  };
}

export function filterCfoTestimonials(
  testimonials: CfoTestimonial[],
  industry: TestimonialIndustry,
): CfoTestimonial[] {
  if (industry === 'All') {
    return testimonials;
  }
  return testimonials.filter((item) => item.industry === industry);
}

