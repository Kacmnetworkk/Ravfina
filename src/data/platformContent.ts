import appendOnlyRaw from '../content/blog/append-only-ledgers.mdx?raw';
import underwritingRaw from '../content/blog/automated-underwriting.mdx?raw';
import makerCheckerRaw from '../content/blog/maker-checker-governance.mdx?raw';
import unifiedApiRaw from '../content/blog/unified-api-mcp-openapi.mdx?raw';
import corporateCardsDocRaw from '../content/docs/corporate-cards.mdx?raw';
import ledgerIdempotencyDocRaw from '../content/docs/ledger-idempotency.mdx?raw';
import quickstartDocRaw from '../content/docs/quickstart.mdx?raw';
import teamsBillingDocRaw from '../content/docs/teams-billing-resend.mdx?raw';
import { parseMdxDocument } from '../domain/platform';

export interface BlogPostEntry {
  slug: string;
  title: string;
  topic: string;
  publishedAt: string;
  author: string;
  readingTime: string;
  summary: string;
  raw: string;
  plainText: string;
}

export interface DocPageEntry {
  slug: string;
  title: string;
  section: string;
  order: number;
  updatedAt: string;
  summary: string;
  raw: string;
  plainText: string;
}

export interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  category: 'Core Ledger' | 'AI & MCP' | 'Cards & Holo UI' | 'Billing & Teams';
  title: string;
  summary: string;
  highlights: string[];
}

export interface RoadmapItem {
  id: string;
  quarter: string;
  status: 'Shipped' | 'In Progress' | 'Planned';
  title: string;
  description: string;
  votes: number;
}

export interface JournalChapter {
  id: string;
  number: string;
  title: string;
  readingMinutes: number;
  epigraph: string;
  paragraphs: string[];
  marginNote: string;
}

export interface JournalBook {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  edition: string;
  coverImage: string;
  accentHex: string;
  chapters: JournalChapter[];
}

function buildBlogEntry(raw: string): BlogPostEntry {
  const parsed = parseMdxDocument(raw);
  return {
    slug: parsed.frontmatter.slug ?? 'untitled-post',
    title: parsed.frontmatter.title ?? 'Untitled Entry',
    topic: parsed.frontmatter.topic ?? 'Engineering',
    publishedAt: parsed.frontmatter.publishedAt ?? '2026-11-01',
    author: parsed.frontmatter.author ?? 'Ravfina Editorial',
    readingTime: parsed.frontmatter.readingTime ?? '4 min read',
    summary: parsed.frontmatter.summary ?? '',
    raw,
    plainText: raw.toLowerCase(),
  };
}

function buildDocEntry(raw: string): DocPageEntry {
  const parsed = parseMdxDocument(raw);
  return {
    slug: parsed.frontmatter.slug ?? 'untitled-doc',
    title: parsed.frontmatter.title ?? 'Documentation',
    section: parsed.frontmatter.section ?? 'Guides',
    order: Number(parsed.frontmatter.order ?? '99'),
    updatedAt: parsed.frontmatter.updatedAt ?? '2026-11-01',
    summary: parsed.frontmatter.summary ?? '',
    raw,
    plainText: raw.toLowerCase(),
  };
}

