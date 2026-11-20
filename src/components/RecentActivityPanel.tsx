import {
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Database,
  Download,
  Landmark,
  Radio,
} from 'lucide-react';
import { useState } from 'react';
import {
  filterAuditActivities,
  formatAuditActivitiesCsv,
  formatCurrency,
  summarizeAuditActivities,
  type AuditActivityItem,
  type AuditCategory,
} from '../domain/treasury';
import type { WorkspaceSection } from './TreasuryWorkspace';

interface RecentActivityPanelProps {
  activities: AuditActivityItem[];
  liveStreamEnabled: boolean;
  onToggleLiveStream: () => void;
  onNavigateSection?: (section: WorkspaceSection) => void;
  compact?: boolean;
}

const CATEGORY_TABS: { id: 'all' | AuditCategory; label: string }[] = [
  { id: 'all', label: 'All Events' },
  { id: 'credit_drawdown', label: 'Credit Draw-downs' },
  { id: 'erp_sync', label: 'ERP Syncs' },
  { id: 'card_transaction', label: 'Card Transactions' },
];

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  credit_drawdown: 'Credit Draw-down',
  erp_sync: 'ERP Sync',
  card_transaction: 'Card Transaction',
};

const CATEGORY_TO_SECTION: Record<AuditCategory, WorkspaceSection> = {
  credit_drawdown: 'loans',
  erp_sync: 'erp',
  card_transaction: 'cards',
};

function getCategoryIcon(category: AuditCategory) {
  if (category === 'credit_drawdown') return Landmark;
  if (category === 'erp_sync') return Database;
  return CreditCard;
}

function getStatusColorClass(status: AuditActivityItem['status']): string {
  if (status === 'Declined') return 'text-red-700 dark:text-[#ff4d4d]';
  if (status === 'Auto-Triggered') return 'text-amber-800 dark:text-[#facc15]';
  return 'text-emerald-700 dark:text-emerald-400';
}

