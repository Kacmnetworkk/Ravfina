import {
  ArrowRight,
  Building2,
  Check,
  Layers,
  Menu,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { validateLeadCapture } from '../domain/treasury';
import { HoloCard } from './HoloCard';
import { PlatformSuiteModal, SiteFooter } from './SiteChrome';
import { TestimonialsSection } from './TestimonialsSection';
import { ThemeToggleButton } from './ThemeToggleButton';
import {
  CardChipGovernanceIcon,
  ErpLedgerSyncIcon,
  HardwareShieldKeyIcon,
  TreasuryVaultIcon,
} from './icons/RavfinaIcons';

interface LandingPageProps {
  onStartOnboarding: () => void;
  onExploreWorkspace: () => void;
}

export function LandingPage({
  onStartOnboarding,
  onExploreWorkspace,
}: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [suiteModalOpen, setSuiteModalOpen] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [cardImgFailed, setCardImgFailed] = useState(false);

  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [monthlyVolume, setMonthlyVolume] = useState('');
  const [formErrors, setFormErrors] = useState<
    Partial<Record<'workEmail' | 'companyName' | 'monthlyVolume', string>>
  >({});
  const [submittedCompany, setSubmittedCompany] = useState<string | null>(null);

  const handleLeadSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateLeadCapture({ workEmail, companyName, monthlyVolume });
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }
    setFormErrors({});
    setSubmittedCompany(companyName.trim());
  };

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="animate-ravfina-fade-in sticky top-0 z-40 border-b border-zinc-300 bg-white/95 backdrop-blur-sm dark:border-[#1d1d1f] dark:bg-[#0b0b0c]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Single-line brand wordmark */}
          <a
            href="#top"
            className="font-display text-xl font-bold tracking-tight text-zinc-950 dark:text-white whitespace-nowrap shrink-0"
          >
            Ravfina
          </a>

          {/* Zone 2: 4 concise single-line nav links + theme toggle in main navigation menu */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600 dark:text-[#88888b]"
          >
            <a
              href="#treasury"
              className="ravfina-nav-link ravfina-focus-ring whitespace-nowrap shrink-0 hover:text-zinc-950 dark:hover:text-white"
            >
              Treasury
            </a>
            <a
              href="#capital"
              className="ravfina-nav-link ravfina-focus-ring whitespace-nowrap shrink-0 hover:text-zinc-950 dark:hover:text-white"
            >
              Capital
            </a>
            <a
              href="#cards"
              className="ravfina-nav-link ravfina-focus-ring whitespace-nowrap shrink-0 hover:text-zinc-950 dark:hover:text-white"
            >
              Cards
            </a>
            <a
              href="#reports"
              className="ravfina-nav-link ravfina-focus-ring whitespace-nowrap shrink-0 hover:text-zinc-950 dark:hover:text-white"
            >
              Reports
            </a>
            <button
              type="button"
              onClick={() => setSuiteModalOpen(true)}
              className="ravfina-interactive-btn ravfina-focus-ring inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:border-amber-500 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#d4d4d8] dark:hover:border-[#facc15]/50 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              <Layers className="h-3.5 w-3.5 text-amber-700 dark:text-[#facc15]" aria-hidden="true" />
              <span>All Apps</span>
            </button>
            <span className="h-4 w-px bg-zinc-300 dark:bg-[#1d1d1f]" aria-hidden="true" />
            <ThemeToggleButton compact />
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onStartOnboarding}
              className="ravfina-cta-tactile ravfina-focus-ring hidden sm:inline-flex items-center justify-center rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent whitespace-nowrap shrink-0"
            >
              Start Free SMB Setup
            </button>
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-900 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#d4d4d8] md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-zinc-300 bg-white px-6 py-4 dark:border-[#1d1d1f] dark:bg-[#111112] md:hidden">
            <nav aria-label="Mobile navigation" className="flex flex-col gap-3 text-sm font-medium text-zinc-800 dark:text-[#d4d4d8]">
              <a
                href="#treasury"
                onClick={() => setMobileMenuOpen(false)}
                className="ravfina-nav-link ravfina-focus-ring self-start py-1.5 hover:text-zinc-950 dark:hover:text-white"
              >
                Treasury
              </a>
              <a
                href="#capital"
                onClick={() => setMobileMenuOpen(false)}
                className="ravfina-nav-link ravfina-focus-ring self-start py-1.5 hover:text-zinc-950 dark:hover:text-white"
              >
                Capital
              </a>
              <a
                href="#cards"
                onClick={() => setMobileMenuOpen(false)}
                className="ravfina-nav-link ravfina-focus-ring self-start py-1.5 hover:text-zinc-950 dark:hover:text-white"
              >
                Cards
              </a>
              <a
                href="#reports"
                onClick={() => setMobileMenuOpen(false)}
                className="ravfina-nav-link ravfina-focus-ring self-start py-1.5 hover:text-zinc-950 dark:hover:text-white"
              >
                Reports
              </a>
              <div className="pt-1">
                <ThemeToggleButton />
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStartOnboarding();
                }}
                className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-amber-500/70 bg-[#facc15] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent"
              >
                Start Treasury Setup
              </button>
            </nav>
          </div>
        )}
      </header>

      <main id="top">
        {/* Hero Split Section */}
        <section className="animate-ravfina-fade-in-delayed bg-gradient-to-b from-amber-50/70 via-[#f4f4f6] to-[#f4f4f6] dark:from-[#161612] dark:via-[#0b0b0c] dark:to-[#0b0b0c]">
          <div className="mx-auto max-w-7xl px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
            <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
              <div className="flex flex-col justify-between lg:col-span-6">
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-[#facc15]">
                    Ravfina Treasury Platform · Built for Startups &amp; SMEs
                  </p>
                  <h1 className="mt-4 font-display text-[clamp(2.25rem,4vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-zinc-950 dark:text-white text-balance">
                    Institutional treasury, credit, and card governance in one ledger.
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-700 dark:text-[#a1a1aa] lg:text-lg">
                    Ravfina unifies real-time multi-currency liquidity, revolving business funding,
                    programmable corporate cards, and automated NetSuite, SAP, and QuickBooks
                    reconciliation under hardware-enforced security.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={onStartOnboarding}
                      className="ravfina-cta-tactile ravfina-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-amber-500/70 bg-[#facc15] px-6 py-3 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent whitespace-nowrap shrink-0"
                    >
                      Get Funded &amp; Control Spend
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={onExploreWorkspace}
                      className="ravfina-interactive-btn ravfina-focus-ring inline-flex min-h-[44px] items-center rounded-lg border border-zinc-400 bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:border-zinc-600 hover:bg-zinc-100 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-white dark:hover:border-[#2e2e32] dark:hover:bg-[#1d1d1f] whitespace-nowrap shrink-0"
                    >
                      Explore Live Workspace
                    </button>
                  </div>
                </div>

                <div className="mt-10 border-t border-zinc-300 pt-5 text-xs font-medium text-zinc-600 dark:border-[#1d1d1f] dark:text-[#88888b]">
                  SOC 2 Type II Audited · PCI-DSS Level 1 · Plaid Open Banking · Hardware WebAuthn MFA
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full min-h-[300px] overflow-hidden rounded-xl border border-zinc-300 bg-white dark:border-[#1d1d1f] dark:bg-[#111112]">
                  {heroImgFailed ? (
                    <div className="flex h-full min-h-[300px] flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-white p-8 text-center dark:from-[#1a1a12] dark:to-[#111112]">
                      <HardwareShieldKeyIcon className="h-10 w-10 text-amber-800 dark:text-[#facc15]" />
                      <p className="mt-3 font-display text-lg font-semibold text-zinc-950 dark:text-white">
                        Ravfina Hardware &amp; Ledger Architecture
                      </p>
                    </div>
                  ) : (
                    <img
                      src="/src/assets/images/hero_ravfina_treasury_1794922665161.jpg"
                      alt="Ravfina hardware security key beside corporate financial ledger on limestone desk"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Full-width 4-column KPI strip below hero */}
            <div className="mt-12 overflow-hidden rounded-xl border border-zinc-300 bg-zinc-200 dark:border-[#1d1d1f] dark:bg-[#1d1d1f]">
              <div className="h-1 w-full bg-ravfina-yellow-gradient" aria-hidden="true" />
              <div className="grid grid-cols-2 gap-px lg:grid-cols-4">
                <div className="bg-white p-6 dark:bg-[#111112]">
                  <div className="font-mono text-2xl font-semibold tabular-nums text-zinc-950 dark:text-white lg:text-3xl">
                    $4.2B+
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-[#88888b]">Annualized treasury volume settled</div>
                </div>
                <div className="bg-white p-6 dark:bg-[#111112]">
                  <div className="font-mono text-2xl font-semibold tabular-nums text-amber-800 dark:text-[#facc15] lg:text-3xl">
                    5.12%
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-[#88888b]">Peak 90-day T-Bill portfolio yield</div>
                </div>
                <div className="bg-white p-6 dark:bg-[#111112]">
                  <div className="font-mono text-2xl font-semibold tabular-nums text-zinc-950 dark:text-white lg:text-3xl">
                    &lt; 12ms
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-[#88888b]">Real-time card MCC &amp; fraud screening</div>
                </div>
                <div className="bg-white p-6 dark:bg-[#111112]">
                  <div className="font-mono text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 lg:text-3xl">
                    -68%
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-[#88888b]">Reduction in month-end close hours</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities Asymmetric Bento Grid */}
        <section id="treasury" className="scroll-mt-20 border-t border-zinc-300 bg-[#f4f4f6] py-20 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-zinc-950 dark:text-white text-balance">
                Purpose-built financial control from seed stage to global scale.
              </h2>
              <p className="mt-3 text-base text-zinc-700 dark:text-[#a1a1aa]">
                Every treasury workflow connects directly to your bank feeds, corporate cards, and
                ERP general ledger without manual spreadsheet exports.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* 01 Wide Feature */}
              <HoloCard
                as="article"
                id="capital"
                variant="dashboard"
                intensity="subtle"
                className="scroll-mt-24 flex flex-col justify-between rounded-xl border border-zinc-300 bg-white p-7 dark:border-[#1d1d1f] dark:bg-[#111112] lg:col-span-2"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                    <TreasuryVaultIcon className="h-4 w-4" />
                    <span>01. Real-Time Digital Wallet &amp; Credit Capital</span>
                  </div>
                  <h3 className="mt-3 font-display text-xl font-semibold text-zinc-950 dark:text-white">
                    Multi-currency accounts &amp; automated credit underwriting
                  </h3>
                  <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-zinc-700 dark:text-[#a1a1aa]">
                    Hold USD, EUR, GBP, CAD, and JPY balances with instant FX rebalancing. Pull live
                    bank and ERP data for one-click credit underwriting with interactive term
                    sliders and automatic working-capital drawdowns when cash dips.
                  </p>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-zinc-200 pt-5 font-mono tabular-nums dark:border-[#1d1d1f]">
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-[#88888b]">Revolver Limit</div>
                    <div className="mt-0.5 text-base font-semibold text-zinc-950 dark:text-white">$1.50M</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-[#88888b]">FX Conversion</div>
                    <div className="mt-0.5 text-base font-semibold text-amber-800 dark:text-[#facc15]">T+0 Interbank</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-[#88888b]">Treasury Sweep</div>
                    <div className="mt-0.5 text-base font-semibold text-zinc-950 dark:text-white">FDIC + T-Bills</div>
                  </div>
                </div>
              </HoloCard>

              {/* 02 Card Control Showcase */}
              <HoloCard
                as="article"
                id="cards"
                variant="payment"
                intensity="full"
                className="scroll-mt-24 flex flex-col justify-between rounded-xl border border-zinc-300 bg-white dark:border-[#1d1d1f] dark:bg-[#111112]"
              >
                <div className="aspect-[4/3] w-full overflow-hidden border-b border-zinc-200 bg-zinc-100 dark:border-[#1d1d1f] dark:bg-[#0d0d0e]">
                  {cardImgFailed ? (
                    <div className="flex h-full items-center justify-center p-6 text-zinc-600 dark:text-[#88888b]">
                      <CardChipGovernanceIcon className="h-8 w-8 text-amber-800 dark:text-[#facc15]" />
                    </div>
                  ) : (
                    <img
                      src="/src/assets/images/showcase_corporate_cards_1794922663122.jpg"
                      alt="Matte obsidian and brushed silver physical corporate cards on stone surface"
                      referrerPolicy="no-referrer"
                      onError={() => setCardImgFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                    <CardChipGovernanceIcon className="h-4 w-4" />
                    <span>02. Physical &amp; Virtual Cards</span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold text-zinc-950 dark:text-white">
                    MCC allowlists &amp; velocity caps
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-[#a1a1aa]">
                    Issue vendor-locked virtual cards or metal physical cards with per-transaction,
                    daily, and Merchant Category Code enforcement at authorization time.
                  </p>
                </div>
              </HoloCard>

              {/* 03 Multi-Currency ERP */}
              <HoloCard
                as="article"
                id="integrations"
                variant="dashboard"
                intensity="subtle"
                className="scroll-mt-24 flex flex-col justify-between rounded-xl border border-zinc-300 bg-white p-7 dark:border-[#1d1d1f] dark:bg-[#111112]"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                    <ErpLedgerSyncIcon className="h-4 w-4" />
                    <span>03. Multi-Currency ERP Reconciliation</span>
                  </div>
                  <h3 className="mt-3 font-display text-xl font-semibold text-zinc-950 dark:text-white">
                    Native NetSuite, SAP &amp; QuickBooks sync
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-zinc-700 dark:text-[#a1a1aa]">
                    Map Ravfina GL categories to your chart of accounts during onboarding. Flag FX
                    rate variances automatically and push matched journal entries via webhook or REST
                    API.
                  </p>
                </div>
                <div className="mt-6 border-t border-zinc-200 pt-4 text-xs font-medium text-zinc-600 dark:border-[#1d1d1f] dark:text-[#88888b]">
                  Plaid Open Banking · NetSuite SuiteTalk · SAP OData · QuickBooks v3
                </div>
              </HoloCard>

              {/* 04 Security & Fraud */}
              <HoloCard
                as="article"
                id="security"
                variant="dashboard"
                intensity="subtle"
                className="scroll-mt-24 flex flex-col justify-between rounded-xl border border-amber-400 bg-gradient-to-r from-amber-50 to-white p-7 text-zinc-950 dark:border-[#facc15]/25 dark:from-[#1a1a12] dark:to-[#111112] dark:text-white lg:col-span-2"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                    <HardwareShieldKeyIcon className="h-4 w-4" />
                    <span>04. Institutional Security &amp; Real-Time Fraud Engine</span>
                  </div>
                  <h3 className="mt-3 font-display text-xl font-semibold text-zinc-950 dark:text-white">
                    Hardware-key MFA, dual-wire approval, and instant card freeze
                  </h3>
                  <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-zinc-800 dark:text-[#d4d4d8]">
                    Protect treasury operations with mandatory WebAuthn FIDO2 keys, configurable
                    dual-approval thresholds for high-value wires, and automated alerts on velocity
                    spikes or restricted MCC attempts.
                  </p>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-4 border-t border-amber-300/70 pt-5 dark:border-[#1d1d1f] sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-[#88888b]">Authentication</div>
                    <div className="mt-0.5 text-sm font-semibold text-zinc-950 dark:text-white">FIDO2 / WebAuthn + TOTP</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-[#88888b]">API Access</div>
                    <div className="mt-0.5 text-sm font-semibold text-zinc-950 dark:text-white">Scoped Keys &amp; HMAC Webhooks</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-[#88888b]">Compliance</div>
                    <div className="mt-0.5 text-sm font-semibold text-amber-800 dark:text-[#facc15]">SOC 2 Type II · PCI Level 1</div>
                  </div>
                </div>
              </HoloCard>
            </div>
          </div>
        </section>

        {/* Dedicated CFO Proof Metrics & Client Success Stories Section */}
        <TestimonialsSection onStartOnboarding={onStartOnboarding} />

        {/* Conversion / Lead Capture Form */}
        <section id="request-access" className="scroll-mt-20 border-t border-zinc-300 bg-[#f4f4f6] py-20 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-xl border border-zinc-300 bg-white p-8 dark:border-[#1d1d1f] dark:bg-[#111112] lg:p-10">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                    <span>Enterprise Onboarding</span>
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                    Launch Ravfina for your finance team.
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-[#a1a1aa]">
                    Start self-serve configuration immediately in our guided wizard or request a
                    dedicated treasury architecture review with our capital markets team.
                  </p>
                  <button
                    type="button"
                    onClick={onStartOnboarding}
                    className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-400 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:border-zinc-600 hover:bg-zinc-100 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:hover:border-[#2e2e32] dark:hover:bg-[#1d1d1f] whitespace-nowrap"
                  >
                    Launch Self-Serve Wizard
                    <ArrowRight className="h-4 w-4 text-amber-800 dark:text-[#facc15]" aria-hidden="true" />
                  </button>
                </div>

                <div className="lg:col-span-7">
                  {submittedCompany ? (
                    <div
                      role="status"
                      className="flex h-full flex-col justify-center rounded-lg border border-emerald-400 bg-emerald-50 p-6 dark:border-emerald-500/40 dark:bg-[#0b0b0c]"
                    >
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        <Check className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <h3 className="mt-4 font-display text-lg font-semibold text-zinc-950 dark:text-white">
                        Treasury review scheduled for {submittedCompany}
                      </h3>
                      <p className="mt-2 text-sm text-zinc-700 dark:text-[#a1a1aa]">
                        Confirmation dispatched to <span className="font-medium text-zinc-950 dark:text-white">{workEmail}</span>.
                        You can proceed straight into the guided Ravfina treasury onboarding wizard
                        now.
                      </p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={onStartOnboarding}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-amber-500/70 bg-[#facc15] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent"
                        >
                          Continue to Onboarding Wizard
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSubmittedCompany(null);
                            setWorkEmail('');
                            setCompanyName('');
                            setMonthlyVolume('');
                          }}
                          className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-[#88888b] dark:hover:text-white"
                        >
                          Submit another inquiry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleLeadSubmit} noValidate className="space-y-4">
                      <div>
                        <label
                          htmlFor="lead-email"
                          className="block text-sm font-medium text-zinc-800 dark:text-[#d4d4d8]"
                        >
                          Work Email
                        </label>
                        <input
                          id="lead-email"
                          type="email"
                          value={workEmail}
                          onChange={(e) => setWorkEmail(e.target.value)}
                          placeholder="controller@company.com"
                          className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-500 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:placeholder:text-[#88888b] dark:focus:border-[#facc15]"
                        />
                        {formErrors.workEmail && (
                          <p className="mt-1 text-xs font-medium text-red-700 dark:text-[#ff4d4d]">{formErrors.workEmail}</p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="lead-company"
                          className="block text-sm font-medium text-zinc-800 dark:text-[#d4d4d8]"
                        >
                          Company Legal Name
                        </label>
                        <input
                          id="lead-company"
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Meridian Systems Inc."
                          className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-500 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:placeholder:text-[#88888b] dark:focus:border-[#facc15]"
                        />
                        {formErrors.companyName && (
                          <p className="mt-1 text-xs font-medium text-red-700 dark:text-[#ff4d4d]">{formErrors.companyName}</p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="lead-volume"
                          className="block text-sm font-medium text-zinc-800 dark:text-[#d4d4d8]"
                        >
                          Monthly Treasury &amp; Card Volume
                        </label>
                        <select
                          id="lead-volume"
                          value={monthlyVolume}
                          onChange={(e) => setMonthlyVolume(e.target.value)}
                          className="mt-1.5 block w-full rounded-lg border border-zinc-400 bg-white px-3.5 py-2.5 text-sm text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-white dark:focus:border-[#facc15]"
                        >
                          <option value="">Select monthly volume tier</option>
                          <option value="$100K - $500K">$100K – $500K / month</option>
                          <option value="$500K - $2M">$500K – $2M / month</option>
                          <option value="$2M - $10M">$2M – $10M / month</option>
                          <option value="$10M+">$10M+ / month</option>
                        </select>
                        {formErrors.monthlyVolume && (
                          <p className="mt-1 text-xs font-medium text-red-700 dark:text-[#ff4d4d]">{formErrors.monthlyVolume}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="ravfina-cta-tactile ravfina-focus-ring inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-amber-500/70 bg-[#facc15] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent"
                      >
                        Get Your Small Business Funding Plan
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <PlatformSuiteModal
        open={suiteModalOpen}
        onClose={() => setSuiteModalOpen(false)}
        currentPath="/"
      />
    </div>
  );
}