export const BLOG_POSTS: BlogPostEntry[] = [
  buildBlogEntry(appendOnlyRaw),
  buildBlogEntry(underwritingRaw),
  buildBlogEntry(unifiedApiRaw),
  buildBlogEntry(makerCheckerRaw),
].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export const DOC_PAGES: DocPageEntry[] = [
  buildDocEntry(quickstartDocRaw),
  buildDocEntry(ledgerIdempotencyDocRaw),
  buildDocEntry(corporateCardsDocRaw),
  buildDocEntry(teamsBillingDocRaw),
].sort((a, b) => a.order - b.order);

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: 'chg-260',
    version: 'v2.6.0',
    date: '2026-11-16',
    category: 'AI & MCP',
    title: 'Unified REST, MCP JSON-RPC & OpenAPI 3.1 Registry',
    summary:
      'Generated live OpenAPI 3.1 specifications and Model Context Protocol tools directly from the shared Zod operations catalog.',
    highlights: [
      'Live /api/v1/openapi.json and /api/v1/mcp endpoints backed by one API_OPERATIONS source',
      'Streaming Treasury Copilot on /chat with inline widget cards',
    ],
  },
  {
    id: 'chg-250',
    version: 'v2.5.0',
    date: '2026-11-10',
    category: 'Cards & Holo UI',
    title: '3D HoloCard Foil System & Timeline Motion Editor',
    summary:
      'Introduced spring-smoothed 3D pointer tilt, spectral rainbow foil shifts, counter-drifting sparkles, and a 4-track timeline composer.',
    highlights: [
      'Full 14° tilt intensity on corporate cards, store hardware, and spotlight identity badges',
      'Subtle 7° tilt intensity across KPI dashboard tiles, books, and case studies',
    ],
  },
  {
    id: 'chg-240',
    version: 'v2.4.0',
    date: '2026-11-02',
    category: 'Billing & Teams',
    title: 'Multi-Org Teams, Maker/Checker Wires & Resend Invitations',
    summary:
      'Launched /app/[org] workspace routing with built-in member role governance, metered billing invoices, and Resend HTML email dispatch.',
    highlights: [
      'Enforced Maker != Checker segregation of duties on transfers above $50,000',
      'Added Store checkout and Billing usage metering inside /api',
    ],
  },
];

export const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    id: 'rm-1',
    quarter: 'Q4 2026',
    status: 'Shipped',
    title: 'Integer Minor-Unit Double-Entry Ledger & Maker/Checker Approvals',
    description: 'Zero-sum debit/credit leg enforcement with idempotency keys across USD, EUR, GBP, JPY, and CAD.',
    votes: 142,
  },
  {
    id: 'rm-2',
    quarter: 'Q4 2026',
    status: 'Shipped',
    title: 'MCP Server + OpenAPI 3.1 Single-List Generator',
    description: 'Zero-drift JSON-RPC tool calling and HTTP API contracts validated via packages/contracts.',
    votes: 118,
  },
  {
    id: 'rm-3',
    quarter: 'Q1 2027',
    status: 'In Progress',
    title: 'SEPA Instant & FedNow 24/7 Rail Settlement',
    description: 'Sub-10-second programmable liquidity sweeps across European and US operating accounts.',
    votes: 96,
  },
  {
    id: 'rm-4',
    quarter: 'Q1 2027',
    status: 'Planned',
    title: 'Multi-Entity Intercompany Elimination Journals',
    description: 'Automated subsidiary FX netting and consolidated month-end close packs for NetSuite OneWorld.',
    votes: 84,
  },
];

