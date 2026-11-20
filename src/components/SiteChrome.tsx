import { ChevronRight, Command, Layers, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  AgentSparkIcon,
  ApiBridgeIcon,
  BookMonographIcon,
  HoloPrismIcon,
  RavfinaLogoMark,
  StoreVaultIcon,
  TeamOrbitalIcon,
  TimelineWaveformIcon,
  TreasuryVaultIcon,
} from './icons/RavfinaIcons';
import { SocialShareButtons } from './SocialShareButtons';
import { ThemeToggleButton } from './ThemeToggleButton';

export const SUITE_DESTINATIONS = [
  { group: 'Core Platform', path: '/', label: 'Landing', desc: 'Ravfina Treasury Overview', icon: TreasuryVaultIcon },
  { group: 'Core Platform', path: '/pricing', label: 'Pricing & Billing', desc: 'Transparent plans & checkout', icon: HoloPrismIcon },
  { group: 'Core Platform', path: '/app/vanguard-robotics', label: 'Dashboard (/app/[org])', desc: 'Wallets, Teams, Cards & Ledger', icon: TeamOrbitalIcon },
  { group: 'Core Platform', path: '/auth', label: 'Auth & Teams', desc: 'Multi-org sign-in & invites', icon: TeamOrbitalIcon },
  { group: 'Developers & AI', path: '/api', label: 'API · MCP · Billing', desc: 'OpenAPI 3.1, MCP RPC & Invoices', icon: ApiBridgeIcon },
  { group: 'Developers & AI', path: '/docs', label: 'Docs & Roadmap', desc: 'MDX guides, changelog & roadmap', icon: BookMonographIcon },
  { group: 'Developers & AI', path: '/chat', label: 'AI Agent Chat', desc: 'Streaming Copilot & live widgets', icon: AgentSparkIcon },
  { group: 'Developers & AI', path: '/editor', label: 'Timeline Editor', desc: 'HoloCard motion canvas & inspector', icon: TimelineWaveformIcon },
  { group: 'Editorial & Brand', path: '/blog', label: 'Blog (MDX)', desc: 'Topics, archive & newsletter', icon: BookMonographIcon },
  { group: 'Editorial & Brand', path: '/journal', label: 'Journal', desc: 'Books & chapter reading view', icon: BookMonographIcon },
  { group: 'Editorial & Brand', path: '/store', label: 'Provisioning Store', desc: 'Titanium cards, keys & cart', icon: StoreVaultIcon },
  { group: 'Editorial & Brand', path: '/agency', label: 'Ravfina Studio', desc: 'Advisory services & case studies', icon: HoloPrismIcon },
  { group: 'Editorial & Brand', path: '/spotlight', label: 'Spotlight', desc: 'Link-in-bio hub & newsletter', icon: AgentSparkIcon },
  { group: 'Editorial & Brand', path: '/legal/privacy', label: 'Legal & Compliance', desc: 'Privacy, Terms & SOC 2 Policy', icon: HoloPrismIcon },
] as const;

export function navigateTo(path: string) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname + window.location.search === path) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

interface SiteHeaderProps {
  currentPath: string;
  onOpenSuite?: () => void;
}