export function RecentActivityPanel({
  activities,
  liveStreamEnabled,
  onToggleLiveStream,
  onNavigateSection,
  compact = false,
}: RecentActivityPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | AuditCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const summary = summarizeAuditActivities(activities);
  const filtered = filterAuditActivities(activities, {
    category: categoryFilter,
    query: searchQuery,
  });

  const getTabCount = (id: 'all' | AuditCategory) => {
    if (id === 'all') return summary.totalCount;
    if (id === 'credit_drawdown') return summary.creditDrawdownCount;
    if (id === 'erp_sync') return summary.erpSyncCount;
    return summary.cardTxCount;
  };

  const handleExportCsv = () => {
    const csv = formatAuditActivitiesCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ravfina-recent-activity-audit.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-label="Recent Activity"
      data-testid="recent-activity-panel"
      className={
        compact
          ? 'space-y-4'
          : 'rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]'
      }
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
            Recent Activity
          </h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-[#88888b]">
            Immutable audit feed of credit draw-downs, ERP ledger syncs, and corporate card authorizations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            aria-pressed={liveStreamEnabled}
            onClick={onToggleLiveStream}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              liveStreamEnabled
                ? 'border-amber-500/70 bg-[#facc15] text-black dark:border-[#facc15]'
                : 'border-zinc-300 bg-zinc-50 text-zinc-800 hover:bg-zinc-200 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:bg-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            {liveStreamEnabled ? 'Live Stream: Active' : 'Live Stream: Off'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-200 hover:text-zinc-950 disabled:opacity-50 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:bg-[#1d1d1f] dark:hover:text-white whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Audit Summary Strip */}
      <div
        className={`mt-4 grid gap-3 border-y border-zinc-200 py-3 font-mono tabular-nums dark:border-[#1d1d1f] ${
          compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
        }`}
      >
        <div>
          <div className="font-sans text-xs text-zinc-600 dark:text-[#88888b]">Credit Drawn</div>
          <div className="mt-0.5 text-sm font-semibold text-zinc-950 dark:text-white">
            {formatCurrency(summary.creditDrawdownTotalUsd)}
          </div>
          <div className="font-sans text-[11px] text-zinc-600 dark:text-[#88888b]">
            {summary.creditDrawdownCount} disbursement{summary.creditDrawdownCount === 1 ? '' : 's'}
          </div>
        </div>
        <div>
          <div className="font-sans text-xs text-zinc-600 dark:text-[#88888b]">ERP Sync Runs</div>
          <div className="mt-0.5 text-sm font-semibold text-zinc-950 dark:text-white">
            {summary.erpSyncCount} verified
          </div>
          <div className="font-sans text-[11px] text-zinc-600 dark:text-[#88888b]">Zero schema drift</div>
        </div>
        <div>
          <div className="font-sans text-xs text-zinc-600 dark:text-[#88888b]">Card Spend Logged</div>
          <div className="mt-0.5 text-sm font-semibold text-zinc-950 dark:text-white">
            {formatCurrency(summary.cardTxApprovedUsd)}
          </div>
          <div className="font-sans text-[11px] text-zinc-600 dark:text-[#88888b]">
            {summary.cardTxCount} swipe{summary.cardTxCount === 1 ? '' : 's'} inspected
          </div>
        </div>
        <div>
          <div className="font-sans text-xs text-zinc-600 dark:text-[#88888b]">Policy Blocks</div>
          <div className="mt-0.5 text-sm font-semibold text-red-700 dark:text-[#ff4d4d]">
            {summary.declinedCount} declined
          </div>
          <div className="font-sans text-[11px] text-zinc-600 dark:text-[#88888b]">
            {summary.totalCount} total audit events
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter recent activity by event type"
          className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-50 p-1 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]"
        >
          {CATEGORY_TABS.map((tab) => {
            const active = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategoryFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-[#88888b] dark:hover:text-white'
                }`}
              >
                {tab.label}{' '}
                <span
                  className={`ml-1 font-mono text-[11px] tabular-nums ${
                    active ? 'text-zinc-300 dark:text-[#88888b]' : 'text-zinc-500 dark:text-[#88888b]'
                  }`}
                >
                  ({getTabCount(tab.id)})
                </span>
              </button>
            );
          })}
        </div>

        <div className={compact ? 'w-full' : 'w-full sm:w-auto'}>
          <label htmlFor={compact ? 'drawer-audit-search' : 'audit-search'} className="sr-only">
            Search audit reference, actor, facility, or merchant
          </label>
          <input
            id={compact ? 'drawer-audit-search' : 'audit-search'}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search AUD ref, actor, or merchant..."
            className="w-full rounded-lg border border-zinc-400 bg-white px-3 py-1.5 text-xs text-zinc-950 placeholder:text-zinc-500 focus:border-amber-700 focus:outline-none sm:w-64 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:placeholder:text-[#88888b] dark:focus:border-[#facc15]"
          />
        </div>
      </div>

      {/* Activity Feed List */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-zinc-600 dark:text-[#88888b]">
            No audit entries match your active category or search filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all');
              setSearchQuery('');
            }}
            className="mt-3 inline-flex items-center rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-200 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:bg-[#1d1d1f] dark:hover:text-white"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <ul
          data-testid="recent-activity-list"
          className="mt-4 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-[#1d1d1f] dark:border-[#1d1d1f]"
        >
          {filtered.map((item) => {
            const Icon = getCategoryIcon(item.category);
            const isExpanded = expandedId === item.id;
            return (
              <li key={item.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400 bg-amber-50 text-amber-800 dark:border-[#1d1d1f] dark:bg-[#1d1d1f] dark:text-[#facc15]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                          {item.title}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-[#88888b]" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono text-xs text-zinc-600 tabular-nums dark:text-[#88888b]">
                          {item.auditRef}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-700 dark:text-[#a1a1aa]">
                        <span>{CATEGORY_LABELS[item.category]}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.actor}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{item.counterpartyOrTarget}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] tabular-nums text-zinc-600 dark:text-[#88888b]">
                        <span>{item.timestamp}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-sans">{item.channel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
                        {item.amountUsd !== null ? formatCurrency(item.amountUsd) : 'Ledger Sync'}
                      </div>
                      <div className={`text-xs font-semibold ${getStatusColorClass(item.status)}`}>
                        {item.status}
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-label={`Inspect audit entry ${item.auditRef}`}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#88888b] dark:hover:bg-[#1d1d1f] dark:hover:text-white"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 ml-11 rounded-lg border border-zinc-300 bg-zinc-50 p-3.5 dark:border-[#1d1d1f] dark:bg-[#0d0d0e]">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {Object.entries(item.metadata).map(([key, val]) => (
                        <div key={key} className="flex items-baseline justify-between gap-3 text-xs">
                          <span className="text-zinc-600 capitalize dark:text-[#88888b]">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="font-mono font-medium tabular-nums text-zinc-950 text-right dark:text-white">
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                    {onNavigateSection && (
                      <div className="mt-3 flex justify-end border-t border-zinc-200 pt-2.5 dark:border-[#1d1d1f]">
                        <button
                          type="button"
                          onClick={() => onNavigateSection(CATEGORY_TO_SECTION[item.category])}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline dark:text-[#facc15]"
                        >
                          <ArrowDownLeft className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
                          Open {CATEGORY_LABELS[item.category]} Module
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
