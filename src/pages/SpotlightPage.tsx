import { ArrowUpRight, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { HoloCard, HoloCardLayer } from '../components/HoloCard';
import { PageReveal } from '../components/MotionPrimitives';
import { SiteFooter, SiteHeader, navigateTo } from '../components/SiteChrome';
import { RavfinaLogoMark } from '../components/icons/RavfinaIcons';
import { SPOTLIGHT_LINKS } from '../data/platformContent';

export function SpotlightPage({ currentPath }: { currentPath: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const subscribe = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'spotlight' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus(`Added ${data.subscriber?.email} to Ravfina Spotlight Dispatch.`);
      setEmail('');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Unable to subscribe.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      <SiteHeader currentPath={currentPath} />

      <main className="mx-auto max-w-2xl px-6 py-14 space-y-8">
        <PageReveal>
          <HoloCard
            variant="payment"
            intensity="full"
            className="rounded-3xl border border-amber-400/60 bg-gradient-to-br from-[#18181b] via-[#111112] to-[#231d0f] p-8 text-white shadow-2xl"
          >
            <HoloCardLayer depth={18} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RavfinaLogoMark className="h-10 w-10" />
                <div>
                  <div className="font-display text-xl font-bold">Ravfina Treasury</div>
                  <div className="font-mono text-xs text-[#facc15]">@ravfina · Official Hub</div>
                </div>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-400">
                Verified
              </span>
            </HoloCardLayer>

            <HoloCardLayer depth={26} className="mt-5">
              <p className="text-sm leading-relaxed text-zinc-300">
                Multi-currency wallets, instant ERP credit underwriting, Titanium HoloCards, MCP
                developer APIs, and autonomous AI treasury intelligence.
              </p>
            </HoloCardLayer>
          </HoloCard>
        </PageReveal>

        {SPOTLIGHT_LINKS.map((group) => (
          <section key={group.category} className="space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-[#facc15]">
              {group.category}
            </h2>
            <div className="space-y-3">
              {group.items.map((item) => (
                <HoloCard
                  key={item.path}
                  as="button"
                  type="button"
                  variant="dashboard"
                  intensity="subtle"
                  onClick={() => navigateTo(item.path)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-300 bg-white p-4 text-left hover:border-amber-500 dark:border-[#1d1d1f] dark:bg-[#111112] dark:hover:border-[#facc15]/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-zinc-950 dark:text-white">
                        {item.title}
                      </span>
                      <span className="font-mono text-[10px] uppercase text-amber-800 dark:text-[#facc15]">
                        {item.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-600 dark:text-[#a1a1aa]">
                      {item.subtitle}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-400" />
                </HoloCard>
              ))}
            </div>
          </section>
        ))}

        <HoloCard
          variant="editorial"
          intensity="subtle"
          className="rounded-2xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-[#facc15]">
            <Mail className="h-4 w-4" />
            <span>Join the Monthly Treasury Brief</span>
          </div>
          <form onSubmit={subscribe} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="min-h-[42px] flex-1 rounded-xl border border-zinc-400 bg-white px-3.5 text-sm text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
            />
            <button
              type="submit"
              className="ravfina-cta-tactile min-h-[42px] rounded-xl border border-amber-500/70 bg-[#facc15] px-5 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent"
            >
              Join Brief
            </button>
          </form>
          {status && (
            <p role="status" className="mt-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {status}
            </p>
          )}
        </HoloCard>
      </main>

      <SiteFooter />
    </div>
  );
}
