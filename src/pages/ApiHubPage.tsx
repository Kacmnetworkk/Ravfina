import { Check, CreditCard, Play, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_OPERATIONS, generateMcpTools, type ApiOperation } from '../../packages/contracts/src/operations';
import { HoloCard, HoloCardLayer } from '../components/HoloCard';
import { PageReveal, ViewStateShell } from '../components/MotionPrimitives';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';
import { ApiBridgeIcon } from '../components/icons/RavfinaIcons';
import { formatMinorUnits } from '../domain/formatters';

interface BillingOverviewResponse {
  plans: {
    id: 'starter' | 'growth' | 'enterprise';
    name: string;
    tagline: string;
    monthlyPriceMinor: number;
    annualPriceMinor: number;
    includedSeats: number;
    includedApiCalls: number;
    features: string[];
  }[];
  subscription: {
    orgSlug: string;
    planId: string;
    billingCycle: 'monthly' | 'annual';
    status: string;
    seatsUsed: number;
    apiCallsThisMonth: number;
    aiTokensThisMonth: number;
    periodEnd: string;
  };
  invoices: {
    id: string;
    orgSlug: string;
    planName: string;
    amountMinor: number;
    currency: string;
    status: string;
    issuedAt: string;
  }[];
}

export function ApiHubPage({ currentPath }: { currentPath: string }) {
  const [tab, setTab] = useState<'rest' | 'mcp' | 'openapi' | 'billing'>('rest');
  const [selectedOp, setSelectedOp] = useState<ApiOperation>(API_OPERATIONS[0]);
  const [restOutput, setRestOutput] = useState<string>('');
  const [restRunning, setRestRunning] = useState(false);

  const mcpTools = generateMcpTools();
  const [selectedMcpTool, setSelectedMcpTool] = useState(mcpTools[0]?.name ?? 'get_treasury_overview');
  const [mcpArgsText, setMcpArgsText] = useState('{"org": "vanguard-robotics"}');
  const [mcpOutput, setMcpOutput] = useState<string>('');
  const [mcpRunning, setMcpRunning] = useState(false);

  const [openApiSpec, setOpenApiSpec] = useState<string>('');
  const [openApiLoading, setOpenApiLoading] = useState(false);

  const [billing, setBilling] = useState<BillingOverviewResponse | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingToast, setBillingToast] = useState<string | null>(null);

  const loadOpenApi = async () => {
    setOpenApiLoading(true);
    try {
      const res = await fetch('/api/v1/openapi.json');
      const json = await res.json();
      setOpenApiSpec(JSON.stringify(json, null, 2));
    } catch (err) {
      setOpenApiSpec(`// Failed to load OpenAPI spec: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setOpenApiLoading(false);
    }
  };

  const loadBilling = async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const res = await fetch('/api/v1/billing/orgs/vanguard-robotics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as BillingOverviewResponse;
      setBilling(data);
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Failed to fetch billing state.');
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'openapi' && !openApiSpec) {
      void loadOpenApi();
    }
    if (tab === 'billing' && !billing) {
      void loadBilling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const runSelectedRest = async () => {
    setRestRunning(true);
    try {
      const url = selectedOp.path.replace(':org', 'vanguard-robotics');
      const init: RequestInit = {
        method: selectedOp.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (selectedOp.method !== 'GET' && selectedOp.exampleRequest) {
        init.body = JSON.stringify(selectedOp.exampleRequest);
      }
      const res = await fetch(url, init);
      const data = await res.json();
      setRestOutput(JSON.stringify({ status: res.status, data }, null, 2));
    } catch (err) {
      setRestOutput(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed' }, null, 2));
    } finally {
      setRestRunning(false);
    }
  };

  const runMcpRpc = async () => {
    setMcpRunning(true);
    try {
      const parsedArgs = JSON.parse(mcpArgsText || '{}');
      const res = await fetch('/api/v1/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: selectedMcpTool,
            arguments: parsedArgs,
          },
        }),
      });
      const json = await res.json();
      setMcpOutput(JSON.stringify(json, null, 2));
    } catch (err) {
      setMcpOutput(JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid JSON args' }, null, 2));
    } finally {
      setMcpRunning(false);
    }
  };

  const switchPlan = async (planId: 'starter' | 'growth' | 'enterprise') => {
    setBillingToast(null);
    try {
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org: 'vanguard-robotics', planId, billingCycle: 'monthly' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setBillingToast(`Plan updated to ${planId.toUpperCase()}. Invoice ${data.invoice?.id} issued.`);
      await loadBilling();
    } catch (err) {
      setBillingToast(err instanceof Error ? err.message : 'Plan change failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      <SiteHeader currentPath={currentPath} />

      <main className="mx-auto max-w-7xl px-6 py-12">
        <PageReveal>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                <ApiBridgeIcon className="h-4 w-4" />
                <span>Single-Source Contracts · {API_OPERATIONS.length} Operations</span>
              </div>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight">
                REST, MCP, OpenAPI 3.1 &amp; Built-In Billing
              </h1>
              <p className="mt-2 text-sm sm:text-base text-zinc-700 dark:text-[#a1a1aa]">
                Every REST endpoint, Model Context Protocol tool, and OpenAPI schema below is
                generated automatically from one shared `API_OPERATIONS` list in{' '}
                <code className="font-mono text-xs">packages/contracts</code>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-zinc-300 bg-white p-1 dark:border-[#1d1d1f] dark:bg-[#111112]">
              {(
                [
                  { id: 'rest', label: 'REST /api/v1' },
                  { id: 'mcp', label: 'MCP Tools' },
                  { id: 'openapi', label: 'OpenAPI 3.1' },
                  { id: 'billing', label: 'Billing & Metering' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    tab === t.id
                      ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                      : 'text-zinc-600 dark:text-[#88888b]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </PageReveal>

        {tab === 'rest' && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <aside className="space-y-2 lg:col-span-5">
              {API_OPERATIONS.map((op) => {
                const active = op.id === selectedOp.id;
                return (
                  <HoloCard
                    key={op.id}
                    as="button"
                    type="button"
                    variant="dashboard"
                    intensity="subtle"
                    onClick={() => {
                      setSelectedOp(op);
                      setRestOutput('');
                    }}
                    className={`w-full rounded-xl border p-4 text-left ${
                      active
                        ? 'border-amber-500 bg-white dark:border-[#facc15]/60 dark:bg-[#141416]'
                        : 'border-zinc-300 bg-white hover:border-zinc-400 dark:border-[#1d1d1f] dark:bg-[#111112]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span
                          className={`rounded px-1.5 py-0.5 font-bold ${
                            op.method === 'GET'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-900 dark:bg-[#facc15]/15 dark:text-[#facc15]'
                          }`}
                        >
                          {op.method}
                        </span>
                        <span className="truncate font-semibold text-zinc-950 dark:text-white">
                          {op.path}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-500">{op.category}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-600 dark:text-[#a1a1aa]">{op.summary}</p>
                  </HoloCard>
                );
              })}
            </aside>

            <section className="lg:col-span-7">
              <HoloCard
                variant="dashboard"
                intensity="subtle"
                className="rounded-2xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-[#1d1d1f]">
                  <div>
                    <div className="font-mono text-xs text-amber-800 dark:text-[#facc15]">
                      {selectedOp.id} · MCP: {selectedOp.mcpToolName}
                    </div>
                    <h2 className="mt-1 font-display text-lg font-bold">
                      {selectedOp.method} {selectedOp.path}
                    </h2>
                  </div>
                  <button
                    type="button"
                    disabled={restRunning}
                    onClick={runSelectedRest}
                    className="ravfina-cta-tactile inline-flex items-center gap-1.5 rounded-xl border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {restRunning ? 'Executing...' : 'Execute Live Call'}
                  </button>
                </div>

                <p className="mt-4 text-sm text-zinc-700 dark:text-[#d4d4d8]">
                  {selectedOp.summary}
                </p>

                {selectedOp.exampleRequest && (
                  <div className="mt-4">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                      Example Request Body
                    </div>
                    <pre className="mt-1.5 overflow-x-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs text-amber-200">
                      {JSON.stringify(selectedOp.exampleRequest, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="mt-4">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                    {restOutput ? 'Live Server Response' : 'Example Response Schema'}
                  </div>
                  <pre className="mt-1.5 max-h-96 overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs text-emerald-300">
                    {restOutput || JSON.stringify(selectedOp.exampleResponse, null, 2)}
                  </pre>
                </div>
              </HoloCard>
            </section>
          </div>
        )}

        {tab === 'mcp' && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              {mcpTools.map((tool) => (
                <HoloCard
                  key={tool.name}
                  as="button"
                  type="button"
                  variant="dashboard"
                  intensity="subtle"
                  onClick={() => setSelectedMcpTool(tool.name)}
                  className={`w-full rounded-xl border p-4 text-left ${
                    selectedMcpTool === tool.name
                      ? 'border-amber-500 bg-white dark:border-[#facc15]/60 dark:bg-[#141416]'
                      : 'border-zinc-300 bg-white dark:border-[#1d1d1f] dark:bg-[#111112]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-800 dark:text-[#facc15]">
                    <Terminal className="h-3.5 w-3.5" />
                    <span>{tool.name}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-600 dark:text-[#a1a1aa]">
                    {tool.description}
                  </p>
                </HoloCard>
              ))}
            </div>

            <div className="lg:col-span-7">
              <HoloCard
                variant="dashboard"
                intensity="subtle"
                className="rounded-2xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-xs text-zinc-500">POST /api/v1/mcp (JSON-RPC 2.0)</div>
                    <h2 className="mt-1 font-display text-lg font-bold">{selectedMcpTool}</h2>
                  </div>
                  <button
                    type="button"
                    disabled={mcpRunning}
                    onClick={runMcpRpc}
                    className="ravfina-cta-tactile inline-flex items-center gap-1.5 rounded-xl border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {mcpRunning ? 'Calling MCP...' : 'Invoke MCP Tool'}
                  </button>
                </div>

                <label htmlFor="mcp-args" className="mt-4 block font-mono text-xs text-zinc-500">
                  JSON Arguments
                </label>
                <textarea
                  id="mcp-args"
                  rows={4}
                  value={mcpArgsText}
                  onChange={(e) => setMcpArgsText(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-400 bg-zinc-950 p-3 font-mono text-xs text-amber-200 focus:border-amber-500 focus:outline-none dark:border-[#2e2e32]"
                />

                <div className="mt-4 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                  JSON-RPC Result
                </div>
                <pre className="mt-1.5 max-h-96 overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs text-emerald-300">
                  {mcpOutput || '// Click "Invoke MCP Tool" to execute live JSON-RPC against /api/v1/mcp'}
                </pre>
              </HoloCard>
            </div>
          </div>
        )}

        {tab === 'openapi' && (
          <HoloCard
            variant="editorial"
            intensity="subtle"
            className="mt-8 rounded-2xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-[#1d1d1f]">
              <div>
                <h2 className="font-display text-lg font-bold">OpenAPI 3.1.0 Specification</h2>
                <p className="text-xs text-zinc-600 dark:text-[#88888b]">
                  Fetched live from <code className="font-mono">/api/v1/openapi.json</code>
                </p>
              </div>
              <button
                type="button"
                onClick={loadOpenApi}
                className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-semibold dark:border-[#1d1d1f] dark:bg-[#0b0b0c]"
              >
                Refresh Spec
              </button>
            </div>
            <pre className="mt-4 max-h-[540px] overflow-auto rounded-xl bg-zinc-950 p-5 font-mono text-xs text-amber-200">
              {openApiLoading ? 'Loading /api/v1/openapi.json...' : openApiSpec}
            </pre>
          </HoloCard>
        )}

        {tab === 'billing' && (
          <div className="mt-8">
            <ViewStateShell
              loading={billingLoading}
              error={billingError}
              empty={!billing}
              onRetry={loadBilling}
            >
              {billing && (
                <div className="space-y-6">
                  {billingToast && (
                    <div
                      role="status"
                      className="rounded-xl border border-emerald-400 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                    >
                      {billingToast}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <HoloCard
                      variant="dashboard"
                      intensity="subtle"
                      className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]"
                    >
                      <HoloCardLayer depth={12}>
                        <div className="font-mono text-[11px] uppercase text-zinc-500">
                          Active Plan
                        </div>
                        <div className="mt-1.5 font-display text-xl font-bold uppercase text-amber-800 dark:text-[#facc15]">
                          {billing.subscription.planId}
                        </div>
                        <div className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
                          {billing.subscription.billingCycle} · {billing.subscription.status}
                        </div>
                      </HoloCardLayer>
                    </HoloCard>
                    <HoloCard
                      variant="dashboard"
                      intensity="subtle"
                      className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]"
                    >
                      <div className="font-mono text-[11px] uppercase text-zinc-500">
                        Seats Provisioned
                      </div>
                      <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums">
                        {billing.subscription.seatsUsed}
                      </div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
                        Org: {billing.subscription.orgSlug}
                      </div>
                    </HoloCard>
                    <HoloCard
                      variant="dashboard"
                      intensity="subtle"
                      className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]"
                    >
                      <div className="font-mono text-[11px] uppercase text-zinc-500">
                        API Requests MTD
                      </div>
                      <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums">
                        {billing.subscription.apiCallsThisMonth.toLocaleString('en-US')}
                      </div>
                      <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                        Within quota
                      </div>
                    </HoloCard>
                    <HoloCard
                      variant="dashboard"
                      intensity="subtle"
                      className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-[#1d1d1f] dark:bg-[#111112]"
                    >
                      <div className="font-mono text-[11px] uppercase text-zinc-500">
                        AI Agent Tokens
                      </div>
                      <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums">
                        {billing.subscription.aiTokensThisMonth.toLocaleString('en-US')}
                      </div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
                        Cycle ends {billing.subscription.periodEnd}
                      </div>
                    </HoloCard>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
                      {billing.plans.map((p) => {
                        const isCurrent = p.id === billing.subscription.planId;
                        return (
                          <HoloCard
                            key={p.id}
                            variant="product"
                            intensity={isCurrent ? 'full' : 'subtle'}
                            className={`flex flex-col justify-between rounded-xl border p-5 ${
                              isCurrent
                                ? 'border-amber-500 bg-white dark:border-[#facc15]/60 dark:bg-[#141416]'
                                : 'border-zinc-300 bg-white dark:border-[#1d1d1f] dark:bg-[#111112]'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-display font-bold">{p.name}</span>
                                {isCurrent && (
                                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                )}
                              </div>
                              <div className="mt-2 font-mono text-xl font-bold tabular-nums">
                                {p.monthlyPriceMinor === 0
                                  ? '$0'
                                  : formatMinorUnits(p.monthlyPriceMinor, 'USD')}
                                <span className="text-xs font-normal text-zinc-500">/mo</span>
                              </div>
                              <p className="mt-2 text-xs text-zinc-600 dark:text-[#a1a1aa]">
                                {p.includedSeats} seats · {p.includedApiCalls.toLocaleString('en-US')}{' '}
                                ops
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={isCurrent}
                              onClick={() => switchPlan(p.id)}
                              className="mt-4 w-full rounded-lg border border-zinc-400 bg-zinc-50 px-3 py-2 text-xs font-bold disabled:opacity-50 dark:border-[#2e2e32] dark:bg-[#0b0b0c]"
                            >
                              {isCurrent ? 'Active Plan' : `Switch to ${p.name}`}
                            </button>
                          </HoloCard>
                        );
                      })}
                    </div>

                    <HoloCard
                      variant="dashboard"
                      intensity="subtle"
                      className="rounded-xl border border-zinc-300 bg-white p-5 lg:col-span-5 dark:border-[#1d1d1f] dark:bg-[#111112]"
                    >
                      <div className="flex items-center gap-2 font-display text-sm font-bold">
                        <CreditCard className="h-4 w-4 text-amber-800 dark:text-[#facc15]" />
                        <span>Billing Invoices</span>
                      </div>
                      <div className="mt-3 divide-y divide-zinc-200 dark:divide-[#1d1d1f]">
                        {billing.invoices.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between py-3 text-xs">
                            <div>
                              <div className="font-mono font-semibold">{inv.id}</div>
                              <div className="text-zinc-600 dark:text-[#88888b]">
                                {inv.planName} · {inv.issuedAt}
                              </div>
                            </div>
                            <div className="text-right font-mono tabular-nums">
                              <div className="font-semibold">
                                {formatMinorUnits(inv.amountMinor, 'USD')}
                              </div>
                              <div className="text-emerald-700 dark:text-emerald-400">
                                {inv.status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </HoloCard>
                  </div>
                </div>
              )}
            </ViewStateShell>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