export function SiteHeader({ currentPath, onOpenSuite }: SiteHeaderProps) {
  const [suiteOpen, setSuiteOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSuiteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const openModal = () => {
    if (onOpenSuite) onOpenSuite();
    setSuiteOpen(true);
  };

  const navLinks = [
    { path: '/pricing', label: 'Pricing' },
    { path: '/docs', label: 'Docs' },
    { path: '/blog', label: 'Blog' },
    { path: '/api', label: 'API' },
    { path: '/store', label: 'Store' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-300 bg-white/95 backdrop-blur-sm dark:border-[#1d1d1f] dark:bg-[#0b0b0c]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3.5">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/');
            }}
            className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-zinc-950 dark:text-white whitespace-nowrap shrink-0"
          >
            <RavfinaLogoMark className="h-6 w-6 shrink-0" />
            <span>Ravfina</span>
          </a>

          {/* Zone 2: Concise single-line navigation links + Suite switcher + Theme toggle */}
          <nav
            aria-label="Platform navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-[#88888b]"
          >
            {navLinks.map((link) => {
              const active =
                currentPath === link.path || currentPath.startsWith(`${link.path}/`);
              return (
                <a
                  key={link.path}
                  href={link.path}
                  aria-current={active ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo(link.path);
                  }}
                  className={`ravfina-nav-link ravfina-focus-ring whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'text-zinc-950 font-semibold dark:text-white'
                      : 'hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}

            <button
              type="button"
              onClick={openModal}
              className="ravfina-interactive-btn ravfina-focus-ring inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:border-amber-500 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#d4d4d8] dark:hover:border-[#facc15]/50 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              <Layers className="h-3.5 w-3.5 text-amber-700 dark:text-[#facc15]" aria-hidden="true" />
              <span>All Apps</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded bg-zinc-200 px-1 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-[#1d1d1f] dark:text-[#88888b]">
                <Command className="h-2.5 w-2.5" aria-hidden="true" />K
              </kbd>
            </button>

            <span className="h-4 w-px bg-zinc-300 dark:bg-[#1d1d1f]" aria-hidden="true" />
            <ThemeToggleButton compact />
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openModal}
              className="inline-flex md:hidden items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-2 text-xs font-semibold text-zinc-800 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-white whitespace-nowrap shrink-0"
            >
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              Apps
            </button>
            <a
              href="/app/vanguard-robotics"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/app/vanguard-robotics');
              }}
              className="ravfina-cta-tactile ravfina-focus-ring inline-flex min-h-[38px] items-center justify-center rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs sm:text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent whitespace-nowrap shrink-0"
            >
              Open Workspace
            </a>
          </div>
        </div>
      </header>

      <PlatformSuiteModal open={suiteOpen} onClose={() => setSuiteOpen(false)} currentPath={currentPath} />
    </>
  );
}

export function PlatformSuiteModal({
  open,
  onClose,
  currentPath,
}: {
  open: boolean;
  onClose: () => void;
  currentPath: string;
}) {
  if (!open) return null;

  const groups = ['Core Platform', 'Developers & AI', 'Editorial & Brand'] as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ravfina Platform Suite Switcher"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="animate-ravfina-backdrop-fade fixed inset-0 z-50 flex items-start justify-center bg-black/55 p-4 pt-14 backdrop-blur-xs dark:bg-black/75"
    >
      <div className="animate-ravfina-panel-enter w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-2xl dark:border-[#1d1d1f] dark:bg-[#111112]">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-[#1d1d1f]">
          <div className="flex items-center gap-2.5">
            <RavfinaLogoMark className="h-5 w-5" />
            <span className="font-display text-base font-bold text-zinc-950 dark:text-white">
              Ravfina Platform Directory
            </span>
            <span className="font-mono text-xs text-zinc-500 dark:text-[#88888b]">
              14 Surfaces · One Ledger
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close directory"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:text-zinc-950 dark:border-[#1d1d1f] dark:text-[#88888b] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {groups.map((group) => (
              <div key={group}>
                <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-[#facc15]">
                  {group}
                </div>
                <div className="space-y-2">
                  {SUITE_DESTINATIONS.filter((d) => d.group === group).map((dest) => {
                    const Icon = dest.icon;
                    const active =
                      dest.path === '/'
                        ? currentPath === '/'
                        : currentPath === dest.path || currentPath.startsWith(`${dest.path}/`);
                    return (
                      <button
                        key={dest.path}
                        type="button"
                        onClick={() => {
                          onClose();
                          navigateTo(dest.path);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                          active
                            ? 'border-amber-500 bg-amber-50/80 dark:border-[#facc15]/50 dark:bg-[#1a1a12]'
                            : 'border-zinc-200 bg-zinc-50/70 hover:border-zinc-400 hover:bg-white dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:hover:border-[#2e2e32]'
                        }`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-800 shadow-xs dark:bg-[#161618] dark:text-[#facc15]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold text-zinc-950 dark:text-white">
                            {dest.label}
                          </div>
                          <div className="truncate text-[11px] text-zinc-600 dark:text-[#88888b]">
                            {dest.desc}
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SiteFooter() {
  const columns = [
    {
      title: 'Platform',
      links: [
        { label: 'Landing', path: '/' },
        { label: 'Pricing', path: '/pricing' },
        { label: 'Dashboard (/app/org)', path: '/app/vanguard-robotics' },
        { label: 'Auth & Teams', path: '/auth' },
        { label: 'Provisioning Store', path: '/store' },
      ],
    },
    {
      title: 'Developers & AI',
      links: [
        { label: 'API · MCP · OpenAPI', path: '/api' },
        { label: 'Docs & Roadmap', path: '/docs' },
        { label: 'AI Agent Chat', path: '/chat' },
        { label: 'Timeline Editor', path: '/editor' },
      ],
    },
    {
      title: 'Editorial & Legal',
      links: [
        { label: 'Blog (MDX)', path: '/blog' },
        { label: 'Journal Monographs', path: '/journal' },
        { label: 'Ravfina Studio Agency', path: '/agency' },
        { label: 'Spotlight Hub', path: '/spotlight' },
        { label: 'Privacy · Terms · Security', path: '/legal/privacy' },
      ],
    },
  ];

  return (
    <footer className="border-t border-zinc-300 bg-[#f4f4f6] py-12 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
      <div className="mx-auto max-w-7xl px-6 text-xs text-zinc-600 dark:text-[#88888b]">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5">
              <RavfinaLogoMark className="h-6 w-6 shrink-0" />
              <span className="font-display text-base font-bold text-zinc-950 dark:text-white">
                Ravfina
              </span>
            </div>
            <p className="mt-3 max-w-sm leading-relaxed text-zinc-600 dark:text-[#a1a1aa]">
              Institutional corporate treasury, automated working-capital underwriting, programmable
              HoloCards, and real-time multi-currency ERP reconciliation.
            </p>
            <div className="mt-4">
              <SocialShareButtons compact showCommunityLinks />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:col-span-7">
            {columns.map((col) => (
              <div key={col.title}>
                <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  {col.title}
                </div>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.path}>
                      <a
                        href={l.path}
                        onClick={(e) => {
                          e.preventDefault();
                          navigateTo(l.path);
                        }}
                        className="hover:text-zinc-950 dark:hover:text-[#facc15] transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-zinc-300 pt-5 dark:border-[#1d1d1f] sm:flex-row sm:items-center">
          <div>
            © {new Date().getFullYear()} Ravfina Financial Technologies Inc. Double-entry ledger assets
            custodied with member FDIC partner banks.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/legal/privacy"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/legal/privacy');
              }}
              className="hover:text-zinc-950 dark:hover:text-white"
            >
              Privacy
            </a>
            <a
              href="/legal/terms"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/legal/terms');
              }}
              className="hover:text-zinc-950 dark:hover:text-white"
            >
              Terms
            </a>
            <a
              href="/legal/security"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/legal/security');
              }}
              className="hover:text-zinc-950 dark:hover:text-white"
            >
              SOC 2 Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
