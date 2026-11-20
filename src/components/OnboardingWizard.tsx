import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  CreditCard,
  Database,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { MCC_DIRECTORY } from '../data/seedTreasury';
import {
  formatCurrency,
  validateOnboardingStage,
  type CurrencyCode,
  type ErpProvider,
  type OnboardingConfig,
} from '../domain/treasury';
import { RavfinaLogoMark } from './icons/RavfinaIcons';
import { InfoTooltip } from './InfoTooltip';
import { PanelStateTransition } from './MotionPrimitives';
import { ThemeToggleButton } from './ThemeToggleButton';

interface OnboardingWizardProps {
  initialConfig: OnboardingConfig;
  onComplete: (config: OnboardingConfig) => void;
  onBackToLanding: () => void;
}

interface HealthCheckState {
  id: string;
  label: string;
  endpoint: string;
  status: 'pending' | 'checking' | 'passed';
  latencyMs?: number;
  detail: string;
}

const STAGES = [
  { id: 1, title: 'Entity & Security', subtitle: 'Corporate entity & MFA policy' },
  { id: 2, title: 'Bank Integration', subtitle: 'Plaid corporate liquidity sync' },
  { id: 3, title: 'Card Governance', subtitle: 'Limits, frequency & MCC rules' },
  { id: 4, title: 'ERP Assistant', subtitle: 'NetSuite, SAP & QuickBooks' },
  { id: 5, title: 'Health & Launch', subtitle: 'Connectivity verification' },
];

