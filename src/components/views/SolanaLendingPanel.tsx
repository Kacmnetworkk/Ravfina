import {
  CircleDollarSign,
  ClipboardList,
  Coins,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { LoanFacility } from '../../domain/treasury';
import { useRavfiaLending } from '../../hooks/useRavfiaLending';
import {
  LENDER_WALLET,
  LOAN_SERVICING_PROGRAM_ID,
  RAVFIA_COIN_NAME,
  RAVFIA_COIN_SYMBOL,
  RUSD_LOAN_SERVICING_PROGRAM_ID,
  RUSD_MINT,
  TOKEN_IMAGE_URI,
  mapFacilitiesToLendingSummary,
  planDisbursement,
  type DisbursementPlan,
} from '../../lib/ravfia-lending';

interface SolanaLendingPanelProps {
  facilities: LoanFacility[];
}

function AddressRow({
  label,
  address,
  explorerHref,
}: {
  label: string;
  address: string;
  explorerHref: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="text-xs text-zinc-600 dark:text-[#88888b]">{label}</span>
      <a
        href={explorerHref}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-zinc-800 hover:text-amber-800 dark:text-[#d4d4d8] dark:hover:text-[#facc15]"
      >
        <span className="break-all">{address}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </a>
    </div>
  );
}

export function SolanaLendingPanel({ facilities }: SolanaLendingPanelProps) {
  const { status, loading, error, refresh } = useRavfiaLending(20_000);
  const summary = useMemo(
    () => mapFacilitiesToLendingSummary(facilities),
    [facilities],
  );

  // Session samples of the RUSD/RVCN total supply, one per successful
  // poll (every 20s while this tab is open), newest last, capped at 30.
  // When the devnet activity script runs its mint/burn cycles, the
  // sparkline in the supply card moves.
  const [supplySamples, setSupplySamples] = useState<number[]>([]);
  useEffect(() => {
    if (!status) return;
    const value = Number(status.rusdSupply);
    if (!Number.isFinite(value)) return;
    setSupplySamples((prev) => [...prev, value].slice(-30));
  }, [status]);

  const sparklinePoints = useMemo(() => {
    if (supplySamples.length < 2) return null;
    const min = Math.min(...supplySamples);
    const max = Math.max(...supplySamples);
    const range = max - min;
    return supplySamples
      .map((value, i) => {
        const x = (i / (supplySamples.length - 1)) * 100;
        const y = range === 0 ? 14 : 26 - ((value - min) / range) * 24;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [supplySamples]);

  const [borrowerAccount, setBorrowerAccount] = useState('');
  const [amount, setAmount] = useState('100');
  const [plan, setPlan] = useState<DisbursementPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const handlePlanSubmit = (e: FormEvent) => {
    e.preventDefault();
    try {
      const next = planDisbursement({
        borrowerTokenAccount: borrowerAccount,
        amount,
      });
      setPlan(next);
      setPlanError(null);
    } catch (err) {
      setPlan(null);
      setPlanError(
        err instanceof Error ? err.message : 'Could not build the plan.',
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Status + program identity */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-[#88888b]">
              <Coins className="h-3.5 w-3.5 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
              <span>Ravfia Lending · Solana Settlement</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <img
                src={TOKEN_IMAGE_URI}
                alt="Ravfia Coin"
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
                {RAVFIA_COIN_NAME} ({RAVFIA_COIN_SYMBOL}) — Devnet Lending Status
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
              The devnet mint was issued as Ravfia USD (RUSD); its details — mint
              address and 6 decimals — are unchanged. Ravfia Coin is the
              presentation name.
            </p>
            <p className="mt-1 flex items-start gap-1.5 text-xs text-zinc-600 dark:text-[#88888b]">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
              <span>
                Devnet only — no real funds, not audited, no live lending. Ravfia is the lender.
                This panel reads devnet state only; it never signs or sends a transaction.
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition-colors hover:border-zinc-400 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:border-[#2e2e32] dark:hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {error && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-[#ff4d4d]/40 dark:bg-[#ff4d4d]/10 dark:text-[#ff4d4d]"
          >
            Devnet status unavailable: {error}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
              Cluster
            </div>
            <div className="mt-1.5 font-mono text-lg font-light tabular-nums text-zinc-950 dark:text-white">
              {status ? status.cluster : loading ? 'Loading…' : '—'}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
              RUSD Supply
            </div>
            <div className="mt-1.5 font-mono text-lg font-light tabular-nums text-zinc-950 dark:text-white">
              {status ? status.rusdSupply : loading ? 'Loading…' : '—'}
            </div>
            <div className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">RUSD · 6 decimals</div>
            <div className="mt-2">
              {sparklinePoints ? (
                <svg
                  viewBox="0 0 100 28"
                  preserveAspectRatio="none"
                  className="h-7 w-full text-amber-800 dark:text-[#facc15]"
                  aria-hidden="true"
                >
                  <polyline
                    points={sparklinePoints}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              ) : (
                <div className="text-[11px] text-zinc-500 dark:text-[#88888b]">
                  Collecting supply samples…
                </div>
              )}
              <div className="mt-1 text-[11px] text-zinc-500 dark:text-[#88888b]">
                RUSD/RVCN supply samples this session: {supplySamples.length} ·
                polls every 20s
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
              Lender RUSD Balance
            </div>
            <div className="mt-1.5 font-mono text-lg font-light tabular-nums text-amber-800 dark:text-[#facc15]">
              {status ? status.lenderRusd : loading ? 'Loading…' : '—'}
            </div>
            <div className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
              {status
                ? `Across ${status.lenderRusdAccountCount} token account${status.lenderRusdAccountCount === 1 ? '' : 's'}`
                : 'Ravfia wallet, devnet'}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-[#88888b]">
              Lender SOL Balance
            </div>
            <div className="mt-1.5 font-mono text-lg font-light tabular-nums text-zinc-950 dark:text-white">
              {status ? status.lenderSol : loading ? 'Loading…' : '—'}
            </div>
            <div className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">Devnet SOL, for fees only</div>
          </div>
        </div>

        <div className="mt-4 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-[#1d1d1f] dark:border-[#1d1d1f]">
          <AddressRow label="RUSD Mint" address={RUSD_MINT} explorerHref={summary.explorer.rusdMint} />
          <AddressRow
            label="loan_servicing Program (RUSD)"
            address={RUSD_LOAN_SERVICING_PROGRAM_ID}
            explorerHref={summary.explorer.rusdLoanServicingProgram}
          />
          <AddressRow
            label="loan_servicing Program (USDC instance)"
            address={LOAN_SERVICING_PROGRAM_ID}
            explorerHref={summary.explorer.loanServicingProgram}
          />
          <AddressRow
            label="Lender Wallet (Ravfia)"
            address={LENDER_WALLET}
            explorerHref={summary.explorer.lenderWallet}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Facilities in RUSD terms */}
        <div className="rounded-xl border border-zinc-300 bg-white p-6 lg:col-span-7 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
              Facilities in RUSD Terms
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
            Ravfina facilities expressed as Ravfia Lending settlement amounts on devnet.
          </p>
          <div className="mt-4 space-y-1.5 rounded-lg border border-zinc-300 bg-zinc-50 p-3 text-xs dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-[#88888b]">Total Principal (RUSD)</span>
              <span className="font-mono font-medium tabular-nums text-zinc-950 dark:text-white">
                {summary.totalPrincipal} RUSD
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-[#88888b]">Total Credit Limit (RUSD)</span>
              <span className="font-mono font-medium tabular-nums text-amber-800 dark:text-[#facc15]">
                {summary.totalCreditLimit} RUSD
              </span>
            </div>
          </div>
          <div className="mt-4 divide-y divide-zinc-200 dark:divide-[#1d1d1f]">
            {summary.facilities.map((fac) => (
              <div key={fac.facilityId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="text-sm font-medium text-zinc-950 dark:text-white">{fac.facilityName}</div>
                  <div className="text-xs text-zinc-600 dark:text-[#88888b]">
                    {fac.status} · Lender: {fac.lender}
                  </div>
                </div>
                <div className="text-right font-mono text-xs tabular-nums">
                  <div className="text-zinc-950 dark:text-white">{fac.principal} RUSD drawn</div>
                  <div className="text-zinc-600 dark:text-[#88888b]">{fac.creditLimit} RUSD limit</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disbursement planner */}
        <div className="rounded-xl border border-zinc-300 bg-white p-6 lg:col-span-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
              Disbursement Planner
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
            Produces an operator plan only. Signing and submission happen outside this app, on devnet.
          </p>
          <form onSubmit={handlePlanSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="borrower-token-account" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
                Borrower RUSD Token Account
              </label>
              <input
                id="borrower-token-account"
                type="text"
                value={borrowerAccount}
                onChange={(e) => setBorrowerAccount(e.target.value)}
                placeholder="Base58 token account address"
                className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 font-mono text-sm text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
              />
            </div>
            <div>
              <label htmlFor="disbursement-amount" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
                Amount (RUSD)
              </label>
              <input
                id="disbursement-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
              />
            </div>

            {planError && (
              <div
                role="status"
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-[#ff4d4d]/40 dark:bg-[#ff4d4d]/10 dark:text-[#ff4d4d]"
              >
                {planError}
              </div>
            )}

            <button
              type="submit"
              className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[42px] w-full items-center justify-center rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent"
            >
              <CircleDollarSign className="mr-2 h-4 w-4" aria-hidden="true" />
              Plan Disbursement
            </button>
          </form>

          {plan && (
            <div className="mt-4 space-y-3 rounded-lg border border-zinc-300 bg-zinc-50 p-3 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600 dark:text-[#88888b]">Planned Amount</span>
                <span className="font-mono font-medium tabular-nums text-zinc-950 dark:text-white">
                  {plan.amount} RUSD ({plan.amountUnits} units)
                </span>
              </div>
              <ol className="list-decimal space-y-1.5 pl-4 text-xs text-zinc-700 dark:text-[#a1a1aa]">
                {plan.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
