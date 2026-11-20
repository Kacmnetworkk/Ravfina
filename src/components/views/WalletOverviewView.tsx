import { ArrowRightLeft, TrendingUp } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  FX_RATES_TO_USD,
  calculatePortfolioSummary,
  calculateTotalLiquidityUsd,
  convertCurrency,
  formatCurrency,
  type AuditActivityItem,
  type CurrencyCode,
  type FxTransaction,
  type MonthlyCashflowPoint,
  type PortfolioHolding,
  type WalletAccount,
} from '../../domain/treasury';
import { CashflowChart, PortfolioAllocationChart } from '../Charts';
import { HoloCard } from '../HoloCard';
import { RecentActivityPanel } from '../RecentActivityPanel';
import type { WorkspaceSection } from '../TreasuryWorkspace';

interface WalletOverviewViewProps {
  wallets: WalletAccount[];
  holdings: PortfolioHolding[];
  cashflow: MonthlyCashflowPoint[];
  transactions: FxTransaction[];
  auditActivities: AuditActivityItem[];
  liveStreamEnabled: boolean;
  onToggleLiveStream: () => void;
  onNavigateSection: (section: WorkspaceSection) => void;
  onConvertWalletFx: (
    from: CurrencyCode,
    to: CurrencyCode,
    amount: number,
  ) => { ok: true; creditedAmount: number } | { ok: false; error: string };
}