export const JOURNAL_BOOKS: JournalBook[] = [
  {
    id: 'book-monograph',
    slug: 'architecture-of-autonomous-treasury',
    title: 'The Architecture of Autonomous Treasury',
    subtitle: 'A controller monograph on double-entry invariants, liquidity guardrails, and instant credit',
    author: 'Elena Vance & Marcus Chen',
    edition: '2026 First Edition · 3 Chapters',
    coverImage: '/src/assets/images/journal_book_cover_1794943501621.jpg',
    accentHex: '#facc15',
    chapters: [
      {
        id: 'ch-1',
        number: 'Chapter I',
        title: 'Why Float Disappears When Ledgers Are Immutable',
        readingMinutes: 5,
        epigraph: 'Every dollar in transit should carry cryptographic provenance, never a guess.',
        marginNote:
          'Rule 01: Never update a wallet balance without first writing balanced debit and credit legs in integer minor units.',
        paragraphs: [
          'For three decades, finance teams reconciled reality forty-five days after the fact. Bank CSV files arrived on Monday, ERP clearing rules ran on Wednesday, and credit underwriters asked for refreshed statements again by Friday.',
          'When an operating system models every account movement as an append-only double-entry journal in integer minor units, reconciliation ceases to be an end-of-month rescue mission. Every wire, FX conversion, and corporate card swipe emits both its ledger legs and its audit trace simultaneously.',
          'The result is not merely cleaner accounting; it is real-time borrowing capacity. When underwriters observe verified operating inflows and DSO velocity directly from the ledger, working capital moves at the speed of software.',
        ],
      },
      {
        id: 'ch-2',
        number: 'Chapter II',
        title: 'Cash Floors and the Discipline of Auto-Drawdowns',
        readingMinutes: 4,
        epigraph: 'Liquidity crises rarely announce themselves a quarter in advance.',
        marginNote:
          'Smart Trend plots safety floor proximity across 3–6 month horizons before payroll cycles hit.',
        paragraphs: [
          'Controllers rarely want maximum debt; they want certainty that Friday payroll clears even when three enterprise invoices slip by ten days. Setting a programmable cash floor transforms a revolving credit line into an invisible shock absorber.',
          'Rather than drawing $500,000 prematurely and paying idle interest, treasury automation monitors projected inflows against scheduled vendor commitments. Only when liquidity approaches the boundary does the facility replenish the operating wallet.',
        ],
      },
      {
        id: 'ch-3',
        number: 'Chapter III',
        title: 'Segregation of Duties Without Bureaucracy',
        readingMinutes: 4,
        epigraph: 'Speed without governance is fragility; governance without speed is paralysis.',
        marginNote:
          'Dual hardware-key approval engages strictly above policy thresholds while routine software renewals clear in 12ms.',
        paragraphs: [
          'High-velocity teams should never escalate a $490 developer SaaS charge to the CFO. Spend guardrails handle deterministic low-risk policy enforcement automatically using MCC allowlists and daily velocity caps.',
          'Conversely, treasury wires above $50,000 cross an explicit maker-checker boundary. The operator proposing the settlement cannot counter-sign it, giving auditors airtight dual-control evidence without slowing routine operations.',
        ],
      },
    ],
  },
  {
    id: 'book-fx-craft',
    slug: 'field-notes-on-cross-border-fx',
    title: 'Field Notes on Cross-Border FX Close',
    subtitle: 'Eliminating variance drift across USD, EUR, GBP, JPY, and CAD operating desks',
    author: 'Ravfina Capital Research',
    edition: 'Monograph Vol. II · 2 Chapters',
    coverImage: '/src/assets/images/store_ledger_folio_1794943500066.jpg',
    accentHex: '#10b981',
    chapters: [
      {
        id: 'fx-ch-1',
        number: 'Chapter I',
        title: 'Spot Locks vs. Hidden Bank Spreads',
        readingMinutes: 4,
        epigraph: 'Basis points compounded across twelve currencies quietly tax global margin.',
        marginNote:
          'Multi-currency wallets preserve native balances until settlement timing favors conversion.',
        paragraphs: [
          'Growing software and hardware businesses earn revenue in Euros and Pounds while paying cloud infrastructure in US Dollars. Converting every invoice immediately at retail bank spreads forfeits 150 to 250 basis points on every cycle.',
          'Holding native EUR and GBP wallets alongside automated interbank FX sweeps lets finance teams settle local vendors in native currency and rebalance surplus liquidity intentionally.',
        ],
      },
      {
        id: 'fx-ch-2',
        number: 'Chapter II',
        title: 'Zero-Decimal Precision for Japanese Yen Settlement',
        readingMinutes: 3,
        epigraph: 'Off-by-100 currency scaling bugs destroy controller trust overnight.',
        marginNote:
          'Formatters and settlement APIs must consult currency minor-unit exponents explicitly.',
        paragraphs: [
          'Treating every currency as having 100 subunits breaks Tokyo supplier wires instantaneously. By carrying explicit minor-unit multipliers per ISO 4217 code across shared Zod schemas and tabular formatters, JPY settles cleanly down to the single yen.',
        ],
      },
    ],
  },
];

export const AGENCY_SERVICES = [
  {
    number: '01',
    title: 'Ledger & ERP Architecture Sprint',
    duration: '3 Weeks',
    rateUsd: 28000,
    deliverable: 'Custom NetSuite / SAP chart-of-accounts mapping, automated FX elimination rules, and webhook bridge.',
  },
  {
    number: '02',
    title: 'Underwriting & Working Capital Design',
    duration: '2 Weeks',
    rateUsd: 19500,
    deliverable: 'Cash-floor sweep simulation, automated drawdown triggers, and covenant reporting packs.',
  },
  {
    number: '03',
    title: 'Holographic Fintech Product Systems',
    duration: '4 Weeks',
    rateUsd: 36000,
    deliverable: 'Custom corporate card issuance portals, 3D HoloCard brand surfaces, and tokenized design systems.',
  },
];

