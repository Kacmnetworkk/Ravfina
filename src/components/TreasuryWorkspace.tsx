import {
  Activity,
  ArrowRightLeft,
  CreditCard,
  Database,
  Globe2,
  Landmark,
  Layers,
  LogOut,
  Menu,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType, type FormEvent } from 'react';
import {
  CardChipGovernanceIcon,
  ErpLedgerSyncIcon,
  HardwareShieldKeyIcon,
  RavfinaLogoMark,
  SmartTrendChartIcon,
  TeamOrbitalIcon,
  TreasuryVaultIcon,
  UnderwritingPulseIcon,
} from './icons/RavfinaIcons';
import { PanelStateTransition, SlideOverDrawer } from './MotionPrimitives';
import { PlatformSuiteModal } from './SiteChrome';
import {
  INITIAL_API_KEYS,
  INITIAL_AUDIT_ACTIVITY,
  INITIAL_CARDS,
  INITIAL_FRAUD_ALERTS,
  INITIAL_FX_TRANSACTIONS,
  INITIAL_LOANS,
  INITIAL_MFA_SETTINGS,
  INITIAL_PORTFOLIO_HOLDINGS,
  INITIAL_WALLETS,
  INITIAL_WEBHOOK_LOGS,
  MCC_DIRECTORY,
  MONTHLY_CASHFLOW_SERIES,
} from '../data/seedTreasury';
import {
  applyLoanDrawdown,
  applyLoanRepayment,
  applyWalletFxConversion,
  convertCurrency,
  createAuditActivityEntry,
  evaluateAutoDrawdownTrigger,
  formatCurrency,
  reconcileFxTransaction,
  type ApiKeyRecord,
  type AuditActivityItem,
  type AutoDrawdownRule,
  type CorporateCard,
  type CurrencyCode,
  type FraudAlert,
  type FxTransaction,
  type LoanFacility,
  type MfaSettings,
  type OnboardingConfig,
  type WalletAccount,
  type WebhookLog,
} from '../domain/treasury';
import { useCashFlowData } from '../hooks/useCashFlowData';
import { CashFlowTrendChart } from './CashFlowTrendChart';
import { RecentActivityPanel } from './RecentActivityPanel';
import { ThemeToggleButton } from './ThemeToggleButton';
import { CardsManagementView } from './views/CardsManagementView';
import { ErpApiView } from './views/ErpApiView';
import { FxReconciliationView } from './views/FxReconciliationView';
import { LoansFundingView } from './views/LoansFundingView';
import { SecurityFraudView } from './views/SecurityFraudView';
import { TeamsLedgerView } from './views/TeamsLedgerView';
import { WalletOverviewView } from './views/WalletOverviewView';

export type WorkspaceSection =
  | 'wallet'
  | 'loans'
  | 'cards'
  | 'fx'
  | 'erp'
  | 'security'
  | 'teams';

interface TreasuryWorkspaceProps {
  orgSlug?: string;
  config: OnboardingConfig;
  onReopenWizard: () => void;
  onReturnToLanding: () => void;
}

const NAV_ITEMS: {
  id: WorkspaceSection;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}[] = [
  { id: 'wallet', label: 'Wallet & Portfolio', icon: TreasuryVaultIcon },
  { id: 'loans', label: 'Funding & Underwriting', icon: UnderwritingPulseIcon },
  { id: 'cards', label: 'Corporate Cards', icon: CardChipGovernanceIcon },
  { id: 'fx', label: 'FX Reconciliation', icon: Globe2 },
  { id: 'erp', label: 'ERP & API Access', icon: ErpLedgerSyncIcon },
  { id: 'teams', label: 'Teams & Approvals', icon: TeamOrbitalIcon },
  { id: 'security', label: 'Security & Fraud', icon: HardwareShieldKeyIcon },
];

const HEADER_NAV_LINKS: { id: WorkspaceSection; href: string; label: string }[] = [
  { id: 'wallet', href: '#treasury', label: 'Treasury' },
  { id: 'loans', href: '#capital', label: 'Capital' },
  { id: 'cards', href: '#cards', label: 'Cards' },
  { id: 'fx', href: '#reports', label: 'Reports' },
];

