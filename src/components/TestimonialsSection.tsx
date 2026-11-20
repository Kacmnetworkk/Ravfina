import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { CFO_AGGREGATE_METRICS, CFO_TESTIMONIALS } from '../data/seedTreasury';
import { filterCfoTestimonials, type TestimonialIndustry } from '../domain/treasury';
import { HoloCard } from './HoloCard';
import { PanelStateTransition } from './MotionPrimitives';
import { SocialShareButtons } from './SocialShareButtons';

interface TestimonialsSectionProps {
  onStartOnboarding: () => void;
}

const INDUSTRY_FILTERS: TestimonialIndustry[] = [
  'All',
  'Hardware & Robotics',
  'Enterprise SaaS',
  'Cross-Border Biotech',
];

export function TestimonialsSection({ onStartOnboarding }: TestimonialsSectionProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<TestimonialIndustry>('All');
  const [activeId, setActiveId] = useState<string>(CFO_TESTIMONIALS[0].id);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const visibleTestimonials = filterCfoTestimonials(CFO_TESTIMONIALS, selectedIndustry);
  const activeTestimonial =
    visibleTestimonials.find((item) => item.id === activeId) ??
    visibleTestimonials[0] ??
    CFO_TESTIMONIALS[0];

  const handleSelectIndustry = (industry: TestimonialIndustry) => {
    setSelectedIndustry(industry);
    const matches = filterCfoTestimonials(CFO_TESTIMONIALS, industry);
    if (matches.length > 0 && !matches.some((m) => m.id === activeId)) {
      setActiveId(matches[0].id);
    }
  };

  return (
    <section
      id="reports"
      aria-labelledby="cfo-proof-heading"
      className="scroll-mt-20 border-t border-zinc-300 bg-[#f4f4f6] py-20 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header + Industry Filter Bar */}
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-amber-800 dark:text-[#facc15]">
              Verified CFO Benchmarks · Audited Treasury Reports
            </p>
            <h2
              id="cfo-proof-heading"
              className="mt-2 font-display text-3xl font-bold tracking-tight text-zinc-950 dark:text-white text-balance"
            >
              Proven by finance leaders managing multi-million-dollar liquidity.
            </h2>
            <p className="mt-3 text-base text-zinc-700 dark:text-[#a1a1aa]">
              Every metric below is reconciled directly against live ERP general ledgers, Plaid bank
              feeds, and issued corporate card authorizations.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter CFO case studies by industry"
            className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-300 bg-white p-1 dark:border-[#1d1d1f] dark:bg-[#111112]"
          >
            {INDUSTRY_FILTERS.map((industry) => {
              const active = selectedIndustry === industry;
              return (
                <button
                  key={industry}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSelectIndustry(industry)}
                  className={`ravfina-interactive-btn ravfina-focus-ring rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-[#88888b] dark:hover:bg-[#1d1d1f]/60 dark:hover:text-white'
                  }`}
                >
                  {industry}
                </button>
              );
            })}
          </div>
        </div>

        {/* Aggregate CFO-Level Proof Metrics Banner */}
        <div className="mt-10 overflow-hidden rounded-xl border border-zinc-300 bg-zinc-200 dark:border-[#1d1d1f] dark:bg-[#1d1d1f]">
          <div className="h-1 w-full bg-ravfina-yellow-gradient" aria-hidden="true" />
          <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
            {CFO_AGGREGATE_METRICS.map((metric) => (
              <div key={metric.label} className="bg-white p-6 dark:bg-[#111112]">
                <div className="font-mono text-2xl font-semibold tabular-nums text-amber-800 dark:text-[#facc15] lg:text-3xl">
                  {metric.value}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-700 dark:text-[#a1a1aa]">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Active CFO Spotlight Card with Smooth State Transition */}
        <HoloCard
          variant="editorial"
          intensity="subtle"
          className="mt-8 rounded-xl border border-zinc-300 bg-white dark:border-[#1d1d1f] dark:bg-[#111112]"
        >
          <PanelStateTransition transitionKey={activeTestimonial.id}>
            <div className="grid grid-cols-1 items-stretch gap-8 p-7 lg:grid-cols-12 lg:p-10">
              <div className="flex flex-col justify-between lg:col-span-7">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-[#88888b]">
                    <span className="font-semibold text-amber-800 dark:text-[#facc15]">
                      {activeTestimonial.industry}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeTestimonial.stageAndScale}</span>
                  </div>

                  <blockquote className="mt-4 font-display text-xl font-medium leading-relaxed text-zinc-950 dark:text-white lg:text-2xl">
                    “{activeTestimonial.quote}”
                  </blockquote>

                  {/* Before -> Outcome Row */}
                  <div className="mt-6 grid grid-cols-1 gap-3 border-t border-zinc-200 pt-5 dark:border-[#1d1d1f] sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-medium text-zinc-600 dark:text-[#88888b]">Previous Workflow</div>
                      <p className="mt-1 text-sm text-zinc-800 dark:text-[#d4d4d8]">{activeTestimonial.beforeState}</p>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Verified Ravfina Outcome</div>
                      <p className="mt-1 text-sm font-medium text-zinc-950 dark:text-white">
                        {activeTestimonial.afterOutcome}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-7 flex flex-col justify-between gap-4 border-t border-zinc-200 pt-6 dark:border-[#1d1d1f] xl:flex-row xl:items-center">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-zinc-300 bg-zinc-200 dark:border-[#2e2e32] dark:bg-[#1d1d1f]">
                      {failedImages[activeTestimonial.id] ? (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-950 dark:text-white">
                          {activeTestimonial.initials}
                        </div>
                      ) : (
                        <img
                          src={activeTestimonial.avatarSrc}
                          alt={`${activeTestimonial.cfoName}, ${activeTestimonial.role} at ${activeTestimonial.company}`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImages((prev) => ({
                              ...prev,
                              [activeTestimonial.id]: true,
                            }))
                          }
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-950 dark:text-white">
                        {activeTestimonial.cfoName}
                      </div>
                      <div className="text-xs text-zinc-700 dark:text-[#a1a1aa]">
                        {activeTestimonial.role} · {activeTestimonial.company}
                      </div>
                    </div>
                  </div>

                  <SocialShareButtons
                    compact
                    shareTitle={`${activeTestimonial.company} × Ravfina CFO Benchmark (${activeTestimonial.headlineMetric})`}
                    shareSummary={`${activeTestimonial.cfoName}, ${activeTestimonial.role}: ${activeTestimonial.afterOutcome}`}
                  />
                </div>
              </div>

              {/* Right Column: Quantitative CFO Proof Metrics */}
              <div className="grid grid-cols-1 gap-3.5 border-t border-zinc-200 pt-6 dark:border-[#1d1d1f] lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
                {activeTestimonial.proofMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]"
                  >
                    <div className="text-xs font-medium text-zinc-600 dark:text-[#88888b]">{metric.label}</div>
                    <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-950 dark:text-white">
                      {metric.value}
                    </div>
                    <p className="mt-1 text-xs text-zinc-700 dark:text-[#a1a1aa]">{metric.context}</p>
                  </div>
                ))}
              </div>
            </div>
            </PanelStateTransition>
        </HoloCard>

        {/* Client Success Stories Interactive Comparison Grid */}
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {visibleTestimonials.map((story) => {
            const isSelected = story.id === activeTestimonial.id;
            return (
              <HoloCard
                key={story.id}
                as="button"
                type="button"
                variant="editorial"
                intensity="subtle"
                onClick={() => setActiveId(story.id)}
                aria-pressed={isSelected}
                className={`ravfina-focus-ring flex flex-col justify-between rounded-xl border p-6 text-left ${
                  isSelected
                    ? 'border-amber-600 bg-white dark:border-[#facc15] dark:bg-[#111112]'
                    : 'border-zinc-300 bg-white hover:bg-zinc-50 dark:border-[#1d1d1f] dark:bg-[#111112] dark:hover:bg-[#161618]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-amber-800 dark:text-[#facc15]">{story.industry}</span>
                    <span className="font-mono text-xs font-semibold tabular-nums text-zinc-950 dark:text-white">
                      {story.headlineMetric}
                    </span>
                  </div>
                  <div className="mt-3 font-display text-lg font-semibold text-zinc-950 dark:text-white">
                    {story.company}
                  </div>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">{story.headlineMetricLabel}</p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-[#a1a1aa] line-clamp-3">
                    {story.afterOutcome}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-[#1d1d1f]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-zinc-300 bg-zinc-200 dark:border-[#2e2e32] dark:bg-[#1d1d1f]">
                      {failedImages[story.id] ? (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-zinc-950 dark:text-white">
                          {story.initials}
                        </div>
                      ) : (
                        <img
                          src={story.avatarSrc}
                          alt={story.cfoName}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImages((prev) => ({
                              ...prev,
                              [story.id]: true,
                            }))
                          }
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-zinc-950 dark:text-white">
                        {story.cfoName}
                      </div>
                      <div className="truncate text-[11px] text-zinc-600 dark:text-[#88888b]">{story.role}</div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                      isSelected ? 'text-amber-800 dark:text-[#facc15]' : 'text-zinc-800 dark:text-[#d4d4d8]'
                    }`}
                  >
                    {isSelected ? 'Viewing' : 'Inspect'}
                  </span>
                </div>
              </HoloCard>
            );
          })}
        </div>

        {/* Bottom CTA Strip adjacent to Proof */}
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-amber-400 bg-gradient-to-r from-amber-50 to-white px-6 py-5 dark:border-[#facc15]/25 dark:from-[#1a1a12] dark:to-[#111112] sm:flex-row sm:items-center">
          <div>
            <div className="font-display text-sm font-semibold text-zinc-950 dark:text-white">
              Benchmark your own cash runway, T-Bill yield, and NetSuite close time.
            </div>
            <p className="mt-0.5 text-xs text-zinc-700 dark:text-[#a1a1aa]">
              Connect read-only Plaid accounts in under 3 minutes to generate your underwriting profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartOnboarding}
            className="ravfina-cta-tactile ravfina-focus-ring inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-amber-500/70 bg-[#facc15] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent whitespace-nowrap shrink-0"
          >
            Check Your Funding Eligibility
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
