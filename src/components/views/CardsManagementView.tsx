import { CreditCard, Lock, Plus, ShieldAlert, Unlock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { MCC_DIRECTORY } from '../../data/seedTreasury';
import {
  evaluateCardTransaction,
  formatCurrency,
  type CardPolicy,
  type CorporateCard,
} from '../../domain/treasury';
import { HoloCard, HoloCardLayer } from '../HoloCard';

interface CardsManagementViewProps {
  cards: CorporateCard[];
  policy: CardPolicy;
  onIssueCard: (card: Omit<CorporateCard, 'id' | 'last4' | 'spentThisMonthUsd' | 'dailyTxCount' | 'expiry'>) => void;
  onToggleFreeze: (cardId: string) => void;
  onUpdateCardLimit: (cardId: string, newLimitUsd: number) => void;
  onRecordCardTransaction: (params: {
    card: CorporateCard;
    amountUsd: number;
    mccCode: string;
    approved: boolean;
    reason: string;
  }) => void;
}

export function CardsManagementView({
  cards,
  policy,
  onIssueCard,
  onToggleFreeze,
  onUpdateCardLimit,
  onRecordCardTransaction,
}: CardsManagementViewProps) {
  const [kindFilter, setKindFilter] = useState<'All' | 'Physical' | 'Virtual'>('All');
  const [showIssueForm, setShowIssueForm] = useState(false);

  const [holderName, setHolderName] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [kind, setKind] = useState<'Virtual' | 'Physical'>('Virtual');
  const [monthlyLimit, setMonthlyLimit] = useState(String(policy.monthlyLimitUsd));
  const [selectedMccs, setSelectedMccs] = useState<string[]>(policy.allowedMccCodes);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Policy Authorization Simulator
  const [simCardId, setSimCardId] = useState(cards[0]?.id ?? '');
  const [simAmount, setSimAmount] = useState('1250');
  const [simMcc, setSimMcc] = useState('5734');
  const [simResult, setSimResult] = useState<{ approved: boolean; reason: string } | null>(null);

  const filteredCards = cards.filter((c) => kindFilter === 'All' || c.kind === kindFilter);

  const handleIssueSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (holderName.trim().length < 2) {
      setIssueError('Enter cardholder full name.');
      return;
    }
    const parsedLimit = Number(monthlyLimit) || 0;
    if (parsedLimit <= 0 || parsedLimit > policy.monthlyLimitUsd * 4) {
      setIssueError(
        `Monthly limit must be between $1 and ${formatCurrency(policy.monthlyLimitUsd * 4)}.`,
      );
      return;
    }
    if (selectedMccs.length === 0) {
      setIssueError('Select at least one approved MCC.');
      return;
    }
    setIssueError(null);
    onIssueCard({
      holderName: holderName.trim(),
      department,
      kind,
      status: 'Active',
      monthlyLimitUsd: parsedLimit,
      allowedMccCodes: selectedMccs,
    });
    setHolderName('');
    setShowIssueForm(false);
  };

  const handleSimulateAuth = (e: FormEvent) => {
    e.preventDefault();
    const targetCard = cards.find((c) => c.id === simCardId) ?? cards[0];
    if (!targetCard) return;
    const parsedAmount = Number(simAmount) || 0;
    const outcome = evaluateCardTransaction(targetCard, policy, parsedAmount, simMcc);
    setSimResult(outcome);
    onRecordCardTransaction({
      card: targetCard,
      amountUsd: parsedAmount,
      mccCode: simMcc,
      approved: outcome.approved,
      reason: outcome.reason,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]">
        <div>
          <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
            Corporate Card Program ({cards.length} Issued)
          </h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-[#88888b]">
            Global Guardrails: {formatCurrency(policy.perTransactionLimitUsd)}/tx ·{' '}
            {policy.maxTransactionsPerDay} txns/day · {policy.allowedMccCodes.length} MCCs allowed
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-50 p-1 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
            {(['All', 'Virtual', 'Physical'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setKindFilter(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  kindFilter === tab
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
            onClick={() => setShowIssueForm((prev) => !prev)}
            className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {showIssueForm ? 'Close Form' : 'Issue Corporate Card'}
          </button>
        </div>
      </div>

      {/* Issue New Card Drawer */}
      {showIssueForm && (
        <form
          onSubmit={handleIssueSubmit}
          className="rounded-xl border border-zinc-400 bg-white p-6 dark:border-[#2e2e32] dark:bg-[#111112]"
        >
          <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
            Issue New Physical or Virtual Card
          </h3>
          {issueError && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-[#ff4d4d]/40 dark:bg-[#ff4d4d]/10 dark:text-[#ff4d4d]"
            >
              {issueError}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="new-card-holder" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
                Cardholder Name
              </label>
              <input
                id="new-card-holder"
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Jordan Ellis"
                className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:placeholder:text-[#88888b] dark:focus:border-[#facc15]"
              />
            </div>
            <div>
              <label htmlFor="new-card-dept" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
                Department
              </label>
              <select
                id="new-card-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
              >
                <option value="Engineering">Engineering</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Growth Marketing">Growth Marketing</option>
                <option value="Operations">Operations</option>
                <option value="Executive & Finance">Executive &amp; Finance</option>
              </select>
            </div>
            <div>
              <label htmlFor="new-card-kind" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
                Card Format
              </label>
              <select
                id="new-card-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as 'Virtual' | 'Physical')}
                className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
              >
                <option value="Virtual">Virtual (Instant Issue)</option>
                <option value="Physical">Physical Titanium</option>
              </select>
            </div>
            <div>
              <label htmlFor="new-card-limit" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
                Monthly Limit (USD)
              </label>
              <input
                id="new-card-limit"
                type="number"
                min={1}
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">Card MCC Allowlist</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {MCC_DIRECTORY.map((mcc) => {
                const active = selectedMccs.includes(mcc.code);
                return (
                  <button
                    key={mcc.code}
                    type="button"
                    onClick={() =>
                      setSelectedMccs((prev) =>
                        prev.includes(mcc.code)
                          ? prev.filter((c) => c !== mcc.code)
                          : [...prev, mcc.code],
                      )
                    }
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? 'border-amber-500 bg-amber-50 font-medium text-amber-900 dark:border-[#facc15]/50 dark:bg-[#1a1a12] dark:text-[#facc15]'
                        : 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#a1a1aa] dark:hover:border-[#2e2e32] dark:hover:text-white'
                    }`}
                  >
                    <span className="font-mono">{mcc.code}</span> · {mcc.group}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowIssueForm(false)}
              className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-800 hover:border-zinc-400 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:border-[#2e2e32]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg border border-amber-500/70 bg-[#facc15] px-5 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent"
            >
              Activate Card
            </button>
          </div>
        </form>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredCards.map((card) => {
          const pct = Math.min(100, Math.round((card.spentThisMonthUsd / card.monthlyLimitUsd) * 100));
          const isFrozen = card.status === 'Frozen';
          return (
            <HoloCard
              key={card.id}
              as="article"
              variant="payment"
              intensity="full"
              className="flex flex-col justify-between rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]"
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <HoloCardLayer depth={14}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-[#88888b]">
                          <CreditCard className="h-3.5 w-3.5 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
                          <span>{card.kind}</span>
                          <span>·</span>
                          <span>{card.department}</span>
                        </div>
                        <h3 className="mt-1 font-display text-base font-semibold text-zinc-950 dark:text-white">
                          {card.holderName}
                        </h3>
                      </div>

                      <span
                        className={`text-xs font-semibold ${
                          isFrozen ? 'text-red-700 dark:text-[#ff4d4d]' : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {card.status}
                      </span>
                    </div>
                  </HoloCardLayer>

                  <HoloCardLayer depth={26}>
                    <div className="mt-4 flex items-center justify-between font-mono text-xs text-zinc-700 dark:text-[#a1a1aa]">
                      <span>•••• •••• •••• {card.last4}</span>
                      <span>EXP {card.expiry}</span>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between font-mono text-xs tabular-nums">
                        <span className="font-medium text-zinc-950 dark:text-white">
                          {formatCurrency(card.spentThisMonthUsd)}
                        </span>
                        <span className="text-zinc-600 dark:text-[#88888b]">
                          / {formatCurrency(card.monthlyLimitUsd)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-[#1d1d1f]">
                        <div
                          className={`h-full ${isFrozen ? 'bg-[#ff4d4d]' : 'bg-[#facc15]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </HoloCardLayer>

                  <HoloCardLayer depth={10}>
                    <div className="mt-3 text-xs text-zinc-600 dark:text-[#88888b]">
                      MCCs: <span className="font-mono text-zinc-800 dark:text-[#d4d4d8]">{card.allowedMccCodes.join(', ')}</span>
                    </div>
                  </HoloCardLayer>
                </div>

                <div className="mt-5 flex items-center justify-between gap-2 border-t border-zinc-200 pt-4 dark:border-[#1d1d1f]">
                  <button
                    type="button"
                    onClick={() => onToggleFreeze(card.id)}
                    aria-label={isFrozen ? `Unfreeze card ending in ${card.last4}` : `Freeze card ending in ${card.last4}`}
                    className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isFrozen
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20'
                        : 'border-zinc-300 bg-zinc-50 text-zinc-800 hover:border-red-500 hover:text-red-700 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:border-[#ff4d4d]/50 dark:hover:text-[#ff4d4d]'
                    }`}
                  >
                    {isFrozen ? (
                      <>
                        <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                        Unfreeze
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        Freeze
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateCardLimit(card.id, card.monthlyLimitUsd + 5000)}
                    className="inline-flex min-h-[36px] items-center rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:border-amber-600 hover:text-amber-800 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:border-[#facc15]/50 dark:hover:text-[#facc15]"
                  >
                    +$5k Limit
                  </button>
                </div>
              </div>
            </HoloCard>
          );
        })}
      </div>

      {/* Live Policy & MCC Authorization Simulator */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
          <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
            Real-Time Authorization &amp; MCC Rule Simulator
          </h3>
        </div>
        <p className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
          Test how Ravfina evaluates a live card swipe against card freeze status,
          velocity caps, spend limits, and MCC allowlists.
        </p>

        <form
          onSubmit={handleSimulateAuth}
          className="mt-4 grid grid-cols-1 items-end gap-4 sm:grid-cols-4"
        >
          <div>
            <label htmlFor="sim-card" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
              Target Card
            </label>
            <select
              id="sim-card"
              value={simCardId}
              onChange={(e) => setSimCardId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.holderName} (•••• {c.last4}) — {c.status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sim-amount" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
              Attempted Amount ($)
            </label>
            <input
              id="sim-amount"
              type="number"
              min={1}
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 font-mono text-xs tabular-nums text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
            />
          </div>
          <div>
            <label htmlFor="sim-mcc" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
              Merchant Category (MCC)
            </label>
            <select
              id="sim-mcc"
              value={simMcc}
              onChange={(e) => setSimMcc(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
            >
              {MCC_DIRECTORY.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} — {m.label}
                </option>
              ))}
              <option value="7995">7995 — Restricted Gaming / Crypto</option>
            </select>
          </div>
          <button
            type="submit"
            className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[38px] items-center justify-center rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent"
          >
            Test Authorization
          </button>
        </form>

        {simResult && (
          <div
            role="status"
            className={`mt-4 rounded-lg border px-4 py-3 text-xs font-medium ${
              simResult.approved
                ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'border-red-300 bg-red-50 text-red-700 dark:border-[#ff4d4d]/40 dark:bg-[#ff4d4d]/10 dark:text-[#ff4d4d]'
            }`}
          >
            {simResult.reason}
          </div>
        )}
      </div>
    </div>
  );
}
