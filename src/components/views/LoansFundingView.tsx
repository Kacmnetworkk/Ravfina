import { Landmark } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  formatCurrency,
  generateAmortizationSchedule,
  type AutoDrawdownRule,
  type ErpProvider,
  type LinkedBankAccount,
  type LoanFacility,
} from '../../domain/treasury';
import { SolanaLendingPanel } from './SolanaLendingPanel';
import { UnderwritingEnginePanel } from './UnderwritingEnginePanel';

interface LoansFundingViewProps {
  facilities: LoanFacility[];
  usdWalletBalance: number;
  linkedBanks: LinkedBankAccount[];
  erpProvider: ErpProvider;
  monthlyInflowsUsd: number;
  monthlyOpexUsd: number;
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
  onDrawdown: (facilityId: string, amountUsd: number) => { ok: true } | { ok: false; error: string };
  onRepay: (facilityId: string, amountUsd: number) => { ok: true } | { ok: false; error: string };
}

export function LoansFundingView({
  facilities,
  usdWalletBalance,
  linkedBanks,
  erpProvider,
  monthlyInflowsUsd,
  monthlyOpexUsd,
  autoDrawdownRule,
  onUpdateAutoDrawdownRule,
  onOriginateFacility,
  onSimulateCashflowDip,
  onDrawdown,
  onRepay,
}: LoansFundingViewProps) {
  const [activeTab, setActiveTab] = useState<'underwriting' | 'facilities' | 'solana'>('underwriting');
  const [selectedFacilityId, setSelectedFacilityId] = useState(facilities[0]?.id ?? '');
  const [actionMode, setActionMode] = useState<'drawdown' | 'repay'>('drawdown');
  const [amountInput, setAmountInput] = useState('50000');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const totalCreditLimit = facilities.reduce((sum, f) => sum + f.creditLimit, 0);
  const totalDrawn = facilities.reduce((sum, f) => sum + f.principalBalance, 0);
  const totalAvailable = totalCreditLimit - totalDrawn;

  const activeFacility =
    facilities.find((f) => f.id === selectedFacilityId) ?? facilities[0];

  const schedule = activeFacility
    ? generateAmortizationSchedule(
        activeFacility.principalBalance,
        activeFacility.aprPct,
        Math.min(12, activeFacility.termMonths),
      )
    : [];

  const handleActionSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!activeFacility) return;
    const amt = Number(amountInput) || 0;
    const res =
      actionMode === 'drawdown'
        ? onDrawdown(activeFacility.id, amt)
        : onRepay(activeFacility.id, amt);

    if (res.ok) {
      setFeedback({
        type: 'ok',
        text:
          actionMode === 'drawdown'
            ? `Credited ${formatCurrency(amt)} from ${activeFacility.name} to USD Operating Wallet.`
            : `Applied ${formatCurrency(amt)} principal payment to ${activeFacility.name}.`,
      });
    } else {
      setFeedback({ type: 'err', text: res.error });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white p-1 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <button
            type="button"
            onClick={() => setActiveTab('underwriting')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'underwriting'
                ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-[#88888b] dark:hover:text-white'
            }`}
          >
            Instant Underwriting &amp; Auto-Drawdown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('facilities')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'facilities'
                ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-[#88888b] dark:hover:text-white'
            }`}
          >
            Active Facilities &amp; Amortization ({facilities.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('solana')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'solana'
                ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-[#88888b] dark:hover:text-white'
            }`}
          >
            Solana Settlement (Devnet)
          </button>
        </div>
      </div>

      {/* Funding KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
            Total Committed Credit
          </div>
          <div className="mt-2 font-mono text-2xl font-light tabular-nums text-zinc-950 dark:text-white">
            {formatCurrency(totalCreditLimit)}
          </div>
          <div className="mt-1.5 text-xs text-zinc-600 dark:text-[#88888b]">Across {facilities.length} active facilities</div>
        </div>
        <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
            Outstanding Principal
          </div>
          <div className="mt-2 font-mono text-2xl font-light tabular-nums text-zinc-950 dark:text-white">
            {formatCurrency(totalDrawn)}
          </div>
          <div className="mt-1.5 font-mono text-xs tabular-nums text-zinc-600 dark:text-[#88888b]">
            {((totalDrawn / (totalCreditLimit || 1)) * 100).toFixed(1)}% utilization
          </div>
        </div>
        <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
            Available Undrawn Capacity
          </div>
          <div className="mt-2 font-mono text-2xl font-light tabular-nums text-amber-800 dark:text-[#facc15]">
            {formatCurrency(totalAvailable)}
          </div>
          <div className="mt-1.5 text-xs text-zinc-600 dark:text-[#88888b]">
            USD Operating Wallet: <span className="font-mono text-zinc-800 dark:text-[#d4d4d8]">{formatCurrency(usdWalletBalance)}</span>
          </div>
        </div>
      </div>

      {activeTab === 'underwriting' ? (
        <UnderwritingEnginePanel
          linkedBanks={linkedBanks}
          erpProvider={erpProvider}
          monthlyInflowsUsd={monthlyInflowsUsd}
          monthlyOpexUsd={monthlyOpexUsd}
          facilities={facilities}
          usdWalletBalance={usdWalletBalance}
          autoDrawdownRule={autoDrawdownRule}
          onUpdateAutoDrawdownRule={onUpdateAutoDrawdownRule}
          onOriginateFacility={onOriginateFacility}
          onSimulateCashflowDip={onSimulateCashflowDip}
        />
      ) : activeTab === 'solana' ? (
        <SolanaLendingPanel facilities={facilities} />
      ) : (
        <>
          {/* Facilities List + Drawdown/Repay Form */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              {facilities.map((fac) => {
                const utilizationPct = Math.round((fac.principalBalance / fac.creditLimit) * 100);
                const isSelected = fac.id === activeFacility?.id;
                return (
                  <div
                    key={fac.id}
                    className={`rounded-xl border bg-white p-5 transition-colors dark:bg-[#111112] ${
                      isSelected ? 'border-amber-600 dark:border-[#facc15]' : 'border-zinc-300 dark:border-[#1d1d1f]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-[#88888b]">
                          <Landmark className="h-3.5 w-3.5 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
                          <span>{fac.type}</span>
                          <span>·</span>
                          <span className="font-mono text-zinc-800 dark:text-[#d4d4d8]">{fac.aprPct.toFixed(2)}% APR</span>
                        </div>
                        <h3 className="mt-1 font-display text-base font-semibold text-zinc-950 dark:text-white">
                          {fac.name}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFacilityId(fac.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                          isSelected
                            ? 'border border-amber-500/70 bg-[#facc15] text-black dark:border-transparent'
                            : 'border border-zinc-300 bg-zinc-50 text-zinc-800 hover:border-zinc-400 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:border-[#2e2e32] dark:hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Manage Facility'}
                      </button>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between font-mono text-xs tabular-nums text-zinc-700 dark:text-[#a1a1aa]">
                        <span>Drawn: {formatCurrency(fac.principalBalance)}</span>
                        <span>Limit: {formatCurrency(fac.creditLimit)}</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-[#1d1d1f]">
                        <div
                          className="h-full bg-[#facc15]"
                          style={{ width: `${Math.min(100, utilizationPct)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 text-xs text-zinc-600 dark:border-[#1d1d1f] dark:text-[#88888b]">
                      <span>
                        Next scheduled payment:{' '}
                        <span className="font-mono text-zinc-800 dark:text-[#d4d4d8]">{fac.nextPaymentDate}</span>
                      </span>
                      <span className="font-mono font-medium tabular-nums text-zinc-950 dark:text-white">
                        {formatCurrency(fac.nextPaymentAmount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawdown & Repayment Desk */}
            <div className="rounded-xl border border-zinc-300 bg-white p-6 lg:col-span-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
              <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
                Capital Drawdown &amp; Repayment
              </h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
                Target facility: <span className="font-medium text-zinc-950 dark:text-white">{activeFacility?.name}</span>
              </p>

              <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-zinc-300 bg-zinc-50 p-1 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
                <button
                  type="button"
                  onClick={() => {
                    setActionMode('drawdown');
                    setFeedback(null);
                  }}
                  className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                    actionMode === 'drawdown'
                      ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                      : 'text-zinc-600 hover:text-zinc-950 dark:text-[#88888b] dark:hover:text-white'
                  }`}
                >
                  Draw Funds
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionMode('repay');
                    setFeedback(null);
                  }}
                  className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                    actionMode === 'repay'
                      ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                      : 'text-zinc-600 hover:text-zinc-950 dark:text-[#88888b] dark:hover:text-white'
                  }`}
                >
                  Repay Principal
                </button>
              </div>

              <form onSubmit={handleActionSubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="loan-amount" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
                    {actionMode === 'drawdown' ? 'Drawdown Amount (USD)' : 'Principal Repayment (USD)'}
                  </label>
                  <input
                    id="loan-amount"
                    type="number"
                    min={1}
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                  />
                </div>

                {activeFacility && (
                  <div className="space-y-1.5 rounded-lg border border-zinc-300 bg-zinc-50 p-3 text-xs dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-[#88888b]">Available Credit</span>
                      <span className="font-mono font-medium tabular-nums text-amber-800 dark:text-[#facc15]">
                        {formatCurrency(activeFacility.creditLimit - activeFacility.principalBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-[#88888b]">Current Principal</span>
                      <span className="font-mono font-medium tabular-nums text-zinc-950 dark:text-white">
                        {formatCurrency(activeFacility.principalBalance)}
                      </span>
                    </div>
                  </div>
                )}

                {feedback && (
                  <div
                    role="status"
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      feedback.type === 'ok'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-red-300 bg-red-50 text-red-700 dark:border-[#ff4d4d]/40 dark:bg-[#ff4d4d]/10 dark:text-[#ff4d4d]'
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[42px] w-full items-center justify-center rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent"
                >
                  {actionMode === 'drawdown' ? 'Execute Credit Drawdown' : 'Submit Principal Payment'}
                </button>
              </form>
            </div>
          </div>

          {/* Amortization Schedule */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
                12-Month Projected Amortization Schedule — {activeFacility?.name}
              </h2>
              <span className="font-mono text-xs tabular-nums text-zinc-600 dark:text-[#88888b]">
                {activeFacility?.aprPct.toFixed(2)}% APR · Monthly Principal + Interest
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-300 text-xs text-zinc-600 dark:border-[#1d1d1f] dark:text-[#88888b]">
                  <tr>
                    <th className="py-2.5 pr-4 font-medium">Installment</th>
                    <th className="py-2.5 pr-4 text-right font-medium">Scheduled Payment</th>
                    <th className="py-2.5 pr-4 text-right font-medium">Principal</th>
                    <th className="py-2.5 pr-4 text-right font-medium">Interest</th>
                    <th className="py-2.5 text-right font-medium">Remaining Principal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono text-xs tabular-nums dark:divide-[#1d1d1f]">
                  {schedule.slice(0, 6).map((row) => (
                    <tr key={row.month} className="hover:bg-zinc-100 dark:hover:bg-[#161618]">
                      <td className="py-2.5 pr-4 text-zinc-800 dark:text-[#d4d4d8]">Month {row.month}</td>
                      <td className="py-2.5 pr-4 text-right font-medium text-zinc-950 dark:text-white">
                        {formatCurrency(row.payment)}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(row.principalPaid)}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-zinc-700 dark:text-[#a1a1aa]">
                        {formatCurrency(row.interestPaid)}
                      </td>
                      <td className="py-2.5 text-right text-zinc-950 dark:text-white">
                        {formatCurrency(row.remainingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
