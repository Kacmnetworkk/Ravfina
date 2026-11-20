import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { HoloCard, HoloCardLayer } from '../components/HoloCard';
import { PageReveal } from '../components/MotionPrimitives';
import { SiteFooter, SiteHeader, navigateTo } from '../components/SiteChrome';
import { HoloPrismIcon } from '../components/icons/RavfinaIcons';
import { AGENCY_CASE_STUDIES, AGENCY_SERVICES } from '../data/platformContent';
import { formatTabularNumber } from '../domain/formatters';

export function AgencyPage({ currentPath }: { currentPath: string }) {
  const [selectedServices, setSelectedServices] = useState<string[]>([
    AGENCY_SERVICES[0].number,
  ]);
  const [heroError, setHeroError] = useState(false);

  const toggleService = (num: string) => {
    setSelectedServices((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num],
    );
  };

  const estimatedBudgetUsd = AGENCY_SERVICES.filter((s) =>
    selectedServices.includes(s.number),
  ).reduce((acc, s) => acc + s.rateUsd, 0);

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      <SiteHeader currentPath={currentPath} />

      <main className="mx-auto max-w-7xl px-6 py-12 space-y-14">
        <PageReveal>
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                <HoloPrismIcon className="h-4 w-4" />
                <span>Ravfina Studio · Advisory &amp; Implementation</span>
              </div>
              <h1 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
                We architect bespoke treasury ledgers and holographic fintech systems.
              </h1>
              <p className="mt-4 text-base text-zinc-700 dark:text-[#a1a1aa]">
                Our embedded systems engineers and former CFO controllers ship custom NetSuite
                bridges, working-capital automation, and branded HoloCard platforms in weeks.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#studio-estimator"
                  className="ravfina-cta-tactile inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-500/70 bg-[#facc15] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent"
                >
                  Scope Your Sprint
                  <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => navigateTo('/app/vanguard-robotics')}
                  className="inline-flex min-h-[44px] items-center rounded-xl border border-zinc-400 bg-white px-5 py-2.5 text-sm font-semibold dark:border-[#1d1d1f] dark:bg-[#111112]"
                >
                  Inspect Live Reference Build
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <HoloCard
                variant="product"
                intensity="subtle"
                className="aspect-[16/9] overflow-hidden rounded-2xl border border-zinc-300 bg-zinc-900 dark:border-[#1d1d1f]"
              >
                {heroError ? (
                  <div className="flex h-full items-center justify-center p-8 text-zinc-400">
                    Ravfina Studio Architecture Atelier
                  </div>
                ) : (
                  <img
                    src="/src/assets/images/agency_studio_hero_1794943502340.jpg"
                    alt="Ravfina Studio architectural advisory workspace"
                    onError={() => setHeroError(true)}
                    className="h-full w-full object-cover"
                  />
                )}
              </HoloCard>
            </div>
          </div>
        </PageReveal>

        {/* Services + Scope Estimator */}
        <section id="studio-estimator" className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <h2 className="font-display text-2xl font-bold">Fixed-Scope Studio Sprints</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {AGENCY_SERVICES.map((svc) => {
                const selected = selectedServices.includes(svc.number);
                return (
                  <HoloCard
                    key={svc.number}
                    as="button"
                    type="button"
                    variant="dashboard"
                    intensity="subtle"
                    onClick={() => toggleService(svc.number)}
                    className={`flex flex-col justify-between rounded-2xl border p-6 text-left ${
                      selected
                        ? 'border-amber-500 bg-white dark:border-[#facc15]/60 dark:bg-[#141416]'
                        : 'border-zinc-300 bg-white dark:border-[#1d1d1f] dark:bg-[#111112]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between font-mono text-xs text-amber-800 dark:text-[#facc15]">
                        <span>{svc.number}</span>
                        <span>{svc.duration}</span>
                      </div>
                      <h3 className="mt-2 font-display text-base font-bold">{svc.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-[#a1a1aa]">
                        {svc.deliverable}
                      </p>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-3 font-mono text-xs dark:border-[#1d1d1f]">
                      <span className="font-bold tabular-nums">
                        ${formatTabularNumber(svc.rateUsd)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                        {selected && <Check className="h-3.5 w-3.5" />}
                        {selected ? 'Included' : 'Select'}
                      </span>
                    </div>
                  </HoloCard>
                );
              })}
            </div>
          </div>

          <HoloCard
            variant="product"
            intensity="full"
            className="flex flex-col justify-between rounded-2xl border border-amber-400 bg-gradient-to-br from-amber-50 to-white p-7 lg:col-span-4 dark:border-[#facc15]/35 dark:from-[#1a1a12] dark:to-[#111112]"
          >
            <HoloCardLayer depth={16}>
              <div className="font-mono text-xs font-bold uppercase text-amber-800 dark:text-[#facc15]">
                Engagement Estimate
              </div>
              <div className="mt-3 font-mono text-4xl font-bold tabular-nums">
                ${formatTabularNumber(estimatedBudgetUsd)}
              </div>
              <p className="mt-2 text-xs text-zinc-600 dark:text-[#a1a1aa]">
                {selectedServices.length} studio sprint track(s) selected with dedicated principal
                architects.
              </p>
            </HoloCardLayer>

            <button
              type="button"
              onClick={() => navigateTo('/auth')}
              className="ravfina-cta-tactile mt-6 w-full rounded-xl border border-amber-500/70 bg-[#facc15] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent"
            >
              Reserve Studio Kickoff
            </button>
          </HoloCard>
        </section>

        {/* Case Studies */}
        <section className="space-y-6">
          <h2 className="font-display text-2xl font-bold">Client Outcomes &amp; Case Studies</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {AGENCY_CASE_STUDIES.map((cs) => (
              <HoloCard
                key={cs.id}
                variant="editorial"
                intensity="subtle"
                className="flex flex-col justify-between rounded-2xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-zinc-500">{cs.sector}</span>
                    <span className="font-bold text-amber-800 dark:text-[#facc15]">{cs.metric}</span>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-bold">{cs.client}</h3>
                  <p className="mt-2 text-sm text-zinc-700 dark:text-[#a1a1aa]">{cs.summary}</p>
                </div>
                <blockquote className="mt-5 border-t border-zinc-200 pt-4 text-xs italic text-zinc-600 dark:border-[#1d1d1f] dark:text-[#d4d4d8]">
                  “{cs.quote}”
                </blockquote>
              </HoloCard>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