export function TreasuryWorkspace({
  orgSlug = 'vanguard-robotics',
  config,
  onReopenWizard,
  onReturnToLanding,
}: TreasuryWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('wallet');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [suiteOpen, setSuiteOpen] = useState(false);

  const [wallets, setWallets] = useState<WalletAccount[]>(INITIAL_WALLETS);
  const [facilities, setFacilities] = useState<LoanFacility[]>(INITIAL_LOANS);
  const [autoDrawdownRule, setAutoDrawdownRule] = useState<AutoDrawdownRule>({
    enabled: true,
    facilityId: INITIAL_LOANS[0].id,
    minCashFloorUsd: 750000,
    replenishAmountUsd: 200000,
    lastTriggeredAt: null,
  });
  const [cards, setCards] = useState<CorporateCard[]>(INITIAL_CARDS);
  const [fxTransactions, setFxTransactions] =
    useState<FxTransaction[]>(INITIAL_FX_TRANSACTIONS);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>(INITIAL_FRAUD_ALERTS);
  const [erpConfig, setErpConfig] = useState(config.erpConfig);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>(INITIAL_API_KEYS);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>(INITIAL_WEBHOOK_LOGS);
  const [mfa, setMfa] = useState<MfaSettings>(() => ({
    ...INITIAL_MFA_SETTINGS,
    enforceHardwareKey: config.mfaPolicy === 'Hardware Key + TOTP',
  }));
  const [auditActivities, setAuditActivities] =
    useState<AuditActivityItem[]>(INITIAL_AUDIT_ACTIVITY);
  const [liveStreamEnabled, setLiveStreamEnabled] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [trendHorizonMonths, setTrendHorizonMonths] = useState(6);
  const [scheduleAdjustmentUsd, setScheduleAdjustmentUsd] = useState(0);
  const auditSeqRef = useRef(4909);

  // Right Inspector Live FX Rebalance quick desk
  const [inspectorFrom, setInspectorFrom] = useState<CurrencyCode>('USD');
  const [inspectorTo, setInspectorTo] = useState<CurrencyCode>('EUR');
  const [inspectorAmount, setInspectorAmount] = useState('25000');
  const [inspectorFxMsg, setInspectorFxMsg] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const cashFlowTrend = useCashFlowData({
    cashflow: MONTHLY_CASHFLOW_SERIES,
    wallets,
    linkedBanks: config.linkedBanks,
    facilities,
    autoDrawdownRule,
    horizonMonths: trendHorizonMonths,
    scheduleAdjustmentUsd,
  });

  const appendAuditEntry = (
    entry: Omit<AuditActivityItem, 'id' | 'auditRef' | 'timestamp'>,
  ) => {
    const seq = auditSeqRef.current++;
    setAuditActivities((prev) => [createAuditActivityEntry(entry, seq), ...prev]);
  };

  useEffect(() => {
    if (!liveStreamEnabled) return;
    const templates: Array<Omit<AuditActivityItem, 'id' | 'auditRef' | 'timestamp'>> = [
      {
        category: 'erp_sync',
        title: `${erpConfig.provider} Incremental Journal Sync`,
        actor: 'Ravfina ERP Bridge',
        counterpartyOrTarget: `${erpConfig.provider} ${erpConfig.environment} (4 entries)`,
        amountUsd: null,
        status: 'Synced',
        channel: 'Live Stream Webhook',
        metadata: {
          provider: erpConfig.provider,
          glAccounts: '6120, 6250',
          latencyMs: '68ms',
        },
      },
      {
        category: 'card_transaction',
        title: 'SaaS Seat Renewal Authorized',
        actor: 'Marcus Chen (•••• 4409)',
        counterpartyOrTarget: 'Datadog Inc. · MCC 5734',
        amountUsd: 1480.0,
        status: 'Approved',
        channel: 'Virtual Card',
        metadata: {
          mcc: '5734 · Computer Software',
          department: 'Infrastructure',
          policyCheck: 'Within $5,000 tx cap',
        },
      },
      {
        category: 'credit_drawdown',
        title: 'Scheduled Working Capital Sweep',
        actor: 'Treasury Automation',
        counterpartyOrTarget: facilities[0]?.name ?? 'Ravfina Revolving Working Capital',
        amountUsd: 25000.0,
        status: 'Auto-Triggered',
        channel: 'Liquidity Sweep',
        metadata: {
          facilityId: facilities[0]?.id ?? 'fac-rev-01',
          destinationWallet: 'Operating Treasury USD (•••• 4812)',
        },
      },
    ];
    let idx = 0;
    const timer = window.setInterval(() => {
      const next = templates[idx % templates.length];
      idx += 1;
      appendAuditEntry(next);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [liveStreamEnabled, erpConfig.provider, erpConfig.environment, facilities]);

  const openAlertsCount = fraudAlerts.filter((a) => a.status === 'Open').length;
  const usdWalletBalance = wallets.find((w) => w.currency === 'USD')?.balance ?? 0;

  const handleConvertWalletFx = (
    from: CurrencyCode,
    to: CurrencyCode,
    amount: number,
  ): { ok: true; creditedAmount: number } | { ok: false; error: string } => {
    const res = applyWalletFxConversion(wallets, from, to, amount);
    if (!res.ok) return res;
    setWallets(res.wallets);
    return { ok: true, creditedAmount: res.creditedAmount };
  };

  const handleInspectorFxSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(inspectorAmount) || 0;
    const res = handleConvertWalletFx(inspectorFrom, inspectorTo, parsed);
    if (res.ok) {
      setInspectorFxMsg({
        type: 'ok',
        text: `Converted ${formatCurrency(parsed, inspectorFrom)} → ${formatCurrency(res.creditedAmount, inspectorTo)}`,
      });
    } else {
      setInspectorFxMsg({ type: 'err', text: res.error });
    }
  };

  const handleLoanDrawdown = (facilityId: string, amountUsd: number) => {
    const res = applyLoanDrawdown(facilities, wallets, facilityId, amountUsd);
    if (!res.ok) return res;
    const fac = facilities.find((f) => f.id === facilityId);
    setFacilities(res.facilities);
    setWallets(res.wallets);
    appendAuditEntry({
      category: 'credit_drawdown',
      title: 'Manual Credit Facility Drawdown',
      actor: 'Treasury Controller',
      counterpartyOrTarget: fac?.name ?? facilityId,
      amountUsd,
      status: 'Settled',
      channel: 'Capital Desk',
      metadata: {
        facilityId,
        apr: fac ? `${fac.aprPct.toFixed(2)}%` : '7.45%',
        destinationWallet: 'Operating Treasury USD (•••• 4812)',
      },
    });
    return { ok: true as const };
  };

  const handleLoanRepay = (facilityId: string, amountUsd: number) => {
    const res = applyLoanRepayment(facilities, wallets, facilityId, amountUsd);
    if (!res.ok) return res;
    setFacilities(res.facilities);
    setWallets(res.wallets);
    return { ok: true as const };
  };

  const handleOriginateFacility = (params: {
    facilityType: LoanFacility['type'];
    creditLimit: number;
    aprPct: number;
    termMonths: number;
    monthlyPaymentUsd: number;
    initialDrawUsd: number;
  }) => {
    const newId = `fac-${Date.now()}`;
    const newFacility: LoanFacility = {
      id: newId,
      name: `Ravfina Underwritten ${params.facilityType}`,
      type: params.facilityType,
      creditLimit: params.creditLimit,
      principalBalance: params.initialDrawUsd,
      aprPct: params.aprPct,
      termMonths: params.termMonths,
      nextPaymentDate: '2026-12-17',
      nextPaymentAmount: params.monthlyPaymentUsd,
      status: 'Active',
    };
    setFacilities((prev) => [newFacility, ...prev]);
    if (params.initialDrawUsd > 0) {
      setWallets((prev) =>
        prev.map((w) =>
          w.currency === 'USD'
            ? { ...w, balance: Math.round((w.balance + params.initialDrawUsd) * 100) / 100 }
            : w,
        ),
      );
      appendAuditEntry({
        category: 'credit_drawdown',
        title: 'Underwritten Closing Drawdown',
        actor: 'Automated Underwriting',
        counterpartyOrTarget: newFacility.name,
        amountUsd: params.initialDrawUsd,
        status: 'Settled',
        channel: 'One-Click Origination',
        metadata: {
          facilityId: newId,
          apr: `${params.aprPct.toFixed(2)}%`,
          term: `${params.termMonths} months`,
          destinationWallet: 'Operating Treasury USD (•••• 4812)',
        },
      });
    }
  };

  const handleSimulateCashflowDip = (simulatedBalanceUsd: number): string => {
    const targetFac =
      facilities.find((f) => f.id === autoDrawdownRule.facilityId) ?? facilities[0];
    if (!targetFac) return 'No active credit facility available.';
    const avail = targetFac.creditLimit - targetFac.principalBalance;
    const trigger = evaluateAutoDrawdownTrigger(autoDrawdownRule, simulatedBalanceUsd, avail);
    if (!trigger.shouldTrigger) return trigger.reason;

    setFacilities((prev) =>
      prev.map((f) =>
        f.id === targetFac.id
          ? {
              ...f,
              principalBalance: Math.round((f.principalBalance + trigger.drawAmountUsd) * 100) / 100,
            }
          : f,
      ),
    );
    setWallets((prev) =>
      prev.map((w) =>
        w.currency === 'USD'
          ? { ...w, balance: Math.round((w.balance + trigger.drawAmountUsd) * 100) / 100 }
          : w,
      ),
    );
    setAutoDrawdownRule((prev) => ({
      ...prev,
      lastTriggeredAt: new Date().toISOString().slice(11, 19) + ' UTC',
    }));
    appendAuditEntry({
      category: 'credit_drawdown',
      title: 'Auto-Drawdown Cash Floor Replenishment',
      actor: 'Auto-Drawdown Guardrail',
      counterpartyOrTarget: targetFac.name,
      amountUsd: trigger.drawAmountUsd,
      status: 'Auto-Triggered',
      channel: 'Cash-Flow Automation',
      metadata: {
        facilityId: targetFac.id,
        simulatedCashUsd: `$${simulatedBalanceUsd.toLocaleString('en-US')}`,
        cashFloorUsd: `$${autoDrawdownRule.minCashFloorUsd.toLocaleString('en-US')}`,
      },
    });
    return `${trigger.reason} Credited to USD Operating Wallet.`;
  };

  const handleIssueCard = (
    newCard: Omit<CorporateCard, 'id' | 'last4' | 'spentThisMonthUsd' | 'dailyTxCount' | 'expiry'>,
  ) => {
    const randomLast4 = String(1000 + ((cards.length * 1373 + 2911) % 9000));
    const created: CorporateCard = {
      ...newCard,
      id: `card-${Date.now()}`,
      last4: randomLast4,
      spentThisMonthUsd: 0,
      dailyTxCount: 0,
      expiry: '11/29',
    };
    setCards((prev) => [created, ...prev]);
  };

  const handleToggleFreeze = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, status: c.status === 'Active' ? 'Frozen' : 'Active' }
          : c,
      ),
    );
  };

  const handleUpdateCardLimit = (cardId: string, newLimitUsd: number) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, monthlyLimitUsd: newLimitUsd } : c)),
    );
  };

  const handleRecordCardTransaction = (params: {
    card: CorporateCard;
    amountUsd: number;
    mccCode: string;
    approved: boolean;
    reason: string;
  }) => {
    const mccEntry = MCC_DIRECTORY.find((m) => m.code === params.mccCode);
    const mccLabel = mccEntry
      ? `${mccEntry.code} · ${mccEntry.label}`
      : params.mccCode === '7995'
        ? '7995 · Restricted Gaming / Crypto'
        : `MCC ${params.mccCode}`;

    if (params.approved) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === params.card.id
            ? {
                ...c,
                spentThisMonthUsd: Math.round((c.spentThisMonthUsd + params.amountUsd) * 100) / 100,
                dailyTxCount: c.dailyTxCount + 1,
              }
            : c,
        ),
      );
    }

    appendAuditEntry({
      category: 'card_transaction',
      title: params.approved
        ? 'Card Authorization Approved'
        : 'Card Authorization Declined',
      actor: `${params.card.holderName} (•••• ${params.card.last4})`,
      counterpartyOrTarget: mccLabel,
      amountUsd: params.amountUsd,
      status: params.approved ? 'Approved' : 'Declined',
      channel: `${params.card.kind} Card`,
      metadata: {
        department: params.card.department,
        mcc: mccLabel,
        policyResult: params.reason,
      },
    });
  };

  const handleReconcileOne = (txId: string) => {
    const targetTx = fxTransactions.find((t) => t.id === txId);
    setFxTransactions((prev) => reconcileFxTransaction(prev, txId));
    if (targetTx) {
      appendAuditEntry({
        category: 'erp_sync',
        title: 'FX Journal Entry Reconciled',
        actor: 'FX Reconciliation Engine',
        counterpartyOrTarget: `${targetTx.merchant} → ${erpConfig.provider} GL ${targetTx.erpAccountCode}`,
        amountUsd: targetTx.usdEquivalent,
        status: 'Synced',
        channel: 'FX Reconciliation',
        metadata: {
          provider: erpConfig.provider,
          glCode: targetTx.erpAccountCode,
          currency: targetTx.originalCurrency,
        },
      });
    }
  };

  const handleReconcileAllPending = () => {
    const pendingCount = fxTransactions.filter(
      (t) => t.reconciliationStatus !== 'Matched',
    ).length;
    setFxTransactions((prev) =>
      prev.map((t) => ({
        ...t,
        reconciliationStatus: 'Matched',
        fxVarianceUsd: 0,
      })),
    );
    if (pendingCount > 0) {
      appendAuditEntry({
        category: 'erp_sync',
        title: `Batch FX Reconciliation (${pendingCount} entries)`,
        actor: 'FX Reconciliation Engine',
        counterpartyOrTarget: `${erpConfig.provider} ${erpConfig.environment}`,
        amountUsd: null,
        status: 'Synced',
        channel: 'Batch Ledger Close',
        metadata: {
          provider: erpConfig.provider,
          entriesPosted: String(pendingCount),
          fxVarianceCleared: 'Yes',
        },
      });
    }
  };

  const handleTriggerErpSync = () => {
    const nowLabel = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    setErpConfig((prev) => ({ ...prev, lastSyncAt: nowLabel }));
    setWebhookLogs((prev) => [
      {
        id: `wh-${Date.now()}`,
        event: 'erp.manual_sync.completed',
        endpoint: `https://erp.vanguardrobotics.com/webhooks/${erpConfig.provider.toLowerCase().replace(/\s+/g, '-')}`,
        httpStatus: 200,
        latencyMs: 74,
        timestamp: nowLabel,
      },
      ...prev,
    ]);
    appendAuditEntry({
      category: 'erp_sync',
      title: `${erpConfig.provider} Manual Ledger Sync`,
      actor: 'Treasury Controller',
      counterpartyOrTarget: `${erpConfig.provider} ${erpConfig.environment} (${erpConfig.mappings.length} GL rules)`,
      amountUsd: null,
      status: 'Synced',
      channel: erpConfig.syncCadence,
      metadata: {
        provider: erpConfig.provider,
        latencyMs: '74ms',
        costCenterTagging: erpConfig.costCenterTagging ? 'Enabled' : 'Disabled',
      },
    });
  };

  const handleCreateApiKey = (name: string, scopes: string[]) => {
    const tokenSuffix = Math.random().toString(16).slice(2, 10);
    const fullSecret = `rk_live_${tokenSuffix}94f1a2c8e0b3`;
    const record: ApiKeyRecord = {
      id: `key-${Date.now()}`,
      name,
      prefix: `rk_live_${tokenSuffix.slice(0, 6)}...${fullSecret.slice(-4)}`,
      scopes,
      createdAt: new Date().toISOString().slice(0, 10),
      lastUsedAt: 'Just created',
      status: 'Active',
    };
    setApiKeys((prev) => [record, ...prev]);
    return fullSecret;
  };

  const handleRevokeApiKey = (keyId: string) => {
    setApiKeys((prev) =>
      prev.map((k) => (k.id === keyId ? { ...k, status: 'Revoked' } : k)),
    );
  };

  const handleResolveAlert = (alertId: string, resolution: 'Approved' | 'Blocked') => {
    const targetAlert = fraudAlerts.find((a) => a.id === alertId);
    setFraudAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: resolution } : a)),
    );
    if (resolution === 'Blocked' && targetAlert?.relatedCardId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === targetAlert.relatedCardId ? { ...c, status: 'Frozen' } : c,
        ),
      );
    }
  };

  const activeNavTitle =
    NAV_ITEMS.find((n) => n.id === activeSection)?.label ?? 'Wallet & Portfolio';

  const parsedInspectorAmount = Number(inspectorAmount) || 0;
  const inspectorPreviewUsd =
    parsedInspectorAmount > 0 && inspectorFrom !== inspectorTo
      ? convertCurrency(parsedInspectorAmount, inspectorFrom, inspectorTo)
      : 0;

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 lg:grid lg:h-screen lg:grid-cols-[80px_1fr_340px] lg:overflow-hidden dark:bg-[#0b0b0c] dark:text-white">
      {/* Desktop 80px Left Icon Navigation Rail */}
      <nav
        aria-label="Treasury modules"
        className="hidden lg:flex lg:flex-col lg:items-center lg:justify-between border-r border-zinc-300 bg-white py-6 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]"
      >
        <div className="flex flex-col items-center gap-6">
          <button
            type="button"
            onClick={onReturnToLanding}
            aria-label="Ravfina Home"
            title="Ravfina Home"
            className="ravfina-focus-ring flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-950 hover:border-zinc-400 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-white dark:hover:border-[#2e2e32]"
          >
            <RavfinaLogoMark className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center gap-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  aria-label={item.label}
                  title={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`ravfina-focus-ring relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                    active
                      ? 'bg-zinc-950 text-[#facc15] dark:bg-[#1d1d1f] dark:text-[#facc15]'
                      : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950 dark:text-[#88888b] dark:hover:bg-[#1d1d1f] dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.id === 'security' && openAlertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ff4d4d] px-1 font-mono text-[10px] font-bold text-white tabular-nums">
                      {openAlertsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onReopenWizard}
            aria-label="Reconfigure Onboarding"
            title="Reconfigure Onboarding"
            className="ravfina-focus-ring flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-950 dark:border-[#1d1d1f] dark:text-[#88888b] dark:hover:bg-[#1d1d1f] dark:hover:text-white"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onReturnToLanding}
            aria-label="Return to Ravfina Landing"
            title="Ravfina Home"
            className="ravfina-focus-ring flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-950 dark:text-[#88888b] dark:hover:bg-[#1d1d1f] dark:hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {/* Center Scrollable Workspace */}
      <div className="flex min-w-0 flex-1 flex-col lg:border-r lg:border-zinc-300 lg:overflow-y-auto dark:lg:border-[#1d1d1f]">
        <header className="sticky top-0 z-30 border-b border-zinc-300 bg-white/95 backdrop-blur-sm dark:border-[#1d1d1f] dark:bg-[#0b0b0c]/95">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                aria-label={mobileNavOpen ? 'Close workspace menu' : 'Open workspace menu'}
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen((prev) => !prev)}
                className="ravfina-interactive-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-800 lg:hidden dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#d4d4d8]"
              >
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0">
                <div className="truncate font-mono text-[11px] uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
                  /app/{orgSlug} / {config.entityName}
                </div>
                <h1 className="truncate font-display text-lg sm:text-2xl font-light tracking-tight text-zinc-950 dark:text-white">
                  {activeNavTitle}
                </h1>
              </div>
            </div>

            {/* Primary Header Navigation Menu */}
            <nav
              aria-label="Primary navigation"
              className="hidden md:flex items-center gap-5 text-xs font-medium text-zinc-600 dark:text-[#88888b]"
            >
              {HEADER_NAV_LINKS.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveSection(link.id);
                    }}
                    className={`ravfina-nav-link ravfina-focus-ring whitespace-nowrap shrink-0 transition-colors ${
                      isActive
                        ? 'text-zinc-950 font-semibold dark:text-white dark:font-medium'
                        : 'text-zinc-600 hover:text-zinc-950 dark:text-[#88888b] dark:hover:text-white'
                    }`}
                  >
                    {link.label}
                  </a>
                );
              })}

              <button
                type="button"
                onClick={() => setSuiteOpen(true)}
                className="ravfina-interactive-btn ravfina-focus-ring inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:border-amber-500 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#d4d4d8] whitespace-nowrap shrink-0"
              >
                <Layers className="h-3.5 w-3.5 text-amber-700 dark:text-[#facc15]" />
                <span>All Apps</span>
              </button>

              <span className="h-4 w-px bg-zinc-300 dark:bg-[#1d1d1f]" aria-hidden="true" />
              <ThemeToggleButton compact />
            </nav>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActivityDrawerOpen(true)}
                className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 sm:px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:border-zinc-400 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#e4e4e7] dark:hover:border-[#2e2e32] dark:hover:text-white whitespace-nowrap shrink-0"
              >
                <Activity className="h-3.5 w-3.5 text-amber-700 dark:text-[#facc15] shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Activity</span>
                <span className="font-mono text-[11px] tabular-nums text-zinc-600 dark:text-[#88888b]">
                  ({auditActivities.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('cards')}
                className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[38px] items-center rounded-lg border border-amber-500/70 bg-[#facc15] px-3 sm:px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent whitespace-nowrap shrink-0"
              >
                <span className="hidden sm:inline">Manage Cards</span>
                <span className="sm:hidden">Cards</span>
              </button>
            </div>
          </div>

          {/* Mobile Nav Drawer */}
          {mobileNavOpen && (
            <div className="border-t border-zinc-300 bg-white px-4 py-4 lg:hidden dark:border-[#1d1d1f] dark:bg-[#111112]">
              <nav aria-label="Mobile primary navigation" className="mb-3 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-3 text-xs font-medium text-zinc-700 md:hidden dark:border-[#1d1d1f] dark:text-[#a1a1aa]">
                <div className="flex flex-wrap gap-5">
                  {HEADER_NAV_LINKS.map((link) => {
                    const isActive = activeSection === link.id;
                    return (
                      <a
                        key={link.id}
                        href={link.href}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveSection(link.id);
                          setMobileNavOpen(false);
                        }}
                        className={`ravfina-nav-link ravfina-focus-ring py-1 ${
                          isActive
                            ? 'text-zinc-950 font-semibold dark:text-white dark:font-medium'
                            : 'text-zinc-600 hover:text-zinc-950 dark:text-[#88888b] dark:hover:text-white'
                        }`}
                      >
                        {link.label}
                      </a>
                    );
                  })}
                </div>
                <ThemeToggleButton compact />
              </nav>

              <nav aria-label="Mobile treasury modules" className="grid grid-cols-2 gap-2">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(item.id);
                        setMobileNavOpen(false);
                      }}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                        active
                          ? 'border-amber-500 bg-amber-50 text-amber-900 dark:border-[#facc15]/40 dark:bg-[#1d1d1f] dark:text-[#facc15]'
                          : 'border-zinc-300 bg-zinc-50 text-zinc-800 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3 dark:border-[#1d1d1f]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    onReopenWizard();
                  }}
                  className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8]"
                >
                  Reconfigure Onboarding
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    onReturnToLanding();
                  }}
                  className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#88888b]"
                >
                  Ravfina Home
                </button>
                <div className="ml-auto hidden md:block">
                  <ThemeToggleButton compact />
                </div>
              </div>
            </div>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
          <PanelStateTransition transitionKey={activeSection}>
            {activeSection === 'wallet' && (
              <div className="space-y-6">
                {/* Variation 6 CFO Intelligence Insight Banner */}
                <section
                  aria-label="CFO Intelligence Insight"
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-400 bg-gradient-to-r from-amber-50 to-white p-5 dark:border-[#facc15]/25 dark:from-[#1a1a12] dark:to-[#111112]"
                >
                  <div className="max-w-2xl">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-[#facc15]">
                      CFO Intelligence Insight · {cashFlowTrend.horizonLabel}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-800 dark:text-[#e4e4e7]">
                      {cashFlowTrend.summary.quickInsight}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('loans')}
                    className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[36px] items-center rounded-lg border border-amber-500 bg-white px-3.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-[#facc15]/40 dark:bg-[#0b0b0c]/70 dark:text-[#facc15] dark:hover:bg-[#1d1d1f] whitespace-nowrap shrink-0"
                  >
                    Open Underwriting Desk
                  </button>
                </section>

                {/* Smart Trend D3 Dashboard Component */}
                <section
                  aria-label="Smart Trend Cash Flow Visualization"
                  data-testid="smart-trend-section"
                  className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]"
                >
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-[#facc15]">
                        <SmartTrendChartIcon className="h-4 w-4" />
                        <span>Smart Trend · Cash Flow Projection ({cashFlowTrend.horizonLabel})</span>
                      </div>
                      <h2 className="mt-1 font-display text-lg font-bold text-zinc-950 dark:text-white">
                        {cashFlowTrend.summary.quickInsight}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSection('loans')}
                      className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[36px] items-center rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-1.5 text-xs font-semibold text-zinc-800 hover:border-zinc-400 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:border-[#2e2e32] dark:hover:text-white whitespace-nowrap shrink-0"
                    >
                      Modify Drawdowns &amp; Schedule
                    </button>
                  </div>

                  <CashFlowTrendChart
                    points={cashFlowTrend.points}
                    summary={cashFlowTrend.summary}
                    horizonMonths={trendHorizonMonths}
                    horizonLabel={cashFlowTrend.horizonLabel}
                    scheduleAdjustmentUsd={scheduleAdjustmentUsd}
                    onChangeHorizonMonths={setTrendHorizonMonths}
                    onChangeScheduleAdjustment={setScheduleAdjustmentUsd}
                    onResetView={() => {
                      setTrendHorizonMonths(6);
                      setScheduleAdjustmentUsd(0);
                    }}
                  />
                </section>

                <WalletOverviewView
                  wallets={wallets}
                  holdings={INITIAL_PORTFOLIO_HOLDINGS}
                  cashflow={MONTHLY_CASHFLOW_SERIES}
                  transactions={fxTransactions}
                  auditActivities={auditActivities}
                  liveStreamEnabled={liveStreamEnabled}
                  onToggleLiveStream={() => setLiveStreamEnabled((prev) => !prev)}
                  onNavigateSection={setActiveSection}
                  onConvertWalletFx={handleConvertWalletFx}
                />
              </div>
            )}

            {activeSection === 'loans' && (
              <LoansFundingView
                facilities={facilities}
                usdWalletBalance={usdWalletBalance}
                linkedBanks={config.linkedBanks}
                erpProvider={erpConfig.provider}
                monthlyInflowsUsd={MONTHLY_CASHFLOW_SERIES[MONTHLY_CASHFLOW_SERIES.length - 1].inflowsUsd}
                monthlyOpexUsd={MONTHLY_CASHFLOW_SERIES[MONTHLY_CASHFLOW_SERIES.length - 1].opexUsd}
                autoDrawdownRule={autoDrawdownRule}
                onUpdateAutoDrawdownRule={setAutoDrawdownRule}
                onOriginateFacility={handleOriginateFacility}
                onSimulateCashflowDip={handleSimulateCashflowDip}
                onDrawdown={handleLoanDrawdown}
                onRepay={handleLoanRepay}
              />
            )}

            {activeSection === 'cards' && (
              <CardsManagementView
                cards={cards}
                policy={config.cardPolicy}
                onIssueCard={handleIssueCard}
                onToggleFreeze={handleToggleFreeze}
                onUpdateCardLimit={handleUpdateCardLimit}
                onRecordCardTransaction={handleRecordCardTransaction}
              />
            )}

            {activeSection === 'fx' && (
              <FxReconciliationView
                transactions={fxTransactions}
                erpProvider={erpConfig.provider}
                onReconcileOne={handleReconcileOne}
                onReconcileAllPending={handleReconcileAllPending}
              />
            )}

            {activeSection === 'erp' && (
              <ErpApiView
                erpConfig={erpConfig}
                apiKeys={apiKeys}
                webhookLogs={webhookLogs}
                onTriggerErpSync={handleTriggerErpSync}
                onCreateApiKey={handleCreateApiKey}
                onRevokeApiKey={handleRevokeApiKey}
              />
            )}

            {activeSection === 'teams' && <TeamsLedgerView orgSlug={orgSlug} />}

            {activeSection === 'security' && (
              <SecurityFraudView
                alerts={fraudAlerts}
                mfa={mfa}
                onResolveAlert={handleResolveAlert}
                onToggleHardwareKeyPolicy={() =>
                  setMfa((prev) => ({
                    ...prev,
                    enforceHardwareKey: !prev.enforceHardwareKey,
                  }))
                }
                onUpdateWireThreshold={(amountUsd) =>
                  setMfa((prev) => ({ ...prev, wireDualApprovalAboveUsd: amountUsd }))
                }
              />
            )}
          </PanelStateTransition>
          <PlatformSuiteModal
            open={suiteOpen}
            onClose={() => setSuiteOpen(false)}
            currentPath={`/app/${orgSlug}`}
          />
        </main>
      </div>

      {/* Right 340px Inspector Pane: Audit Feed & Live FX Rebalance */}
      <aside
        aria-label="Audit Feed and FX Rebalance"
        className="hidden lg:flex lg:flex-col lg:justify-between bg-zinc-50 lg:overflow-y-auto p-6 dark:bg-[#0d0d0e]"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-amber-800 dark:text-[#facc15]">
              Audit Feed · Recent Activity
            </h2>
            <button
              type="button"
              onClick={() => setActivityDrawerOpen(true)}
              className="font-mono text-[11px] text-zinc-600 hover:text-zinc-950 dark:text-[#88888b] dark:hover:text-white"
            >
              Full Log →
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {auditActivities.slice(0, 5).map((item) => {
              const targetSection: WorkspaceSection =
                item.category === 'credit_drawdown'
                  ? 'loans'
                  : item.category === 'card_transaction'
                    ? 'cards'
                    : 'erp';
              const isDeclined = item.status === 'Declined';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(targetSection)}
                  className="flex w-full items-center gap-3 rounded-lg border border-zinc-300 bg-white p-3 text-left transition-colors hover:border-zinc-400 dark:border-[#1d1d1f] dark:bg-[#111112] dark:hover:border-[#2e2e32]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-800 dark:bg-[#1d1d1f] dark:text-[#facc15]">
                    {item.category === 'credit_drawdown' ? (
                      <Landmark className="h-4 w-4" aria-hidden="true" />
                    ) : item.category === 'card_transaction' ? (
                      <CreditCard className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Database className="h-4 w-4" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-zinc-950 dark:text-white">{item.title}</div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-600 dark:text-[#88888b]">
                      {item.counterpartyOrTarget}
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono text-xs tabular-nums">
                    {item.amountUsd !== null ? (
                      <span className={isDeclined ? 'text-red-700 dark:text-[#ff4d4d]' : 'text-amber-800 dark:text-[#facc15]'}>
                        {formatCurrency(item.amountUsd)}
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400">{item.status}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Live FX Rebalance Desk */}
        <div className="mt-6 border-t border-zinc-300 pt-5 dark:border-[#1d1d1f]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-800 dark:text-[#facc15]">
            <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Instant FX Rebalance</span>
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
            Spot conversion across live corporate currency wallets.
          </p>

          <form onSubmit={handleInspectorFxSubmit} className="mt-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="inspector-fx-from" className="block text-[11px] text-zinc-700 dark:text-[#88888b]">
                  From
                </label>
                <select
                  id="inspector-fx-from"
                  value={inspectorFrom}
                  onChange={(e) => setInspectorFrom(e.target.value as CurrencyCode)}
                  className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-2.5 py-2 font-mono text-xs text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-white dark:focus:border-[#facc15]"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.currency}>
                      {w.currency}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="inspector-fx-to" className="block text-[11px] text-zinc-700 dark:text-[#88888b]">
                  To
                </label>
                <select
                  id="inspector-fx-to"
                  value={inspectorTo}
                  onChange={(e) => setInspectorTo(e.target.value as CurrencyCode)}
                  className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-2.5 py-2 font-mono text-xs text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-white dark:focus:border-[#facc15]"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.currency}>
                      {w.currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="inspector-fx-amount" className="block text-[11px] text-zinc-700 dark:text-[#88888b]">
                Amount ({inspectorFrom})
              </label>
              <input
                id="inspector-fx-amount"
                type="number"
                min={1}
                step="any"
                value={inspectorAmount}
                onChange={(e) => setInspectorAmount(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 font-mono text-xs tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-white dark:focus:border-[#facc15]"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-[#1d1d1f] dark:bg-[#111112]">
              <span className="text-zinc-600 dark:text-[#88888b]">Est. Credit</span>
              <span className="font-mono font-semibold tabular-nums text-zinc-950 dark:text-white">
                {formatCurrency(inspectorPreviewUsd, inspectorTo)}
              </span>
            </div>

            {inspectorFxMsg && (
              <div
                role="status"
                className={`rounded-lg border px-2.5 py-2 text-[11px] ${
                  inspectorFxMsg.type === 'ok'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-red-300 bg-red-50 text-red-700 dark:border-[#ff4d4d]/40 dark:bg-[#ff4d4d]/10 dark:text-[#ff4d4d]'
                }`}
              >
                {inspectorFxMsg.text}
              </div>
            )}

            <button
              type="submit"
              className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[38px] w-full items-center justify-center rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent"
            >
              Execute Rebalance
            </button>
          </form>
        </div>
      </aside>

      {/* Global Slide-Over Recent Activity Drawer */}
      <SlideOverDrawer
        open={activityDrawerOpen}
        onClose={() => setActivityDrawerOpen(false)}
        ariaLabel="Recent Activity Audit Drawer"
      >
        <div className="flex items-center justify-between border-b border-zinc-300 bg-white px-6 py-4 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div>
            <div className="text-xs text-zinc-600 dark:text-[#88888b]">Ravfina Audit Trail</div>
            <div className="font-display text-base font-bold text-zinc-950 dark:text-white">
              Real-Time Workspace Activity
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Recent Activity drawer"
            onClick={() => setActivityDrawerOpen(false)}
            className="ravfina-interactive-btn ravfina-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#a1a1aa] dark:hover:border-[#2e2e32] dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <RecentActivityPanel
            compact
            activities={auditActivities}
            liveStreamEnabled={liveStreamEnabled}
            onToggleLiveStream={() => setLiveStreamEnabled((prev) => !prev)}
            onNavigateSection={(section) => {
              setActiveSection(section);
              setActivityDrawerOpen(false);
            }}
          />
        </div>
      </SlideOverDrawer>
    </div>
  );
}
