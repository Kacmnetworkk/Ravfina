import { CheckCircle2, RefreshCw, ShieldCheck, SlidersHorizontal, Zap } from 'lucide-react';
import { useState } from 'react';
import {
  evaluateAutoDrawdownTrigger,
  evaluateCreditUnderwriting,
  formatCurrency,
  type AutoDrawdownRule,
  type ErpProvider,
  type LinkedBankAccount,
  type LoanFacility,
  type UnderwritingSignals,
} from '../../domain/treasury';

interface UnderwritingEnginePanelProps {
  linkedBanks: LinkedBankAccount[];
  erpProvider: ErpProvider;
  monthlyInflowsUsd: number;
  monthlyOpexUsd: number;
  facilities: LoanFacility[];
  usdWalletBalance: number;
  autoDrawdownRule: AutoDrawdownRule;
  onUpdateAutoDrawdownRule: (rule: AutoDrawdownRule) => void;
  onOriginateFacility: (params: {
    facilityType: LoanFacility['type'];
    creditLimit: number;
    aprPct: number;
    termMonths: number;
    monthlyPaymentUsd: number;
    initialDrawUsd: number;
  }) => void;
  onSimulateCashflowDip: (simulatedBalanceUsd: number) => string;
}

export function UnderwritingEnginePanel({
  linkedBanks,
  erpProvider,
  monthlyInflowsUsd,
  monthlyOpexUsd,
  facilities,
  usdWalletBalance,
  autoDrawdownRule,
  onUpdateAutoDrawdownRule,
  onOriginateFacility,
  onSimulateCashflowDip,
}: UnderwritingEnginePanelProps) {
  const [requestedAmount, setRequestedAmount] = useState(750000);
  const [termMonths, setTermMonths] = useState(24);
  const [facilityType, setFacilityType] = useState<LoanFacility['type']>('Term Growth Loan');
  const [drawAtClosing, setDrawAtClosing] = useState(true);
  const [assessmentTimestamp, setAssessmentTimestamp] = useState('Live · Synced 1 min ago');
  const [originatedNotice, setOriginatedNotice] = useState<string | null>(null);
  const [autoDrawNotice, setAutoDrawNotice] = useState<string | null>(null);

  const connectedBanks = linkedBanks.filter((b) => b.connected);
  const linkedBankBalanceUsd = connectedBanks.reduce((sum, b) => sum + b.balanceUsd, 0);
  const existingDebtServiceMonthlyUsd = facilities.reduce(
    (sum, f) => sum + f.nextPaymentAmount,
    0,
  );

  const signals: UnderwritingSignals = {
    linkedBankBalanceUsd,
    connectedBankCount: connectedBanks.length,
    monthlyInflowsUsd,
    monthlyOpexUsd,
    existingDebtServiceMonthlyUsd,
    erpProvider,
    erpMatchedRatioPct: 92,
    arDaysOutstanding: 28,
  };

  const evaluation = evaluateCreditUnderwriting(
    signals,
    requestedAmount,
    termMonths,
    facilityType,
  );

  const selectedAutoFacility =
    facilities.find((f) => f.id === autoDrawdownRule.facilityId) ?? facilities[0];
  const availableCreditOnAutoFacility = selectedAutoFacility
    ? selectedAutoFacility.creditLimit - selectedAutoFacility.principalBalance
    : 0;

  const autoCheck = evaluateAutoDrawdownTrigger(
    autoDrawdownRule,
    usdWalletBalance,
    availableCreditOnAutoFacility,
  );

  const handleRefreshAssessment = () => {
    const nowTime = new Date().toISOString().slice(11, 19);
    setAssessmentTimestamp(`Verified via Plaid & ${erpProvider} at ${nowTime} UTC`);
  };

  const handleOneClickOriginate = () => {
    if (evaluation.decision === 'Amount Exceeds Capacity') return;
    const initialDrawUsd = drawAtClosing
      ? facilityType === 'Revolving Credit'
        ? Math.round(requestedAmount * 0.25)
        : requestedAmount
      : 0;
    onOriginateFacility({
      facilityType,
      creditLimit: requestedAmount,
      aprPct: evaluation.aprPct,
      termMonths,
      monthlyPaymentUsd: evaluation.monthlyPaymentUsd,
      initialDrawUsd,
    });
    setOriginatedNotice(
      `Originated ${formatCurrency(requestedAmount)} ${facilityType} at ${evaluation.aprPct.toFixed(2)}% APR.${initialDrawUsd > 0 ? ` ${formatCurrency(initialDrawUsd)} funded to USD Operating Wallet.` : ''}`,
    );
  };

  const handleTestAutoDip = () => {
    const simulatedDipBalance = Math.max(0, autoDrawdownRule.minCashFloorUsd - 125000);
    const resultMsg = onSimulateCashflowDip(simulatedDipBalance);
    setAutoDrawNotice(resultMsg);
  };

  const sliderMax = Math.max(
    3500000,
    Math.ceil((evaluation.maxApprovedLimitUsd * 1.15) / 50000) * 50000,
  );

  return (
    <div className="space-y-6">
      {/* Automated Underwriting Header + Live Bank & ERP Signals */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-[#facc15]">
              <Zap className="h-4 w-4" aria-hidden="true" />
              <span>Automated Credit Underwriting Engine · Zero Manual Paperwork</span>
            </div>
            <h2 className="mt-1.5 font-display text-lg font-bold text-zinc-950 dark:text-white">
              Real-time risk assessment from connected Plaid banks &amp; {erpProvider}
            </h2>
            <p className="mt-1 font-mono text-xs text-zinc-600 dark:text-[#88888b]">{assessmentTimestamp}</p>
          </div>

          <button
            type="button"
            onClick={handleRefreshAssessment}
            className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:border-zinc-400 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#e4e4e7] dark:hover:border-[#2e2e32] dark:hover:text-white whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
            Refresh Bank &amp; ERP Feed
          </button>
        </div>

        {/* Pulled Telemetry Strip */}
        <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg border border-zinc-300 bg-zinc-50 p-4 sm:grid-cols-4 font-mono tabular-nums dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
          <div>
            <div className="font-sans text-xs text-zinc-600 dark:text-[#88888b]">Plaid Verified Cash</div>
            <div className="mt-0.5 text-sm font-semibold text-zinc-950 dark:text-white">
              {formatCurrency(linkedBankBalanceUsd)}
            </div>
          </div>
          <div>
            <div className="font-sans text-xs text-zinc-600 dark:text-[#88888b]">Monthly Inflows</div>
            <div className="mt-0.5 text-sm font-semibold text-zinc-950 dark:text-white">
              {formatCurrency(monthlyInflowsUsd)}
            </div>
          </div>
          <div>
            <div className="font-sans text-xs text-zinc-600 dark:text-[#88888b]">Cash Runway</div>
            <div className="mt-0.5 text-sm font-semibold text-zinc-950 dark:text-white">
              {evaluation.runwayMonths} months
            </div>
          </div>
          <div>
            <div className="font-sans text-xs text-zinc-600 dark:text-[#88888b]">Underwriting Tier</div>
            <div className="mt-0.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {evaluation.riskTier} ({evaluation.riskScore}/100)
            </div>
          </div>
        </div>

        {/* Dynamic Slider Simulator + Transparent Decision */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Interactive Sliders */}
          <div className="space-y-5 lg:col-span-7">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-white">
              <SlidersHorizontal className="h-4 w-4 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
              <span>Customize Loan Terms</span>
            </div>

            <div>
              <div className="text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">Facility Structure</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  ['Revolving Credit', 'Term Growth Loan', 'Equipment Financing'] as const
                ).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setFacilityType(kind);
                      setOriginatedNotice(null);
                    }}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      facilityType === kind
                        ? 'border-amber-600 bg-amber-50 text-amber-900 dark:border-[#facc15] dark:bg-[#1d1d1f] dark:text-[#facc15]'
                        : 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#a1a1aa] dark:hover:border-[#2e2e32] dark:hover:text-white'
                    }`}
                  >
                    {kind}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="uw-amount-slider" className="font-medium text-zinc-800 dark:text-[#d4d4d8]">
                  Requested Facility Amount
                </label>
                <span className="font-mono text-sm font-semibold tabular-nums text-amber-800 dark:text-[#facc15]">
                  {formatCurrency(requestedAmount)}
                </span>
              </div>
              <input
                id="uw-amount-slider"
                type="range"
                min={50000}
                max={sliderMax}
                step={25000}
                value={requestedAmount}
                onChange={(e) => {
                  setRequestedAmount(Number(e.target.value));
                  setOriginatedNotice(null);
                }}
                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-amber-600 dark:bg-[#1d1d1f] dark:accent-[#facc15]"
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] text-zinc-600 dark:text-[#88888b]">
                <span>$50k</span>
                <span>Pre-Approved Max: {formatCurrency(evaluation.maxApprovedLimitUsd)}</span>
                <span>${(sliderMax / 1000000).toFixed(1)}M</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="uw-term-slider" className="font-medium text-zinc-800 dark:text-[#d4d4d8]">
                  Repayment Term
                </label>
                <span className="font-mono text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
                  {termMonths} months
                </span>
              </div>
              <input
                id="uw-term-slider"
                type="range"
                min={6}
                max={48}
                step={6}
                value={termMonths}
                onChange={(e) => {
                  setTermMonths(Number(e.target.value));
                  setOriginatedNotice(null);
                }}
                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-amber-600 dark:bg-[#1d1d1f] dark:accent-[#facc15]"
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] text-zinc-600 dark:text-[#88888b]">
                <span>6 mo</span>
                <span>24 mo</span>
                <span>48 mo</span>
              </div>
            </div>

            {/* Transparent Ratio Checks */}
            <div className="border-t border-zinc-200 pt-4 dark:border-[#1d1d1f]">
              <div className="text-xs font-semibold text-zinc-800 dark:text-[#d4d4d8]">
                Transparent Underwriting Ratio Audit
              </div>
              <ul className="mt-2.5 space-y-2">
                {evaluation.checks.map((chk) => (
                  <li
                    key={chk.label}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex items-center gap-2 text-zinc-700 dark:text-[#a1a1aa]">
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 ${
                          chk.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-[#ff4d4d]'
                        }`}
                        aria-hidden="true"
                      />
                      {chk.label}
                    </span>
                    <span className="font-mono tabular-nums text-zinc-950 dark:text-white">{chk.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: Instant Decision & One-Click Origination */}
          <div className="flex flex-col justify-between rounded-xl border border-zinc-300 bg-zinc-50 p-5 lg:col-span-5 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600 dark:text-[#88888b]">Underwriting Decision</span>
                <span
                  className={`text-xs font-semibold ${
                    evaluation.decision === 'Instant Approval'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : evaluation.decision === 'Conditional Review'
                        ? 'text-amber-800 dark:text-[#facc15]'
                        : 'text-red-700 dark:text-[#ff4d4d]'
                  }`}
                >
                  {evaluation.decision}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 border-y border-zinc-200 py-4 font-mono tabular-nums dark:border-[#1d1d1f]">
                <div>
                  <div className="font-sans text-xs text-zinc-600 dark:text-[#88888b]">Offered APR</div>
                  <div className="mt-0.5 text-xl font-semibold text-amber-800 dark:text-[#facc15]">
                    {evaluation.aprPct.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="font-sans text-xs text-zinc-600 dark:text-[#88888b]">Est. Monthly Payment</div>
                  <div className="mt-0.5 text-xl font-semibold text-zinc-950 dark:text-white">
                    {formatCurrency(evaluation.monthlyPaymentUsd)}
                  </div>
                </div>
                <div>
                  <div className="font-sans text-xs text-zinc-600 dark:text-[#88888b]">Total Interest</div>
                  <div className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-[#d4d4d8]">
                    {formatCurrency(evaluation.totalInterestUsd)}
                  </div>
                </div>
                <div>
                  <div className="font-sans text-xs text-zinc-600 dark:text-[#88888b]">Projected DSCR</div>
                  <div className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-[#d4d4d8]">
                    {evaluation.dscr.toFixed(2)}x
                  </div>
                </div>
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-zinc-800 dark:text-[#d4d4d8]">
                <input
                  type="checkbox"
                  checked={drawAtClosing}
                  onChange={(e) => setDrawAtClosing(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-400 bg-white accent-amber-600 dark:border-[#2e2e32] dark:bg-[#111112] dark:accent-[#facc15]"
                />
                Fund initial working capital to USD Wallet upon origination
              </label>

              {originatedNotice && (
                <div
                  role="status"
                  className="mt-4 rounded-lg border border-emerald-400 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  {originatedNotice}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={evaluation.decision === 'Amount Exceeds Capacity'}
              onClick={handleOneClickOriginate}
              className="ravfina-interactive-btn ravfina-focus-ring mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#fde047] disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-500 dark:border-transparent dark:disabled:border-[#1d1d1f] dark:disabled:bg-[#1d1d1f] dark:disabled:text-[#88888b]"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {evaluation.decision === 'Amount Exceeds Capacity'
                ? `Reduce Request Below ${formatCurrency(evaluation.maxApprovedLimitUsd)}`
                : 'Accept Terms & Originate Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Automatic Cash-Flow Drawdown Safety Net */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
              Automatic Working-Capital Drawdown Protection
            </h3>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-[#88888b]">
              Automatically replenish your USD Operating Wallet whenever cash drops below your
              configured payroll and vendor floor.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoDrawdownRule.enabled}
            onClick={() =>
              onUpdateAutoDrawdownRule({
                ...autoDrawdownRule,
                enabled: !autoDrawdownRule.enabled,
              })
            }
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
              autoDrawdownRule.enabled
                ? 'border border-amber-500/70 bg-[#facc15] text-black dark:border-transparent'
                : 'border border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#a1a1aa]'
            }`}
          >
            {autoDrawdownRule.enabled ? 'Auto-Drawdown Active' : 'Auto-Drawdown Paused'}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="auto-facility" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
              Source Credit Facility
            </label>
            <select
              id="auto-facility"
              value={autoDrawdownRule.facilityId}
              onChange={(e) =>
                onUpdateAutoDrawdownRule({ ...autoDrawdownRule, facilityId: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({formatCurrency(f.creditLimit - f.principalBalance)} avail)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="auto-floor" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
              Minimum USD Cash Floor ($)
            </label>
            <input
              id="auto-floor"
              type="number"
              step={25000}
              min={50000}
              value={autoDrawdownRule.minCashFloorUsd}
              onChange={(e) =>
                onUpdateAutoDrawdownRule({
                  ...autoDrawdownRule,
                  minCashFloorUsd: Number(e.target.value) || 0,
                })
              }
              className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 font-mono text-xs tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
            />
          </div>

          <div>
            <label htmlFor="auto-replenish" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
              Auto-Draw Replenishment ($)
            </label>
            <input
              id="auto-replenish"
              type="number"
              step={25000}
              min={10000}
              value={autoDrawdownRule.replenishAmountUsd}
              onChange={(e) =>
                onUpdateAutoDrawdownRule({
                  ...autoDrawdownRule,
                  replenishAmountUsd: Number(e.target.value) || 0,
                })
              }
              className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 font-mono text-xs tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
          <div className="text-xs text-zinc-800 dark:text-[#d4d4d8]">
            <span className="font-medium text-zinc-950 dark:text-white">Live Status:</span> {autoCheck.reason}
          </div>
          <button
            type="button"
            disabled={!autoDrawdownRule.enabled}
            onClick={handleTestAutoDip}
            className="rounded-lg border border-zinc-400 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:border-amber-600 hover:text-amber-800 disabled:opacity-50 dark:border-[#2e2e32] dark:bg-[#111112] dark:text-white dark:hover:border-[#facc15] dark:hover:text-[#facc15] whitespace-nowrap"
          >
            Simulate Cash-Flow Dip
          </button>
        </div>

        {autoDrawNotice && (
          <div
            role="status"
            className="mt-3 rounded-lg border border-emerald-400 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            {autoDrawNotice}
          </div>
        )}
      </div>
    </div>
  );
}
