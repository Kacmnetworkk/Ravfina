import { CheckCircle2, Globe2 } from 'lucide-react';
import { useState } from 'react';
import {
  formatCurrency,
  type ErpProvider,
  type FxTransaction,
} from '../../domain/treasury';

interface FxReconciliationViewProps {
  transactions: FxTransaction[];
  erpProvider: ErpProvider;
  onReconcileOne: (txId: string) => void;
  onReconcileAllPending: () => void;
}

export function FxReconciliationView({
  transactions,
  erpProvider,
  onReconcileOne,
  onReconcileAllPending,
}: FxReconciliationViewProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | FxTransaction['reconciliationStatus']>('All');

  const pendingCount = transactions.filter((t) => t.reconciliationStatus !== 'Matched').length;
  const totalVariance = transactions.reduce((sum, t) => sum + t.fxVarianceUsd, 0);
  const totalUsdSettled = transactions.reduce((sum, t) => sum + t.usdEquivalent, 0);

  const visibleRows = transactions.filter(
    (t) => statusFilter === 'All' || t.reconciliationStatus === statusFilter,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
            Cross-Border Volume (MTD)
          </div>
          <div className="mt-2 font-mono text-2xl font-light tabular-nums text-zinc-950 dark:text-white">
            {formatCurrency(totalUsdSettled)}
          </div>
          <div className="mt-1.5 text-xs text-zinc-600 dark:text-[#88888b]">EUR, GBP, JPY &amp; CAD settlements</div>
        </div>
        <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
            Unreconciled FX Variance
          </div>
          <div className="mt-2 font-mono text-2xl font-light tabular-nums text-zinc-950 dark:text-white">
            {formatCurrency(totalVariance)}
          </div>
          <div className="mt-1.5 text-xs text-zinc-600 dark:text-[#88888b]">Auto-posted to GL 7910 on match</div>
        </div>
        <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
            Pending ERP Queue ({erpProvider})
          </div>
          <div className="mt-2 font-mono text-2xl font-light tabular-nums text-amber-800 dark:text-[#facc15]">
            {pendingCount}
          </div>
          <div className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            {pendingCount === 0 ? 'All international entries matched' : 'Ready for ledger push'}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
              Multi-Currency Reconciliation Ledger
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-50 p-1 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
              {(['All', 'Matched', 'Pending Review', 'Variance Flagged'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === tab
                      ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                      : 'text-zinc-600 hover:text-zinc-950 dark:text-[#88888b] dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={pendingCount === 0}
              onClick={onReconcileAllPending}
              className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-500 dark:border-transparent dark:disabled:border-[#1d1d1f] dark:disabled:bg-[#1d1d1f] dark:disabled:text-[#88888b] whitespace-nowrap"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Reconcile All Pending ({pendingCount})
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-300 text-xs text-zinc-600 dark:border-[#1d1d1f] dark:text-[#88888b]">
              <tr>
                <th className="py-2.5 pr-4 font-medium">Merchant &amp; GL</th>
                <th className="py-2.5 pr-4 text-right font-medium">Original</th>
                <th className="py-2.5 pr-4 text-right font-medium">Locked FX</th>
                <th className="py-2.5 pr-4 text-right font-medium">USD Equivalent</th>
                <th className="py-2.5 pr-4 text-right font-medium">FX Variance</th>
                <th className="py-2.5 pr-4 font-medium">Status</th>
                <th className="py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-[#1d1d1f]">
              {visibleRows.map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-100 dark:hover:bg-[#161618]">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-zinc-950 dark:text-white">{tx.merchant}</div>
                    <div className="font-mono text-xs text-zinc-600 dark:text-[#88888b]">
                      GL {tx.erpAccountCode} · {tx.department}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono tabular-nums text-zinc-800 dark:text-[#d4d4d8]">
                    {formatCurrency(tx.originalAmount, tx.originalCurrency)}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums text-zinc-600 dark:text-[#88888b]">
                    {tx.lockedRateToUsd.toFixed(5)}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono font-medium tabular-nums text-zinc-950 dark:text-white">
                    {formatCurrency(tx.usdEquivalent)}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums text-zinc-800 dark:text-[#d4d4d8]">
                    {formatCurrency(tx.fxVarianceUsd)}
                  </td>
                  <td className="py-3 pr-4 text-xs font-semibold">
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
                  <td className="py-3 text-right">
                    {tx.reconciliationStatus === 'Matched' ? (
                      <span className="text-xs text-zinc-600 dark:text-[#88888b]">Synced</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onReconcileOne(tx.id)}
                        aria-label={`Reconcile transaction for ${tx.merchant}`}
                        className="rounded-md border border-zinc-400 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-950 hover:border-amber-600 hover:text-amber-800 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white dark:hover:border-[#facc15] dark:hover:text-[#facc15] whitespace-nowrap"
                      >
                        Push to {erpProvider}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