export function OnboardingWizard({
  initialConfig,
  onComplete,
  onBackToLanding,
}: OnboardingWizardProps) {
  const [stage, setStage] = useState(1);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [config, setConfig] = useState<OnboardingConfig>(initialConfig);
  const [stageError, setStageError] = useState<string | null>(null);
  const [customMccInput, setCustomMccInput] = useState('');
  const [plaidConnectingId, setPlaidConnectingId] = useState<string | null>(null);

  const [healthChecks, setHealthChecks] = useState<HealthCheckState[]>([
    {
      id: 'hc-plaid',
      label: 'Plaid Open Banking Feed',
      endpoint: 'api.plaid.com/accounts/balance/get',
      status: 'pending',
      detail: 'Verify read-only balance and ACH routing tokens',
    },
    {
      id: 'hc-cards',
      label: 'Card Processor & MCC Engine',
      endpoint: 'issuing.ravfina.com/v2/policies',
      status: 'pending',
      detail: 'Publish velocity caps and Merchant Category Code allowlist',
    },
    {
      id: 'hc-erp',
      label: `${config.erpConfig.provider} Ledger Connector`,
      endpoint: `erp-sync.ravfina.com/${config.erpConfig.provider.toLowerCase().replace(/\s+/g, '-')}`,
      status: 'pending',
      detail: 'Test OAuth handshake and chart-of-accounts mapping',
    },
    {
      id: 'hc-mfa',
      label: 'MFA & Real-Time Fraud Screening',
      endpoint: 'secops.ravfina.com/v1/telemetry',
      status: 'pending',
      detail: 'Confirm WebAuthn enforcement and anomaly ruleset',
    },
  ]);
  const [isRunningChecks, setIsRunningChecks] = useState(false);

  const allChecksPassed = healthChecks.every((hc) => hc.status === 'passed');
  const connectedBanks = config.linkedBanks.filter((b) => b.connected);
  const totalVerifiedLiquidity = connectedBanks.reduce((sum, b) => sum + b.balanceUsd, 0);

  const handleNext = () => {
    const check = validateOnboardingStage(stage, config);
    if (!check.valid) {
      setStageError(check.message ?? 'Please resolve validation issues before continuing.');
      return;
    }
    setStageError(null);
    setCompletedStages((prev) => (prev.includes(stage) ? prev : [...prev, stage]));
    if (stage < 5) {
      setStage(stage + 1);
    }
  };

  const handlePrevious = () => {
    setStageError(null);
    if (stage > 1) {
      setStage(stage - 1);
    }
  };

  const handleToggleBankConnection = (bankId: string) => {
    const target = config.linkedBanks.find((b) => b.id === bankId);
    if (!target) return;

    if (target.connected) {
      setConfig((prev) => ({
        ...prev,
        linkedBanks: prev.linkedBanks.map((b) =>
          b.id === bankId ? { ...b, connected: false, lastSynced: 'Disconnected' } : b,
        ),
      }));
      return;
    }

    setPlaidConnectingId(bankId);
    setTimeout(() => {
      setConfig((prev) => ({
        ...prev,
        linkedBanks: prev.linkedBanks.map((b) =>
          b.id === bankId ? { ...b, connected: true, lastSynced: 'Just now' } : b,
        ),
      }));
      setPlaidConnectingId(null);
      setStageError(null);
    }, 350);
  };

  const handleToggleMcc = (code: string) => {
    setConfig((prev) => {
      const exists = prev.cardPolicy.allowedMccCodes.includes(code);
      const nextCodes = exists
        ? prev.cardPolicy.allowedMccCodes.filter((c) => c !== code)
        : [...prev.cardPolicy.allowedMccCodes, code];
      return {
        ...prev,
        cardPolicy: { ...prev.cardPolicy, allowedMccCodes: nextCodes },
      };
    });
  };

  const handleAddCustomMcc = () => {
    const cleaned = customMccInput.trim();
    if (!/^\d{4}$/.test(cleaned)) {
      setStageError('Custom MCC codes must be exactly 4 numeric digits (e.g. 5942).');
      return;
    }
    setStageError(null);
    if (!config.cardPolicy.allowedMccCodes.includes(cleaned)) {
      setConfig((prev) => ({
        ...prev,
        cardPolicy: {
          ...prev.cardPolicy,
          allowedMccCodes: [...prev.cardPolicy.allowedMccCodes, cleaned],
        },
      }));
    }
    setCustomMccInput('');
  };

  const runAutomatedHealthChecks = () => {
    if (isRunningChecks) return;
    setIsRunningChecks(true);

    const updatedProviderChecks: HealthCheckState[] = [
      {
        id: 'hc-plaid',
        label: 'Plaid Open Banking Feed',
        endpoint: 'api.plaid.com/accounts/balance/get',
        status: 'checking',
        detail: `${connectedBanks.length} corporate institution(s) synchronized`,
      },
      {
        id: 'hc-cards',
        label: 'Card Processor & MCC Engine',
        endpoint: 'issuing.ravfina.com/v2/policies',
        status: 'pending',
        detail: `${config.cardPolicy.allowedMccCodes.length} MCC codes compiled`,
      },
      {
        id: 'hc-erp',
        label: `${config.erpConfig.provider} Ledger Connector`,
        endpoint: `erp-sync.ravfina.com/${config.erpConfig.provider.toLowerCase().replace(/\s+/g, '-')}`,
        status: 'pending',
        detail: `${config.erpConfig.syncCadence} · ${config.erpConfig.mappings.length} GL rules`,
      },
      {
        id: 'hc-mfa',
        label: 'MFA & Real-Time Fraud Screening',
        endpoint: 'secops.ravfina.com/v1/telemetry',
        status: 'pending',
        detail: `${config.mfaPolicy} · ${config.fraudSensitivity} profile`,
      },
    ];
    setHealthChecks(updatedProviderChecks);

    const latencies = [68, 42, 114, 35];
    updatedProviderChecks.forEach((item, idx) => {
      setTimeout(() => {
        setHealthChecks((prev) =>
          prev.map((hc, hcIdx) => {
            if (hc.id === item.id) {
              return { ...hc, status: 'passed', latencyMs: latencies[idx] };
            }
            if (hcIdx === idx + 1) {
              return { ...hc, status: 'checking' };
            }
            return hc;
          }),
        );
        if (idx === updatedProviderChecks.length - 1) {
          setIsRunningChecks(false);
          setCompletedStages((prev) => (prev.includes(5) ? prev : [...prev, 5]));
        }
      }, (idx + 1) * 320);
    });
  };

  const progressPct = Math.round((completedStages.length / STAGES.length) * 100);

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      {/* Top Header */}
      <header className="border-b border-zinc-300 bg-white dark:border-[#1d1d1f] dark:bg-[#111112]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBackToLanding}
              className="ravfina-interactive-btn inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:border-zinc-400 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:border-[#2e2e32] dark:hover:text-white whitespace-nowrap"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Ravfina Home
            </button>
            <span className="inline-flex items-center gap-2 font-display text-base font-bold text-zinc-950 dark:text-white whitespace-nowrap">
              <RavfinaLogoMark className="h-5 w-5 shrink-0" />
              <span>Ravfina Treasury Setup</span>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right font-mono text-xs tabular-nums text-zinc-600 dark:text-[#88888b] whitespace-nowrap">
              Stage {stage} of {STAGES.length} ·{' '}
              <span className="font-semibold text-amber-800 dark:text-[#facc15]">{progressPct}%</span> Configured
            </div>
            <ThemeToggleButton compact />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-12">
        {/* Persistent Progress Tracker */}
        <aside aria-label="Onboarding progress" className="lg:col-span-4">
          <div className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-[#88888b]">
              <span>Configuration Progress</span>
              <span className="font-mono font-semibold tabular-nums text-amber-800 dark:text-[#facc15]">{progressPct}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-[#1d1d1f]">
              <div
                className="h-full bg-ravfina-yellow-gradient transition-transform duration-200 origin-left"
                style={{ transform: `scaleX(${Math.max(0.08, progressPct / 100)})` }}
              />
            </div>

            <ol className="mt-6 space-y-2">
              {STAGES.map((item) => {
                const isActive = item.id === stage;
                const isDone = completedStages.includes(item.id);
                const canJump = isDone || item.id <= stage;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={!canJump}
                      onClick={() => canJump && setStage(item.id)}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                        isActive
                          ? 'border-amber-500 bg-amber-50 dark:border-[#facc15]/60 dark:bg-[#1a1a12]'
                          : isDone
                            ? 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:hover:border-[#2e2e32]'
                            : 'border-transparent bg-transparent opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold ${
                          isDone
                            ? 'border border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : isActive
                              ? 'bg-[#facc15] text-black'
                              : 'border border-zinc-400 bg-white text-zinc-600 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-[#88888b]'
                        }`}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : item.id}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-zinc-950 dark:text-white">
                          {item.title}
                        </span>
                        <span className="block text-xs text-zinc-600 dark:text-[#88888b]">{item.subtitle}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* Live Liquidity Snapshot inside Tracker */}
            <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-[#1d1d1f]">
              <div className="text-xs font-medium text-zinc-600 dark:text-[#88888b]">Verified Linked Liquidity</div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-800 dark:text-[#facc15]">
                {formatCurrency(totalVerifiedLiquidity)}
              </div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
                {connectedBanks.length} bank account(s) · {config.erpConfig.provider}
              </div>
            </div>
          </div>
        </aside>

        {/* Active Stage Workspace */}
        <main className="lg:col-span-8">
          <div className="rounded-xl border border-zinc-300 bg-white p-6 lg:p-8 dark:border-[#1d1d1f] dark:bg-[#111112]">
            {stageError && (
              <div
                role="alert"
                className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-[#ff4d4d]/40 dark:bg-[#ff4d4d]/10 dark:text-[#ff4d4d]"
              >
                {stageError}
              </div>
            )}

            {/* Active Stage Transition Container */}
            <PanelStateTransition transitionKey={stage}>
              {/* Stage 1: Entity & Security Baseline */}
              {stage === 1 && (
              <section aria-labelledby="stage1-heading">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-[#facc15]">
                  <Building className="h-4 w-4" aria-hidden="true" />
                  <span>Stage 1 of 5 · Entity &amp; Security Baseline</span>
                </div>
                <h1 id="stage1-heading" className="mt-2 font-display text-2xl font-bold text-zinc-950 dark:text-white">
                  Configure corporate entity and MFA enforcement
                </h1>
                <p className="mt-2 text-sm text-zinc-700 dark:text-[#a1a1aa]">
                  Establish your legal reporting entity, primary treasury denomination, and
                  authentication guardrails before linking bank liquidity.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="ob-entity-name"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Legal Entity Name
                      <InfoTooltip
                        label="Legal Entity Name"
                        description="Must match your Articles of Incorporation and primary corporate bank account title for KYB and ACH origination."
                      />
                    </label>
                    <input
                      id="ob-entity-name"
                      type="text"
                      value={config.entityName}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, entityName: e.target.value }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 text-sm text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ob-ein"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Federal EIN / Tax ID
                      <InfoTooltip
                        label="Federal EIN"
                        description="Nine-digit Employer Identification Number (XX-XXXXXXX) used for IRS Treasury Bill reporting and underwriting."
                      />
                    </label>
                    <input
                      id="ob-ein"
                      type="text"
                      value={config.ein}
                      onChange={(e) => setConfig((prev) => ({ ...prev, ein: e.target.value }))}
                      placeholder="84-3920145"
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 font-mono text-sm text-zinc-950 placeholder:text-zinc-500 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:placeholder:text-[#88888b] dark:focus:border-[#facc15]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ob-currency"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Base Reporting Currency
                      <InfoTooltip
                        label="Base Reporting Currency"
                        description="Primary functional currency used to consolidate multi-currency wallets, card caps, and ERP journal exports."
                      />
                    </label>
                    <select
                      id="ob-currency"
                      value={config.baseCurrency}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          baseCurrency: e.target.value as CurrencyCode,
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 text-sm text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                    >
                      <option value="USD">USD — United States Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="GBP">GBP — British Pound</option>
                      <option value="CAD">CAD — Canadian Dollar</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="ob-mfa"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Multifactor Authentication Policy
                      <InfoTooltip
                        label="MFA Enforcement Policy"
                        description="Hardware FIDO2/WebAuthn keys are strongly recommended for administrators approving wires and issuing cards."
                      />
                    </label>
                    <select
                      id="ob-mfa"
                      value={config.mfaPolicy}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          mfaPolicy: e.target.value as OnboardingConfig['mfaPolicy'],
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 text-sm text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                    >
                      <option value="Hardware Key + TOTP">Hardware Key (WebAuthn) + TOTP</option>
                      <option value="TOTP Authenticator">TOTP Authenticator App Only</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="ob-fraud"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Fraud Screening Sensitivity
                      <InfoTooltip
                        label="Real-Time Fraud Sensitivity"
                        description="Strict mode immediately freezes cards on unrecognized geo-IP shifts or out-of-policy MCC attempts."
                      />
                    </label>
                    <select
                      id="ob-fraud"
                      value={config.fraudSensitivity}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          fraudSensitivity: e.target.value as OnboardingConfig['fraudSensitivity'],
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 text-sm text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                    >
                      <option value="Strict">Strict — Auto-block anomalies &amp; notify</option>
                      <option value="Balanced">Balanced — Step-up MFA challenge</option>
                      <option value="Custom">Custom — Rule-by-rule threshold</option>
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* Stage 2: Secure Bank Integration (Plaid) */}
            {stage === 2 && (
              <section aria-labelledby="stage2-heading">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-[#facc15]">
                  <Landmark className="h-4 w-4" aria-hidden="true" />
                  <span>Stage 2 of 5 · Plaid Bank Integration</span>
                </div>
                <h1 id="stage2-heading" className="mt-2 font-display text-2xl font-bold text-zinc-950 dark:text-white">
                  Link corporate accounts for real-time liquidity visibility
                </h1>
                <p className="mt-2 text-sm text-zinc-700 dark:text-[#a1a1aa]">
                  Connect primary checking and sweep accounts via encrypted Plaid read/originate
                  tokens. Balances update immediately in your Ravfina liquidity ledger.
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
                  <div className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#d4d4d8]">
                    Aggregated Linked Cash Position
                    <InfoTooltip
                      label="Aggregated Linked Liquidity"
                      description="Sum of verified balances across all connected Plaid institutional accounts, used to underwrite credit limits."
                    />
                  </div>
                  <div className="font-mono text-lg font-semibold tabular-nums text-amber-800 dark:text-[#facc15]">
                    {formatCurrency(totalVerifiedLiquidity)}
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {config.linkedBanks.map((bank) => {
                    const isConnecting = plaidConnectingId === bank.id;
                    return (
                      <div
                        key={bank.id}
                        className="flex flex-col justify-between gap-4 rounded-lg border border-zinc-300 bg-zinc-50 p-4 sm:flex-row sm:items-center dark:border-[#1d1d1f] dark:bg-[#0b0b0c]"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-950 dark:text-white">{bank.institution}</span>
                            <span className="text-xs text-zinc-600 dark:text-[#88888b]">· {bank.type}</span>
                          </div>
                          <div className="mt-1 font-mono text-xs tabular-nums text-zinc-700 dark:text-[#a1a1aa]">
                            {bank.accountName} (•••• {bank.mask}) · Synced: {bank.lastSynced}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-5 sm:justify-end">
                          <div className="text-right font-mono tabular-nums">
                            <div className="text-sm font-semibold text-zinc-950 dark:text-white">
                              {formatCurrency(bank.balanceUsd)}
                            </div>
                            <div
                              className={`text-xs font-medium ${
                                bank.connected
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-zinc-600 dark:text-[#88888b]'
                              }`}
                            >
                              {bank.connected ? 'Connected via Plaid' : 'Not linked'}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isConnecting}
                            onClick={() => handleToggleBankConnection(bank.id)}
                            className={`inline-flex min-h-[40px] min-w-[118px] items-center justify-center rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                              bank.connected
                                ? 'border border-zinc-400 bg-white text-zinc-800 hover:border-red-500 hover:text-red-700 dark:border-[#2e2e32] dark:bg-[#111112] dark:text-[#d4d4d8] dark:hover:border-[#ff4d4d]/50 dark:hover:text-[#ff4d4d]'
                                : 'border border-amber-500/70 bg-[#facc15] font-bold text-black hover:bg-[#fde047] dark:border-transparent'
                            }`}
                          >
                            {isConnecting ? (
                              <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                Linking...
                              </>
                            ) : bank.connected ? (
                              'Disconnect'
                            ) : (
                              'Connect Plaid'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Stage 3: Card Policy & MCC Governance */}
            {stage === 3 && (
              <section aria-labelledby="stage3-heading">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-[#facc15]">
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  <span>Stage 3 of 5 · Card Policy &amp; MCC Governance</span>
                </div>
                <h1 id="stage3-heading" className="mt-2 font-display text-2xl font-bold text-zinc-950 dark:text-white">
                  Define corporate card spend caps and MCC allowlists
                </h1>
                <p className="mt-2 text-sm text-zinc-700 dark:text-[#a1a1aa]">
                  Enforce programmatic spending limits, velocity frequency caps, and Merchant Category
                  Code allowlists across newly issued physical and virtual cards.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="policy-per-tx"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Per-Transaction Cap ($)
                      <InfoTooltip
                        label="Per-Transaction Cap"
                        description="Maximum USD amount permitted for any single card authorization before automatic decline."
                      />
                    </label>
                    <input
                      id="policy-per-tx"
                      type="number"
                      min={1}
                      value={config.cardPolicy.perTransactionLimitUsd}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          cardPolicy: {
                            ...prev.cardPolicy,
                            perTransactionLimitUsd: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="policy-daily"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Daily Spend Limit ($)
                      <InfoTooltip
                        label="Daily Spend Limit"
                        description="Rolling 24-hour cumulative spend ceiling across a single corporate card."
                      />
                    </label>
                    <input
                      id="policy-daily"
                      type="number"
                      min={1}
                      value={config.cardPolicy.dailyLimitUsd}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          cardPolicy: {
                            ...prev.cardPolicy,
                            dailyLimitUsd: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="policy-monthly"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Monthly Spend Limit ($)
                      <InfoTooltip
                        label="Monthly Spend Limit"
                        description="Default calendar-month spend limit assigned to new corporate cards unless overridden."
                      />
                    </label>
                    <input
                      id="policy-monthly"
                      type="number"
                      min={1}
                      value={config.cardPolicy.monthlyLimitUsd}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          cardPolicy: {
                            ...prev.cardPolicy,
                            monthlyLimitUsd: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="policy-tx-day"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Max Swipes / Day
                      <InfoTooltip
                        label="Daily Frequency Cap"
                        description="Prevents rapid card-testing attacks or compromised subscription bursts within a 24h window."
                      />
                    </label>
                    <input
                      id="policy-tx-day"
                      type="number"
                      min={1}
                      value={config.cardPolicy.maxTransactionsPerDay}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          cardPolicy: {
                            ...prev.cardPolicy,
                            maxTransactionsPerDay: Number(e.target.value) || 1,
                          },
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="policy-tx-week"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Max Swipes / Week
                      <InfoTooltip
                        label="Weekly Frequency Cap"
                        description="Total number of approved authorizations allowed per card across a 7-day rolling period."
                      />
                    </label>
                    <input
                      id="policy-tx-week"
                      type="number"
                      min={1}
                      value={config.cardPolicy.maxTransactionsPerWeek}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          cardPolicy: {
                            ...prev.cardPolicy,
                            maxTransactionsPerWeek: Number(e.target.value) || 1,
                          },
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="policy-receipt"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Receipt Threshold ($)
                      <InfoTooltip
                        label="Mandatory Receipt Threshold"
                        description="Transactions above this dollar value automatically trigger a Slack/email receipt prompt for ERP audit compliance."
                      />
                    </label>
                    <input
                      id="policy-receipt"
                      type="number"
                      min={0}
                      value={config.cardPolicy.requireReceiptAboveUsd}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          cardPolicy: {
                            ...prev.cardPolicy,
                            requireReceiptAboveUsd: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                    />
                  </div>
                </div>

                {/* MCC Allowlist */}
                <div className="mt-7 border-t border-zinc-200 pt-6 dark:border-[#1d1d1f]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center text-sm font-semibold text-zinc-950 dark:text-white">
                      Approved Merchant Category Code (MCC) Allowlist
                      <InfoTooltip
                        label="MCC Allowlist"
                        description="Only merchants broadcasting an ISO 18245 MCC in this allowlist can authorize charges on corporate cards."
                      />
                    </div>
                    <span className="font-mono text-xs font-semibold tabular-nums text-amber-800 dark:text-[#facc15]">
                      {config.cardPolicy.allowedMccCodes.length} codes active
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {MCC_DIRECTORY.map((mcc) => {
                      const active = config.cardPolicy.allowedMccCodes.includes(mcc.code);
                      return (
                        <label
                          key={mcc.code}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                            active
                              ? 'border-amber-500 bg-amber-50 dark:border-[#facc15]/50 dark:bg-[#1a1a12]'
                              : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:hover:border-[#2e2e32]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => handleToggleMcc(mcc.code)}
                            className="mt-0.5 h-4 w-4 rounded border-zinc-400 bg-white accent-amber-600 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:accent-[#facc15]"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-zinc-950 dark:text-white">
                              <span className="font-mono font-semibold text-amber-800 dark:text-[#facc15]">{mcc.code}</span> · {mcc.label}
                            </span>
                            <span className="block text-xs text-zinc-600 dark:text-[#88888b]">{mcc.group}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <label htmlFor="custom-mcc" className="sr-only">
                      Add custom 4-digit MCC code
                    </label>
                    <input
                      id="custom-mcc"
                      type="text"
                      maxLength={4}
                      value={customMccInput}
                      onChange={(e) => setCustomMccInput(e.target.value)}
                      placeholder="Custom 4-digit MCC (e.g. 5942)"
                      className="w-60 rounded-lg border border-zinc-400 bg-white px-3 py-2 font-mono text-xs text-zinc-950 placeholder:text-zinc-500 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:placeholder:text-[#88888b] dark:focus:border-[#facc15]"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomMcc}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-zinc-400 bg-white px-3 py-1.5 text-xs font-medium text-zinc-950 hover:border-amber-600 hover:text-amber-800 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white dark:hover:border-[#facc15] dark:hover:text-[#facc15]"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Add MCC
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Stage 4: Guided ERP Integration Assistant */}
            {stage === 4 && (
              <section aria-labelledby="stage4-heading">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-[#facc15]">
                  <Database className="h-4 w-4" aria-hidden="true" />
                  <span>Stage 4 of 5 · Guided ERP Integration Assistant</span>
                </div>
                <h1 id="stage4-heading" className="mt-2 font-display text-2xl font-bold text-zinc-950 dark:text-white">
                  Synchronize your chart of accounts &amp; reconciliation cadence
                </h1>
                <p className="mt-2 text-sm text-zinc-700 dark:text-[#a1a1aa]">
                  Select your enterprise resource planning system to map treasury expense buckets
                  to General Ledger codes and automate multi-currency journal postings.
                </p>

                <div className="mt-6">
                  <div className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]">
                    ERP Platform Connector
                    <InfoTooltip
                      label="ERP Connector"
                      description="Ravfina uses native REST/OData adapters to push reconciled card, wire, and loan entries."
                    />
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(['NetSuite', 'SAP S/4HANA', 'QuickBooks Online'] as ErpProvider[]).map(
                      (provider) => {
                        const selected = config.erpConfig.provider === provider;
                        return (
                          <button
                            key={provider}
                            type="button"
                            onClick={() =>
                              setConfig((prev) => ({
                                ...prev,
                                erpConfig: { ...prev.erpConfig, provider },
                              }))
                            }
                            className={`rounded-lg border p-4 text-left transition-colors ${
                              selected
                                ? 'border-amber-600 bg-amber-50 text-zinc-950 dark:border-[#facc15] dark:bg-[#1a1a12] dark:text-white'
                                : 'border-zinc-300 bg-zinc-50 text-zinc-800 hover:border-zinc-400 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:border-[#2e2e32]'
                            }`}
                          >
                            <div
                              className={`text-sm font-semibold ${
                                selected
                                  ? 'text-amber-800 dark:text-[#facc15]'
                                  : 'text-zinc-950 dark:text-white'
                              }`}
                            >
                              {provider}
                            </div>
                            <div className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
                              {provider === 'NetSuite'
                                ? 'SuiteTalk REST + Multi-Book'
                                : provider === 'SAP S/4HANA'
                                  ? 'OData v4 Journal Entry API'
                                  : 'QBO v3 Chart of Accounts'}
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="erp-cadence"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Reconciliation Sync Cadence
                      <InfoTooltip
                        label="Sync Cadence"
                        description="Real-Time Webhooks push settled transactions within seconds; Hourly Batch groups entries to reduce ERP API call volume."
                      />
                    </label>
                    <select
                      id="erp-cadence"
                      value={config.erpConfig.syncCadence}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          erpConfig: {
                            ...prev.erpConfig,
                            syncCadence: e.target.value as OnboardingConfig['erpConfig']['syncCadence'],
                          },
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 text-sm text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                    >
                      <option value="Real-Time Webhook">Real-Time Webhook</option>
                      <option value="Hourly Batch">Hourly Batch</option>
                      <option value="Daily Close">Daily Close (00:00 UTC)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="erp-fx-tolerance"
                      className="flex items-center text-sm font-medium text-zinc-800 dark:text-[#e4e4e7]"
                    >
                      Auto-Reconcile FX Variance Below ($)
                      <InfoTooltip
                        label="FX Variance Tolerance"
                        description="Rounding differences below this USD threshold are auto-posted to FX Gain/Loss instead of holding for controller review."
                      />
                    </label>
                    <input
                      id="erp-fx-tolerance"
                      type="number"
                      min={0}
                      value={config.erpConfig.autoReconcileFxUnderUsd}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          erpConfig: {
                            ...prev.erpConfig,
                            autoReconcileFxUnderUsd: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center text-sm font-semibold text-zinc-950 dark:text-white">
                      GL Account Mapping Rules
                      <InfoTooltip
                        label="GL Mapping"
                        description="Map Ravfina spend and debt categories directly to your General Ledger account numbers."
                      />
                    </span>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-800 dark:text-[#d4d4d8]">
                      <input
                        type="checkbox"
                        checked={config.erpConfig.costCenterTagging}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            erpConfig: {
                              ...prev.erpConfig,
                              costCenterTagging: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-zinc-400 bg-white accent-amber-600 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:accent-[#facc15]"
                      />
                      Tag Department Cost Centers
                    </label>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-zinc-300 dark:border-[#1d1d1f]">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#88888b]">
                        <tr>
                          <th className="px-3.5 py-2.5 font-medium">Treasury Category</th>
                          <th className="px-3.5 py-2.5 font-medium">GL Code</th>
                          <th className="px-3.5 py-2.5 font-medium">Target Ledger Account</th>
                          <th className="px-3.5 py-2.5 text-right font-medium">Auto-Sync</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-[#1d1d1f]">
                        {config.erpConfig.mappings.map((rule) => (
                          <tr key={rule.id} className="hover:bg-zinc-100 dark:hover:bg-[#161618]">
                            <td className="px-3.5 py-2.5 font-medium text-zinc-950 dark:text-white">
                              {rule.treasuryCategory}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono text-zinc-800 dark:text-[#d4d4d8]">
                              {rule.glCode}
                            </td>
                            <td className="px-3.5 py-2.5 text-zinc-700 dark:text-[#a1a1aa]">{rule.glAccountName}</td>
                            <td className="px-3.5 py-2.5 text-right">
                              <input
                                type="checkbox"
                                aria-label={`Enable auto-sync for ${rule.treasuryCategory}`}
                                checked={rule.autoSync}
                                onChange={() =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    erpConfig: {
                                      ...prev.erpConfig,
                                      mappings: prev.erpConfig.mappings.map((m) =>
                                        m.id === rule.id ? { ...m, autoSync: !m.autoSync } : m,
                                      ),
                                    },
                                  }))
                                }
                                className="h-4 w-4 rounded border-zinc-400 bg-white accent-amber-600 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:accent-[#facc15]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* Stage 5: Final Summary Dashboard & Automated Health Checks */}
            {stage === 5 && (
              <section aria-labelledby="stage5-heading">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-[#facc15]">
                  <Activity className="h-4 w-4" aria-hidden="true" />
                  <span>Stage 5 of 5 · Final Configuration Summary &amp; Health Checks</span>
                </div>
                <h1 id="stage5-heading" className="mt-2 font-display text-2xl font-bold text-zinc-950 dark:text-white">
                  Verify external connectivity before entering Ravfina Treasury
                </h1>
                <p className="mt-2 text-sm text-zinc-700 dark:text-[#a1a1aa]">
                  Review your treasury configuration below and run automated connectivity checks
                  across Plaid, card issuing, ERP sync, and MFA enforcement.
                </p>

                {/* Configuration Summary Grid */}
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
                    <div className="text-xs font-medium text-zinc-600 dark:text-[#88888b]">Entity &amp; Security</div>
                    <div className="mt-1 font-semibold text-zinc-950 dark:text-white">{config.entityName}</div>
                    <div className="mt-1 font-mono text-xs text-zinc-700 dark:text-[#a1a1aa]">
                      EIN {config.ein} · Base {config.baseCurrency} · {config.mfaPolicy}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
                    <div className="text-xs font-medium text-zinc-600 dark:text-[#88888b]">Plaid Linked Liquidity</div>
                    <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-amber-800 dark:text-[#facc15]">
                      {formatCurrency(totalVerifiedLiquidity)}
                    </div>
                    <div className="mt-1 text-xs text-zinc-700 dark:text-[#a1a1aa]">
                      {connectedBanks.length} active corporate account(s)
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
                    <div className="text-xs font-medium text-zinc-600 dark:text-[#88888b]">Card Policy Guardrails</div>
                    <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
                      {formatCurrency(config.cardPolicy.perTransactionLimitUsd)}/tx ·{' '}
                      {formatCurrency(config.cardPolicy.monthlyLimitUsd)}/mo
                    </div>
                    <div className="mt-1 text-xs text-zinc-700 dark:text-[#a1a1aa]">
                      {config.cardPolicy.maxTransactionsPerDay}/day cap ·{' '}
                      {config.cardPolicy.allowedMccCodes.length} MCCs allowlisted
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
                    <div className="text-xs font-medium text-zinc-600 dark:text-[#88888b]">ERP Synchronization</div>
                    <div className="mt-1 font-semibold text-zinc-950 dark:text-white">
                      {config.erpConfig.provider}
                    </div>
                    <div className="mt-1 text-xs text-zinc-700 dark:text-[#a1a1aa]">
                      {config.erpConfig.syncCadence} · FX auto-match &lt;{' '}
                      {formatCurrency(config.erpConfig.autoReconcileFxUnderUsd)}
                    </div>
                  </div>
                </div>

                {/* Automated Health Check Runner */}
                <div className="mt-6 rounded-xl border border-zinc-300 bg-zinc-50 p-5 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
                        Automated Service Connectivity Checks
                      </h2>
                      <p className="text-xs text-zinc-600 dark:text-[#88888b]">
                        All four checks must pass to unlock the live treasury workspace.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isRunningChecks}
                      onClick={runAutomatedHealthChecks}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-amber-500 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60 dark:border-[#facc15]/50 dark:bg-[#1a1a12] dark:text-[#facc15] dark:hover:bg-[#1d1d1f] whitespace-nowrap"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${isRunningChecks ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                      {allChecksPassed
                        ? 'Re-run Health Checks'
                        : isRunningChecks
                          ? 'Verifying Services...'
                          : 'Run Connectivity Checks'}
                    </button>
                  </div>

                  <ul className="mt-4 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-[#1d1d1f] dark:border-[#1d1d1f]">
                    {healthChecks.map((hc) => (
                      <li
                        key={hc.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                      >
                        <div>
                          <div className="font-medium text-zinc-950 dark:text-white">{hc.label}</div>
                          <div className="font-mono text-xs text-zinc-600 dark:text-[#88888b]">
                            {hc.endpoint} · {hc.detail}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                          {hc.status === 'pending' && (
                            <span className="text-zinc-600 dark:text-[#88888b]">Awaiting verification</span>
                          )}
                          {hc.status === 'checking' && (
                            <span className="inline-flex items-center gap-1.5 text-amber-800 dark:text-[#facc15]">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              Testing handshake...
                            </span>
                          )}
                          {hc.status === 'passed' && (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              Healthy ({hc.latencyMs}ms)
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
            </PanelStateTransition>

            {/* Wizard Footer Actions */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-6 dark:border-[#1d1d1f]">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={stage === 1}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 hover:border-zinc-400 hover:text-zinc-950 disabled:opacity-40 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:border-[#2e2e32] dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>

              {stage < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-amber-500/70 bg-[#facc15] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent"
                >
                  Save &amp; Continue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!allChecksPassed}
                  onClick={() => onComplete(config)}
                  className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-ravfina-yellow-gradient border border-amber-500/80 px-6 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:bg-none disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:border-[#1d1d1f] dark:disabled:bg-[#1d1d1f] dark:disabled:text-[#88888b]"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Enter Ravfina Treasury
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
