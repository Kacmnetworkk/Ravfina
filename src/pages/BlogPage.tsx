import { ArrowLeft, Calendar, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { HoloCard } from '../components/HoloCard';
import { MdxRenderer } from '../components/MdxRenderer';
import { PageReveal, StaggerGroup, StaggerItem } from '../components/MotionPrimitives';
import { SiteFooter, SiteHeader, navigateTo } from '../components/SiteChrome';
import { BookMonographIcon } from '../components/icons/RavfinaIcons';
import { BLOG_POSTS } from '../data/platformContent';

export function BlogPage({ currentPath }: { currentPath: string }) {
  const slugParam = currentPath.startsWith('/blog/')
    ? currentPath.slice('/blog/'.length).replace(/\/$/, '')
    : null;

  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'archive'>('grid');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const topics = ['All', ...Array.from(new Set(BLOG_POSTS.map((p) => p.topic)))];
  const filteredPosts = BLOG_POSTS.filter(
    (p) => selectedTopic === 'All' || p.topic === selectedTopic,
  );
  const activePost = slugParam ? BLOG_POSTS.find((p) => p.slug === slugParam) ?? null : null;

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    setSubscribing(true);
    setNewsletterMsg(null);
    try {
      const res = await fetch('/api/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, source: 'blog' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setNewsletterMsg({
        ok: true,
        text: `Subscribed ${data.subscriber?.email}. You will receive our next treasury architecture dispatch.`,
      });
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Subscription failed.',
      });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      <SiteHeader currentPath={currentPath} />

      <main className="mx-auto max-w-6xl px-6 py-14">
        {activePost ? (
          <PageReveal>
            <button
              type="button"
              onClick={() => navigateTo('/blog')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 hover:underline dark:text-[#facc15]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to all MDX dispatches
            </button>

            <HoloCard
              variant="editorial"
              intensity="subtle"
              className="mt-6 rounded-2xl border border-zinc-300 bg-white p-8 sm:p-10 dark:border-[#1d1d1f] dark:bg-[#111112]"
            >
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-600 dark:text-[#88888b]">
                <span className="font-semibold text-amber-800 dark:text-[#facc15]">
                  {activePost.topic}
                </span>
                <span>·</span>
                <span>{activePost.publishedAt}</span>
                <span>·</span>
                <span>{activePost.readingTime}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-600 dark:text-[#a1a1aa]">
                By {activePost.author}
              </p>

              <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-[#1d1d1f]">
                <MdxRenderer source={activePost.raw} />
              </div>
            </HoloCard>
          </PageReveal>
        ) : (
          <div className="space-y-10">
            <PageReveal>
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                    <BookMonographIcon className="h-4 w-4" />
                    <span>Ravfina Engineering &amp; Capital Dispatch (MDX)</span>
                  </div>
                  <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight">
                    Technical dispatches on ledgers, underwriting, and security.
                  </h1>
                  <p className="mt-2 text-base text-zinc-700 dark:text-[#a1a1aa]">
                    Powered by compiled `.mdx` essays with topic taxonomy, chronological archive,
                    and real newsletter persistence.
                  </p>
                </div>

                <div className="flex items-center gap-1 rounded-xl border border-zinc-300 bg-white p-1 dark:border-[#1d1d1f] dark:bg-[#111112]">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
                      viewMode === 'grid'
                        ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                        : 'text-zinc-600 dark:text-[#88888b]'
                    }`}
                  >
                    Featured Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('archive')}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
                      viewMode === 'archive'
                        ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                        : 'text-zinc-600 dark:text-[#88888b]'
                    }`}
                  >
                    Archive Index
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {topics.map((topic) => {
                  const active = selectedTopic === topic;
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setSelectedTopic(topic)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-amber-500 bg-amber-50 text-amber-900 dark:border-[#facc15]/50 dark:bg-[#1a1a12] dark:text-[#facc15]'
                          : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#a1a1aa]'
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </PageReveal>

            {viewMode === 'grid' ? (
              <StaggerGroup className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {filteredPosts.map((post, idx) => (
                  <StaggerItem key={post.slug} index={idx}>
                    <HoloCard
                      as="button"
                      type="button"
                      variant="editorial"
                      intensity="subtle"
                      onClick={() => navigateTo(`/blog/${post.slug}`)}
                      className="flex h-full w-full flex-col justify-between rounded-2xl border border-zinc-300 bg-white p-7 text-left hover:border-amber-500 dark:border-[#1d1d1f] dark:bg-[#111112] dark:hover:border-[#facc15]/50"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-mono text-xs text-zinc-600 dark:text-[#88888b]">
                          <span className="font-semibold text-amber-800 dark:text-[#facc15]">
                            {post.topic}
                          </span>
                          <span>·</span>
                          <span>{post.publishedAt}</span>
                          <span>·</span>
                          <span>{post.readingTime}</span>
                        </div>
                        <h2 className="mt-3 font-display text-xl font-bold text-zinc-950 dark:text-white">
                          {post.title}
                        </h2>
                        <p className="mt-2.5 text-sm leading-relaxed text-zinc-700 dark:text-[#a1a1aa]">
                          {post.summary}
                        </p>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4 text-xs dark:border-[#1d1d1f]">
                        <span className="text-zinc-600 dark:text-[#88888b]">{post.author}</span>
                        <span className="font-semibold text-amber-800 dark:text-[#facc15]">
                          Read MDX Article →
                        </span>
                      </div>
                    </HoloCard>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            ) : (
              <HoloCard
                variant="editorial"
                intensity="subtle"
                className="rounded-2xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]"
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-[#facc15]">
                  <Calendar className="h-4 w-4" />
                  <span>Chronological Archive ({filteredPosts.length} MDX Entries)</span>
                </div>
                <div className="mt-4 divide-y divide-zinc-200 dark:divide-[#1d1d1f]">
                  {filteredPosts.map((post) => (
                    <button
                      key={post.slug}
                      type="button"
                      onClick={() => navigateTo(`/blog/${post.slug}`)}
                      className="flex w-full flex-col justify-between gap-2 py-4 text-left hover:bg-zinc-50 sm:flex-row sm:items-center px-2 rounded-lg dark:hover:bg-[#161618]"
                    >
                      <div>
                        <div className="font-display text-base font-semibold text-zinc-950 dark:text-white">
                          {post.title}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-600 dark:text-[#88888b]">
                          {post.topic} · {post.author}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-amber-800 dark:text-[#facc15]">
                        {post.publishedAt}
                      </span>
                    </button>
                  ))}
                </div>
              </HoloCard>
            )}

            {/* Newsletter Subscription */}
            <HoloCard
              variant="product"
              intensity="subtle"
              className="rounded-2xl border border-amber-400 bg-gradient-to-r from-amber-50 to-white p-8 dark:border-[#facc15]/30 dark:from-[#1a1a12] dark:to-[#111112]"
            >
              <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-[#facc15]">
                    <Mail className="h-4 w-4" />
                    <span>Treasury Architecture Newsletter</span>
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold">
                    Monthly ledger engineering &amp; capital benchmarks.
                  </h2>
                  <p className="mt-1.5 text-sm text-zinc-700 dark:text-[#a1a1aa]">
                    No fluff—just double-entry engineering patterns, FX variance studies, and release
                    changelogs.
                  </p>
                </div>

                <form onSubmit={handleSubscribe} className="flex flex-col gap-3 sm:flex-row lg:col-span-5">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="cfo@company.com"
                    aria-label="Newsletter email address"
                    className="min-h-[44px] flex-1 rounded-xl border border-zinc-400 bg-white px-3.5 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 focus:border-amber-700 focus:outline-none dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={subscribing}
                    className="ravfina-cta-tactile min-h-[44px] rounded-xl border border-amber-500/70 bg-[#facc15] px-5 py-2 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent whitespace-nowrap"
                  >
                    {subscribing ? 'Saving...' : 'Subscribe'}
                  </button>
                </form>
              </div>
              {newsletterMsg && (
                <div
                  role="status"
                  className={`mt-4 rounded-lg border px-4 py-2.5 text-xs font-medium ${
                    newsletterMsg.ok
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200'
                  }`}
                >
                  {newsletterMsg.text}
                </div>
              )}
            </HoloCard>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