export const AGENCY_CASE_STUDIES = [
  {
    id: 'cs-vanguard',
    client: 'Vanguard Robotics',
    sector: 'Autonomous Logistics',
    metric: '-72% Close Time',
    summary: 'Replaced 14 regional spreadsheets with multi-currency Ravfina wallets and automated NetSuite journal posting.',
    quote: 'Ravfina Studio delivered a production treasury and card governance stack before our Series B audit closed.',
  },
  {
    id: 'cs-helion',
    client: 'Helion Bio',
    sector: 'Cross-Border Biotech',
    metric: '+4.92% Yield',
    summary: 'Mobilized $9.4M in idle clinical trial reserves into laddered 90-day T-Bills with one-click drawdown safety.',
    quote: 'The cash floor guardrail saved us from drawing debt prematurely while unlocking institutional Treasury yields.',
  },
  {
    id: 'cs-northstar',
    client: 'Northstar Cloud',
    sector: 'B2B Infrastructure',
    metric: '11ms Auth',
    summary: 'Deployed 120 vendor-locked virtual cards across infrastructure squads with zero restricted MCC leakage.',
    quote: 'Every engineer gets fast card issuance while Finance keeps absolute rule control over cloud and software spend.',
  },
];

export const SPOTLIGHT_LINKS = [
  {
    category: 'Live Product Surfaces',
    items: [
      {
        title: 'Launch Signed-In Treasury Workspace',
        subtitle: 'Open /app/vanguard-robotics with live wallets, Teams & HoloCards',
        path: '/app/vanguard-robotics',
        badge: 'Workspace',
      },
      {
        title: 'Ask Ravfina AI Treasury Copilot',
        subtitle: 'Streaming agent analysis with live financial widgets',
        path: '/chat',
        badge: 'AI Agent',
      },
      {
        title: 'Inspect 3D HoloCard Timeline Editor',
        subtitle: 'Compose animated card motion reels & export JSON keyframes',
        path: '/editor',
        badge: 'Studio Tool',
      },
    ],
  },
  {
    category: 'Developers, Hardware & Monographs',
    items: [
      {
        title: 'API Hub: REST, MCP & OpenAPI 3.1',
        subtitle: 'Generated from one Zod registry · Includes Billing & Invoices',
        path: '/api',
        badge: 'Developer',
      },
      {
        title: 'Ravfina Provisioning Store',
        subtitle: 'FIDO2 hardware keys, Titanium Corporate Cards & Ledger Folios',
        path: '/store',
        badge: 'Store',
      },
      {
        title: 'Treasury Architecture Monographs',
        subtitle: 'Read editorial chapters on immutable ledgers & cash floors',
        path: '/journal',
        badge: 'Journal',
      },
    ],
  },
];

export const INITIAL_EDITOR_TRACKS = [
  {
    id: 'clip-foil',
    track: 'Foil & Spectrum',
    label: 'Rainbow Spectrum Sweep',
    startSec: 0,
    durationSec: 4.5,
    hueShiftDeg: 45,
    tiltDeg: 11,
    glareBoost: 0.9,
    color: '#facc15',
  },
  {
    id: 'clip-tilt',
    track: '3D Camera Tilt',
    label: 'Card Perspective Entrance',
    startSec: 0.4,
    durationSec: 3.6,
    hueShiftDeg: 18,
    tiltDeg: 13,
    glareBoost: 0.85,
    color: '#10b981',
  },
  {
    id: 'clip-sparkle',
    track: 'Sparkle Parallax',
    label: 'Counter-Drift Micro Glints',
    startSec: 1.2,
    durationSec: 4.2,
    hueShiftDeg: 90,
    tiltDeg: 8,
    glareBoost: 0.95,
    color: '#38bdf8',
  },
  {
    id: 'clip-typography',
    track: 'HUD Callouts',
    label: 'Balance & PAN Reveal',
    startSec: 0.8,
    durationSec: 4.8,
    hueShiftDeg: 12,
    tiltDeg: 6,
    glareBoost: 0.65,
    color: '#f43f5e',
  },
];