export function WalletOverviewView({
  wallets,
  holdings,
  cashflow,
  transactions,
  auditActivities,
  liveStreamEnabled,
  onToggleLiveStream,
  onNavigateSection,
  onConvertWalletFx,
}: WalletOverviewViewProps) {
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('USD');
  const [toCurrency, setToCurrency] = useState<CurrencyCode>('EUR');
  const [convertAmount, setConvertAmount] = useState('25000');
  const [fxFeedback, setFxFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');

  const totalLiquidityUsd = calculateTotalLiquidityUsd(wallets);
  const portfolioSummary = calculatePortfolioSummary(holdings);
  const combinedTreasuryUsd = totalLiquidityUsd + portfolioSummary.totalUsd;

  const parsedAmount = Number(convertAmount) || 0;
  const previewConverted =
    parsedAmount > 0 && fromCurrency !== toCurrency
      ? convertCurrency(parsedAmount, fromCurrency, toCurrency)
      : 0;

  const handleFxSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = onConvertWalletFx(fromCurrency, toCurrency, parsedAmount);
    if (res.ok) {
      setFxFeedback({
        type: 'ok',
        text: `Converted ${formatCurrency(parsedAmount, fromCurrency)} → ${formatCurrency(res.creditedAmount, toCurrency)} at interbank rate.`,
      });
    } else {
      setFxFeedback({ type: 'err', text: res.error });
    }
  };

  const filteredTx = transactions.filter((tx) => {
    const matchesCurrency =
      currencyFilter === 'ALL' || tx.originalCurrency === currencyFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCurrency && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HoloCard variant="dashboard" intensity="subtle" className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
            Total Treasury Assets
          </div>
          <div className="mt-2 font-mono text-2xl font-light tabular-nums text-zinc-950 dark:text-white">
            {formatCurrency(combinedTreasuryUsd)}
          </div>
          <div className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-400">Operating + Investment Portfolio</div>
        </HoloCard>
        <HoloCard variant="dashboard" intensity="subtle" className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
            Multi-Currency Operating Cash
          </div>
          <div className="mt-2 font-mono text-2xl font-light tabular-nums text-zinc-950 dark:text-white">
            {formatCurrency(totalLiquidityUsd)}
          </div>
          <div className="mt-1.5 text-xs text-zinc-600 dark:text-[#88888b]">Across {wallets.length} active currencies</div>
        </HoloCard>
        <HoloCard variant="dashboard" intensity="subtle" className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
            Invested T-Bills &amp; MMF
          </div>
          <div className="mt-2 font-mono text-2xl font-light tabular-nums text-zinc-950 dark:text-white">
            {formatCurrency(portfolioSummary.totalUsd)}
          </div>
          <div className="mt-1.5 flex items-center gap-1 font-mono text-xs font-medium tabular-nums text-amber-800 dark:text-[#facc15]">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            {portfolioSummary.weightedApyPct.toFixed(2)}% Weighted APY
          </div>
        </HoloCard>
        <HoloCard variant="dashboard" intensity="subtle" className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
            Nov Operating Burn
          </div>
          <div className="mt-2 font-mono text-2xl font-light tabular-nums text-zinc-950 dark:text-white">
            {formatCurrency(cashflow[cashflow.length - 1]?.opexUsd ?? 0)}
          </div>
          <div className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-400">Net inflow +$698,000 MoM</div>
        </HoloCard>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-zinc-300 bg-white p-6 lg:col-span-7 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
            Inflows, Operational Expenses &amp; Treasury Yield
          </h2>
          <div className="mt-4">
            <CashflowChart data={cashflow} />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-300 bg-white p-6 lg:col-span-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
            Investment Portfolio Allocation
          </h2>
          <div className="mt-4">
            <PortfolioAllocationChart holdings={holdings} />
          </div>
        </div>
      </div>

      {/* Real-Time Recent Activity Audit Feed */}
      <RecentActivityPanel
        activities={auditActivities}
        liveStreamEnabled={liveStreamEnabled}
        onToggleLiveStream={onToggleLiveStream}
        onNavigateSection={onNavigateSection}
      />

      {/* Multi-Currency Wallets + FX Rebalance Tool */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-zinc-300 bg-white p-6 lg:col-span-7 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
            Real-Time Digital Currency Wallets
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-300 text-xs text-zinc-600 dark:border-[#1d1d1f] dark:text-[#88888b]">
                <tr>
                  <th className="py-2.5 pr-4 font-medium">Wallet</th>
                  <th className="py-2.5 pr-4 font-medium">Account</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Native Balance</th>
                  <th className="py-2.5 text-right font-medium">USD Equivalent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-[#1d1d1f]">
                {wallets.map((w) => (
                  <tr key={w.id} className="hover:bg-zinc-100 dark:hover:bg-[#161618]">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-zinc-950 dark:text-white">{w.label}</div>
                      <div className="text-xs text-zinc-600 dark:text-[#88888b]">
                        {w.currency} · {w.yieldApr.toFixed(2)}% APR
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-zinc-700 dark:text-[#a1a1aa]">
                      {w.ibanOrAccount}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono font-medium tabular-nums text-zinc-950 dark:text-white">
                      {formatCurrency(w.balance, w.currency)}
                    </td>
                    <td className="py-3 text-right font-mono font-medium tabular-nums text-amber-800 dark:text-[#facc15]">
                      {formatCurrency(w.balance * FX_RATES_TO_USD[w.currency])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live FX Conversion Desk */}
        <div className="rounded-xl border border-zinc-300 bg-white p-6 lg:col-span-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
              Instant Treasury FX Rebalance
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
            Convert liquidity between operating wallets at locked interbank spot rates.
          </p>

          <form onSubmit={handleFxSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="fx-from" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
                  From Wallet
                </label>
                <select
                  id="fx-from"
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value as CurrencyCode)}
                  className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.currency}>
                      {w.currency}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="fx-to" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
                  To Wallet
                </label>
                <select
                  id="fx-to"
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value as CurrencyCode)}
                  className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
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
              <label htmlFor="fx-amount" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
                Source Amount ({fromCurrency})
              </label>
              <input
                id="fx-amount"
                type="number"
                min={1}
                step="any"
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-xs dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
              <span className="text-zinc-600 dark:text-[#88888b]">Estimated Settlement</span>
              <span className="font-mono font-semibold tabular-nums text-amber-800 dark:text-[#facc15]">
                {formatCurrency(previewConverted, toCurrency)}
              </span>
            </div>

            {fxFeedback && (
              <div
                role="status"
                className={`rounded-lg border px-3 py-2 text-xs ${
                  fxFeedback.type === 'ok'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-red-300 bg-red-50 text-red-700 dark:border-[#ff4d4d]/40 dark:bg-[#ff4d4d]/10 dark:text-[#ff4d4d]'
                }`}
              >
                {fxFeedback.text}
              </div>
            )}

            <button
              type="submit"
              className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[42px] w-full items-center justify-center rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent"
            >
              Execute FX Transfer
            </button>
          </form>
        </div>
      </div>

      {/* Recent International Ledger */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
            Recent Cross-Border Ledger Activity
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="ledger-search" className="sr-only">
              Search merchant or department
            </label>
            <input
              id="ledger-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter merchant or team..."
              className="w-56 rounded-lg border border-zinc-400 bg-white px-3 py-1.5 text-xs text-zinc-950 placeholder:text-zinc-500 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:placeholder:text-[#88888b] dark:focus:border-[#facc15]"
            />
            <select
              aria-label="Filter by currency"
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="rounded-lg border border-zinc-400 bg-white px-3 py-1.5 text-xs text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
            >
              <option value="ALL">All Currencies</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="CAD">CAD</option>
            </select>
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-600 dark:text-[#88888b]">
            No ledger entries match your current filter.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-300 text-xs text-zinc-600 dark:border-[#1d1d1f] dark:text-[#88888b]">
                <tr>
                  <th className="py-2.5 pr-4 font-medium">Merchant</th>
                  <th className="py-2.5 pr-4 font-medium">Department</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Original</th>
                  <th className="py-2.5 pr-4 text-right font-medium">USD Settled</th>
                  <th className="py-2.5 text-right font-medium">ERP Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-[#1d1d1f]">
                {filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-100 dark:hover:bg-[#161618]">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-zinc-950 dark:text-white">{tx.merchant}</div>
                      <div className="font-mono text-xs text-zinc-600 dark:text-[#88888b]">{tx.timestamp}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-zinc-700 dark:text-[#a1a1aa]">{tx.department}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-zinc-800 dark:text-[#d4d4d8]">
                      {formatCurrency(tx.originalAmount, tx.originalCurrency)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono font-medium tabular-nums text-zinc-950 dark:text-white">
                      {formatCurrency(tx.usdEquivalent)}
                    </td>
                    <td className="py-2.5 text-right text-xs font-medium">
                      <span
                        className={
                          tx.reconciliationStatus === 'Matched'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : tx.reconciliationStatus === 'Variance Flagged'
                              ? 'text-red-700 dark:text-[#ff4d4d]'
                              : 'text-amber-800 dark:text-[#facc15]'
                        }
                      >
                        {tx.reconciliationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
