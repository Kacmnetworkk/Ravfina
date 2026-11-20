import { Check, Copy, Database, KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { ApiKeyRecord, ErpConfig, WebhookLog } from '../../domain/treasury';

interface ErpApiViewProps {
  erpConfig: ErpConfig;
  apiKeys: ApiKeyRecord[];
  webhookLogs: WebhookLog[];
  onTriggerErpSync: () => void;
  onCreateApiKey: (name: string, scopes: string[]) => string;
  onRevokeApiKey: (keyId: string) => void;
}

const AVAILABLE_SCOPES = [
  'read:treasury',
  'write:transfers',
  'read:cards',
  'write:cards',
  'read:erp',
  'write:reconcile',
];

export function ErpApiView({
  erpConfig,
  apiKeys,
  webhookLogs,
  onTriggerErpSync,
  onCreateApiKey,
  onRevokeApiKey,
}: ErpApiViewProps) {
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read:treasury', 'read:erp']);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleSync = () => {
    onTriggerErpSync();
    setSyncNotice(`${erpConfig.provider} ledger synchronization completed.`);
  };

  const handleCreateKey = (e: FormEvent) => {
    e.preventDefault();
    if (newKeyName.trim().length < 2 || newKeyScopes.length === 0) return;
    const secret = onCreateApiKey(newKeyName.trim(), newKeyScopes);
    setCreatedSecret(secret);
    setNewKeyName('');
  };

  const handleCopy = (id: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <div className="space-y-6">
      {/* ERP Connector Panel */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-[#facc15]">
              <Database className="h-4 w-4" aria-hidden="true" />
              <span>Enterprise ERP Connector · {erpConfig.environment}</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-semibold text-zinc-950 dark:text-white">
              {erpConfig.provider} — {erpConfig.syncCadence}
            </h2>
            <p className="mt-1 font-mono text-xs text-zinc-600 dark:text-[#88888b]">
              Last synchronized: {erpConfig.lastSyncAt} · Cost-center tagging:{' '}
              {erpConfig.costCenterTagging ? 'Enabled' : 'Disabled'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSync}
            className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Sync Ledger Now
          </button>
        </div>

        {syncNotice && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-emerald-400 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            {syncNotice}
          </div>
        )}

        <div className="mt-5 overflow-x-auto rounded-lg border border-zinc-300 dark:border-[#1d1d1f]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#88888b]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Treasury Category</th>
                <th className="px-4 py-2.5 font-medium">GL Code</th>
                <th className="px-4 py-2.5 font-medium">Target ERP Account</th>
                <th className="px-4 py-2.5 text-right font-medium">Auto-Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-[#1d1d1f]">
              {erpConfig.mappings.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-100 dark:hover:bg-[#161618]">
                  <td className="px-4 py-2.5 font-medium text-zinc-950 dark:text-white">{m.treasuryCategory}</td>
                  <td className="px-4 py-2.5 font-mono text-zinc-800 dark:text-[#d4d4d8]">{m.glCode}</td>
                  <td className="px-4 py-2.5 text-zinc-700 dark:text-[#a1a1aa]">{m.glAccountName}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-emerald-700 dark:text-emerald-400">
                    {m.autoSync ? 'Active' : 'Manual'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* API Keys Management */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-zinc-300 bg-white p-6 lg:col-span-7 dark:border-[#1d1d1f] dark:bg-[#111112]">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
              Programmatic Treasury &amp; ERP API Keys
            </h2>
          </div>

          {createdSecret && (
            <div
              role="status"
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500 bg-amber-50 p-3.5 dark:border-[#facc15]/40 dark:bg-[#1a1a12]"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                  API Key Provisioned (copy once)
                </div>
                <div className="mt-1 truncate font-mono text-xs text-zinc-950 dark:text-white">{createdSecret}</div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('new-secret', createdSecret)}
                className="inline-flex items-center gap-1 rounded-md border border-amber-500 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-[#facc15]/40 dark:bg-[#0b0b0c] dark:text-[#facc15] dark:hover:bg-[#1d1d1f]"
              >
                {copiedId === 'new-secret' ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {copiedId === 'new-secret' ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}

          <div className="mt-4 divide-y divide-zinc-200 dark:divide-[#1d1d1f]">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-950 dark:text-white">{k.name}</span>
                    <span
                      className={`text-xs font-medium ${
                        k.status === 'Active' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-[#ff4d4d]'
                      }`}
                    >
                      · {k.status}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-zinc-600 dark:text-[#88888b]">
                    {k.prefix} · Scopes: {k.scopes.join(', ')}
                  </div>
                </div>
                {k.status === 'Active' && (
                  <button
                    type="button"
                    onClick={() => onRevokeApiKey(k.id)}
                    aria-label={`Revoke API key ${k.name}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-[#ff4d4d]/40 dark:bg-[#ff4d4d]/10 dark:text-[#ff4d4d] dark:hover:bg-[#ff4d4d]/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Create New Scoped API Key */}
        <form
          onSubmit={handleCreateKey}
          className="rounded-xl border border-zinc-300 bg-white p-6 lg:col-span-5 dark:border-[#1d1d1f] dark:bg-[#111112]"
        >
          <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
            Generate Scoped API Key
          </h3>
          <p className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
            Authenticate custom ERP bridges, automated payroll sweeps, or card provisioning scripts.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="api-key-name" className="block text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">
                Key Description
              </label>
              <input
                id="api-key-name"
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="SAP S/4HANA Nightly Journal Sync"
                className="mt-1 block w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:placeholder:text-[#88888b] dark:focus:border-[#facc15]"
              />
            </div>

            <div>
              <div className="text-xs font-medium text-zinc-800 dark:text-[#d4d4d8]">Permission Scopes</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {AVAILABLE_SCOPES.map((scope) => {
                  const checked = newKeyScopes.includes(scope);
                  return (
                    <label
                      key={scope}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors ${
                        checked
                          ? 'border-amber-500 bg-amber-50 text-amber-900 dark:border-[#facc15]/40 dark:bg-[#1a1a12] dark:text-[#facc15]'
                          : 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#a1a1aa]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setNewKeyScopes((prev) =>
                            prev.includes(scope)
                              ? prev.filter((s) => s !== scope)
                              : [...prev, scope],
                          )
                        }
                        className="h-3.5 w-3.5 rounded border-zinc-400 bg-white accent-amber-600 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:accent-[#facc15]"
                      />
                      {scope}
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Issue Live API Key
            </button>
          </div>
        </form>
      </div>

      {/* Webhook Delivery Log */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]">
        <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
          Recent ERP &amp; Security Webhook Deliveries
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b border-zinc-300 text-zinc-600 dark:border-[#1d1d1f] dark:text-[#88888b]">
              <tr>
                <th className="py-2 pr-4 font-medium">Event</th>
                <th className="py-2 pr-4 font-medium">Endpoint</th>
                <th className="py-2 pr-4 text-right font-medium">HTTP</th>
                <th className="py-2 pr-4 text-right font-medium">Latency</th>
                <th className="py-2 text-right font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 tabular-nums dark:divide-[#1d1d1f]">
              {webhookLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-100 dark:hover:bg-[#161618]">
                  <td className="py-2.5 pr-4 font-medium text-zinc-950 dark:text-white">{log.event}</td>
                  <td className="py-2.5 pr-4 text-zinc-700 dark:text-[#a1a1aa]">{log.endpoint}</td>
                  <td className="py-2.5 pr-4 text-right text-emerald-700 dark:text-emerald-400">{log.httpStatus} OK</td>
                  <td className="py-2.5 pr-4 text-right text-zinc-800 dark:text-[#d4d4d8]">{log.latencyMs}ms</td>
                  <td className="py-2.5 text-right text-zinc-600 dark:text-[#88888b]">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
