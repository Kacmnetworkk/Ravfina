import { Check, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HoloCard, HoloCardLayer } from '../components/HoloCard';
import { PageReveal, ViewStateShell } from '../components/MotionPrimitives';
import { SiteFooter, SiteHeader, navigateTo } from '../components/SiteChrome';
import { HoloPrismIcon } from '../components/icons/RavfinaIcons';
import { formatMinorUnits } from '../domain/formatters';

interface BillingPlanDto {
  id: 'starter' | 'growth' | 'enterprise';
  name: string;
  tagline: string;
  monthlyPriceMinor: number;
  annualPriceMinor: number;
  includedSeats: number;
  includedApiCalls: number;
  features: string[];
}

export function PricingPage({ currentPath }: { currentPath: string }) {
  const [plans, setPlans] = useState<BillingPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [annual, setAnnual] = useState(true);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/billing/plans');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPlans(data.plans ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlans();
  }, []);

  const handleCheckout = async (planId: BillingPlanDto['id']) => {
    setCheckoutPlanId(planId);
    setCheckoutStatus(null);
    try {
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org: 'vanguard-robotics',
          planId,
          billingCycle: annual ? 'annual' : 'monthly',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setCheckoutStatus(
        `Subscribed Vanguard Robotics to ${planId.toUpperCase()} (${annual ? 'Annual' : 'Monthly'}). Invoice ${data.invoice?.id ?? ''} created.`,
      );
    } catch (err) {
      setCheckoutStatus(err instanceof Error ? err.message : 'Checkout error.');
    } finally {
      setCheckoutPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      <SiteHeader currentPath={currentPath} />

      <main className="mx-auto max-w-7xl px-6 py-14">
        <PageReveal>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                <HoloPrismIcon className="h-4 w-4" />
                <span>Ravfina Treasury Billing &amp; Licensing</span>
              </div>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight">
                Predictable pricing built for modern finance teams.
              </h1>
              <p className="mt-3 text-base text-zinc-700 dark:text-[#a1a1aa]">
                Billing lives natively inside your organization ledger and API hub—with zero surprise
                wire markups or opaque FX spreads.
              </p>
            </div>

            <div className="inline-flex items-center gap-1 rounded-xl border border-zinc-300 bg-white p-1 dark:border-[#1d1d1f] dark:bg-[#111112]">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                  !annual
                    ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                    : 'text-zinc-600 dark:text-[#88888b]'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                  annual
                    ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                    : 'text-zinc-600 dark:text-[#88888b]'
                }`}
              >
                Annual · Save 20%
              </button>
            </div>
          </div>
        </PageReveal>

        {checkoutStatus && (
          <div
            role="status"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400 bg-emerald-50 px-5 py-3.5 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200"
          >
            <span>{checkoutStatus}</span>
            <button
              type="button"
              onClick={() => navigateTo('/api')}
              className="font-mono text-xs font-bold underline"
            >
              Inspect Invoice in API Billing Hub →
            </button>
          </div>
        )}

        <div className="mt-10">
          <ViewStateShell
            loading={loading}
            error={error}
            empty={plans.length === 0}
            onRetry={loadPlans}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {plans.map((plan) => {
                const isGrowth = plan.id === 'growth';
                const priceMinor = annual ? plan.annualPriceMinor : plan.monthlyPriceMinor;
                return (
                  <HoloCard
                    key={plan.id}
                    variant={isGrowth ? 'product' : 'dashboard'}
                    intensity={isGrowth ? 'full' : 'subtle'}
                    className={`flex flex-col justify-between rounded-2xl border p-7 ${
                      isGrowth
                        ? 'border-amber-500 bg-white dark:border-[#facc15]/60 dark:bg-[#141416]'
                        : 'border-zinc-300 bg-white dark:border-[#1d1d1f] dark:bg-[#111112]'
                    }`}
                  >
                    <div>
                      <HoloCardLayer depth={14}>
                        <div className="flex items-center justify-between">
                          <span className="font-display text-lg font-bold">{plan.name}</span>
                          {isGrowth && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-900 dark:bg-[#facc15]/15 dark:text-[#facc15]">
                              <Sparkles className="h-3 w-3" />
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-sm text-zinc-600 dark:text-[#a1a1aa]">
                          {plan.tagline}
                        </p>
                      </HoloCardLayer>

                      <HoloCardLayer depth={22} className="mt-6">
                        <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
                          <span className="text-3xl font-bold text-zinc-950 dark:text-white">
                            {priceMinor === 0
                              ? '$0'
                              : formatMinorUnits(priceMinor, 'USD')}
                          </span>
                          <span className="text-xs text-zinc-600 dark:text-[#88888b]">
                            / month {annual && priceMinor > 0 ? '(billed annually)' : ''}
                          </span>
                        </div>
                        <div className="mt-2 font-mono text-xs text-zinc-600 dark:text-[#88888b]">
                          {plan.includedSeats} team seats ·{' '}
                          {plan.includedApiCalls.toLocaleString('en-US')} API ops/mo
                        </div>
                      </HoloCardLayer>

                      <ul className="mt-6 space-y-2.5 border-t border-zinc-200 pt-5 text-sm dark:border-[#1d1d1f]">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2.5">
                            <Check
                              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                              aria-hidden="true"
                            />
                            <span className="text-zinc-800 dark:text-[#d4d4d8]">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-8">
                      <button
                        type="button"
                        disabled={checkoutPlanId === plan.id}
                        onClick={() => handleCheckout(plan.id)}
                        className={`ravfina-cta-tactile ravfina-focus-ring inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold ${
                          isGrowth
                            ? 'border border-amber-500/70 bg-[#facc15] text-black hover:bg-[#fde047] dark:border-transparent'
                            : 'border border-zinc-400 bg-zinc-50 text-zinc-950 hover:bg-zinc-100 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white dark:hover:bg-[#1d1d1f]'
                        }`}
                      >
                        {checkoutPlanId === plan.id
                          ? 'Provisioning Plan...'
                          : `Activate ${plan.name}`}
                      </button>
                    </div>
                  </HoloCard>
                );
              })}
            </div>
          </ViewStateShell>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
