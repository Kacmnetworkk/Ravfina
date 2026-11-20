import { Search, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { HoloCard } from '../components/HoloCard';
import { MdxRenderer } from '../components/MdxRenderer';
import { PageReveal } from '../components/MotionPrimitives';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';
import { BookMonographIcon } from '../components/icons/RavfinaIcons';
import { CHANGELOG_ENTRIES, DOC_PAGES, ROADMAP_ITEMS } from '../data/platformContent';

export function DocsPage({ currentPath }: { currentPath: string }) {
  const [tab, setTab] = useState<'guides' | 'changelog' | 'roadmap'>('guides');
  const [selectedSlug, setSelectedSlug] = useState(DOC_PAGES[0].slug);
  const [query, setQuery] = useState('');
  const [roadmapFilter, setRoadmapFilter] = useState<'All' | 'Shipped' | 'In Progress' | 'Planned'>('All');
  const [upvoted, setUpvoted] = useState<Record<string, boolean>>({});

  const normQuery = query.trim().toLowerCase();
  const matchingDocs = DOC_PAGES.filter(
    (d) =>
      !normQuery ||
      d.title.toLowerCase().includes(normQuery) ||
      d.summary.toLowerCase().includes(normQuery) ||
      d.plainText.includes(normQuery),
  );
  const matchingChangelog = CHANGELOG_ENTRIES.filter(
    (c) =>
      !normQuery ||
      c.title.toLowerCase().includes(normQuery) ||
      c.summary.toLowerCase().includes(normQuery),
  );
  const matchingRoadmap = ROADMAP_ITEMS.filter((r) => {
    const matchesStatus = roadmapFilter === 'All' || r.status === roadmapFilter;
    const matchesQuery =
      !normQuery ||
      r.title.toLowerCase().includes(normQuery) ||
      r.description.toLowerCase().includes(normQuery);
    return matchesStatus && matchesQuery;
  });

  const activeDoc =
    matchingDocs.find((d) => d.slug === selectedSlug) ?? matchingDocs[0] ?? null;

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      <SiteHeader currentPath={currentPath} />

      <main className="mx-auto max-w-7xl px-6 py-12">
        <PageReveal>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                <BookMonographIcon className="h-4 w-4" />
                <span>Ravfina Documentation · Changelog · Roadmap</span>
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
                Developer &amp; Controller Knowledge Base
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search MDX guides, releases..."
                  aria-label="Search documentation"
                  className="min-h-[40px] w-64 rounded-xl border border-zinc-400 bg-white pr-3 pl-9 text-xs text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-white"
                />
              </div>

              <div className="flex items-center gap-1 rounded-xl border border-zinc-300 bg-white p-1 dark:border-[#1d1d1f] dark:bg-[#111112]">
                {(['guides', 'changelog', 'roadmap'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      tab === t
                        ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                        : 'text-zinc-600 dark:text-[#88888b]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PageReveal>

        {tab === 'guides' && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <aside className="space-y-2 lg:col-span-4">
              {matchingDocs.length === 0 ? (
                <div className="rounded-xl border border-zinc-300 bg-white p-5 text-xs text-zinc-600 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#88888b]">
                  No MDX docs matched &ldquo;{query}&rdquo;.
                </div>
              ) : (
                matchingDocs.map((doc) => {
                  const active = activeDoc?.slug === doc.slug;
                  return (
                    <HoloCard
                      key={doc.slug}
                      as="button"
                      type="button"
                      variant="editorial"
                      intensity="subtle"
                      onClick={() => setSelectedSlug(doc.slug)}
                      className={`w-full rounded-xl border p-4 text-left ${
                        active
                          ? 'border-amber-500 bg-white dark:border-[#facc15]/60 dark:bg-[#141416]'
                          : 'border-zinc-300 bg-white hover:border-zinc-400 dark:border-[#1d1d1f] dark:bg-[#111112]'
                      }`}
                    >
                      <div className="font-mono text-[11px] uppercase tracking-wider text-amber-800 dark:text-[#facc15]">
                        {doc.section}
                      </div>
                      <div className="mt-1 font-display text-sm font-semibold text-zinc-950 dark:text-white">
                        {doc.title}
                      </div>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-[#88888b] line-clamp-2">
                        {doc.summary}
                      </p>
                    </HoloCard>
                  );
                })
              )}
            </aside>

            <section className="lg:col-span-8">
              {activeDoc ? (
                <HoloCard
                  variant="editorial"
                  intensity="subtle"
                  className="rounded-2xl border border-zinc-300 bg-white p-7 sm:p-9 dark:border-[#1d1d1f] dark:bg-[#111112]"
                >
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-4 font-mono text-xs text-zinc-600 dark:border-[#1d1d1f] dark:text-[#88888b]">
                    <span>{activeDoc.section}</span>
                    <span>Updated {activeDoc.updatedAt}</span>
                  </div>
                  <MdxRenderer source={activeDoc.raw} />
                </HoloCard>
              ) : null}
            </section>
          </div>
        )}

        {tab === 'changelog' && (
          <div className="mt-8 space-y-5">
            {matchingChangelog.map((entry) => (
              <HoloCard
                key={entry.id}
                variant="editorial"
                intensity="subtle"
                className="rounded-2xl border border-zinc-300 bg-white p-6 sm:p-7 dark:border-[#1d1d1f] dark:bg-[#111112]"
              >
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 font-bold text-amber-900 dark:bg-[#facc15]/15 dark:text-[#facc15]">
                    {entry.version}
                  </span>
                  <span className="text-zinc-600 dark:text-[#88888b]">{entry.date}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 dark:text-emerald-400">{entry.category}</span>
                </div>
                <h2 className="mt-3 font-display text-xl font-bold">{entry.title}</h2>
                <p className="mt-2 text-sm text-zinc-700 dark:text-[#a1a1aa]">{entry.summary}</p>
                <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-zinc-800 dark:text-[#d4d4d8]">
                  {entry.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </HoloCard>
            ))}
          </div>
        )}

        {tab === 'roadmap' && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-wrap gap-2">
              {(['All', 'Shipped', 'In Progress', 'Planned'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setRoadmapFilter(status)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    roadmapFilter === status
                      ? 'border-amber-500 bg-amber-50 text-amber-900 dark:border-[#facc15]/50 dark:bg-[#1a1a12] dark:text-[#facc15]'
                      : 'border-zinc-300 bg-white text-zinc-700 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#a1a1aa]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {matchingRoadmap.map((item) => {
                const isUpvoted = Boolean(upvoted[item.id]);
                const votes = item.votes + (isUpvoted ? 1 : 0);
                return (
                  <HoloCard
                    key={item.id}
                    variant="dashboard"
                    intensity="subtle"
                    className="flex flex-col justify-between rounded-2xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 font-mono text-xs">
                        <span className="text-amber-800 dark:text-[#facc15]">{item.quarter}</span>
                        <span
                          className={
                            item.status === 'Shipped'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : item.status === 'In Progress'
                                ? 'text-amber-700 dark:text-[#facc15]'
                                : 'text-zinc-600 dark:text-[#88888b]'
                          }
                        >
                          {item.status}
                        </span>
                      </div>
                      <h2 className="mt-2 font-display text-lg font-bold">{item.title}</h2>
                      <p className="mt-2 text-sm text-zinc-700 dark:text-[#a1a1aa]">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-[#1d1d1f]">
                      <span className="font-mono text-xs tabular-nums text-zinc-600 dark:text-[#88888b]">
                        {votes} controller votes
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setUpvoted((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          isUpvoted
                            ? 'border-amber-500 bg-amber-50 text-amber-900 dark:border-[#facc15]/50 dark:bg-[#1a1a12] dark:text-[#facc15]'
                            : 'border-zinc-300 bg-zinc-50 text-zinc-800 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8]'
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {isUpvoted ? 'Voted' : 'Upvote'}
                      </button>
                    </div>
                  </HoloCard>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
