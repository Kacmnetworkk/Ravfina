import fs from 'fs';
import path from 'path';
import type {
  ApprovalRequest,
  AuditLogEntry,
  AuthSession,
  BackgroundJob,
  BillingInvoice,
  BillingPlan,
  BillingSubscription,
  CurrencyCode,
  DoubleEntryJournal,
  StoreOrder,
  StoreProduct,
  TeamInvitation,
  TeamMember,
} from '../packages/contracts/src/schemas.ts';

export interface ServerWallet {
  id: string;
  currency: CurrencyCode;
  label: string;
  ibanOrAccount: string;
  balanceMinor: number;
  yieldApr: number;
}

export interface OrganizationRecord {
  slug: string;
  name: string;
  industry: string;
  baseCurrency: CurrencyCode;
}

export interface PlatformStoreState {
  orgs: Record<string, OrganizationRecord>;
  sessions: Record<string, AuthSession>;
  membersByOrg: Record<string, TeamMember[]>;
  invitations: TeamInvitation[];
  wallets: ServerWallet[];
  journals: DoubleEntryJournal[];
  approvals: ApprovalRequest[];
  auditLogs: AuditLogEntry[];
  jobs: BackgroundJob[];
  plans: BillingPlan[];
  subscription: BillingSubscription;
  invoices: BillingInvoice[];
  products: StoreProduct[];
  orders: StoreOrder[];
  newsletterSubscribers: Array<{ email: string; source: string; topic?: string; subscribedAt: string }>;
  idempotencyCache: Record<string, { status: number; body: unknown }>;
}

const STORE_FILE = path.resolve('/tmp/ravfina-platform-store-v1.json');

export const FX_RATES_TO_USD: Record<CurrencyCode, number> = {
  USD: 1.0,
  EUR: 1.0842,
  GBP: 1.2715,
  CAD: 0.7285,
  JPY: 0.00662,
};

function buildInitialState(): PlatformStoreState {
  return {
    orgs: {
      'vanguard-robotics': {
        slug: 'vanguard-robotics',
        name: 'Vanguard Robotics Corp.',
        industry: 'Hardware & Robotics',
        baseCurrency: 'USD',
      },
      'northstar-cloud': {
        slug: 'northstar-cloud',
        name: 'Northstar Cloud Systems',
        industry: 'Enterprise SaaS',
        baseCurrency: 'USD',
      },
      'helion-bio': {
        slug: 'helion-bio',
        name: 'Helion BioLogistics',
        industry: 'Cross-Border Biotech',
        baseCurrency: 'EUR',
      },
    },
    sessions: {
      default: {
        sessionId: 'sess-default-vanguard',
        userId: 'usr-elena',
        email: 'elena@vanguardrobotics.com',
        name: 'Elena Rostova',
        orgSlug: 'vanguard-robotics',
        orgName: 'Vanguard Robotics Corp.',
        role: 'owner',
        authMethod: 'WebAuthn Passkey',
        signedInAt: '2026-11-17T08:15:00.000Z',
      },
    },
    membersByOrg: {
      'vanguard-robotics': [
        {
          id: 'mem-1',
          name: 'Elena Rostova',
          email: 'elena@vanguardrobotics.com',
          role: 'owner',
          department: 'Executive & Finance',
          mfaVerified: true,
          status: 'Active',
          joinedAt: '2025-03-14',
        },
        {
          id: 'mem-2',
          name: 'Marcus Chen',
          email: 'marcus@vanguardrobotics.com',
          role: 'maker',
          department: 'Infrastructure',
          mfaVerified: true,
          status: 'Active',
          joinedAt: '2025-06-02',
        },
        {
          id: 'mem-3',
          name: 'Clara Lindqvist',
          email: 'clara@vanguardrobotics.com',
          role: 'checker',
          department: 'Treasury Operations',
          mfaVerified: true,
          status: 'Active',
          joinedAt: '2025-09-19',
        },
        {
          id: 'mem-4',
          name: 'Devon Brooks',
          email: 'devon@vanguardrobotics.com',
          role: 'controller',
          department: 'Accounting & ERP',
          mfaVerified: true,
          status: 'Active',
          joinedAt: '2026-01-11',
        },
      ],
      'northstar-cloud': [
        {
          id: 'mem-ns-1',
          name: 'David Mercer',
          email: 'david@northstarcloud.io',
          role: 'owner',
          department: 'Finance',
          mfaVerified: true,
          status: 'Active',
          joinedAt: '2025-08-01',
        },
      ],
      'helion-bio': [
        {
          id: 'mem-hb-1',
          name: 'Priya Nair',
          email: 'priya@helionbio.eu',
          role: 'owner',
          department: 'Treasury & EMEA Ops',
          mfaVerified: true,
          status: 'Active',
          joinedAt: '2025-10-12',
        },
      ],
    },
    invitations: [],
    wallets: [
      { id: 'w-usd', currency: 'USD', label: 'Operating Treasury USD', ibanOrAccount: 'ACH •••• 4812', balanceMinor: 248250000, yieldApr: 4.85 },
      { id: 'w-eur', currency: 'EUR', label: 'Frankfurt Clearing EUR', ibanOrAccount: 'DE89 •••• 3104', balanceMinor: 54020000, yieldApr: 3.15 },
      { id: 'w-gbp', currency: 'GBP', label: 'London Clearing GBP', ibanOrAccount: 'GB29 •••• 8820', balanceMinor: 31280000, yieldApr: 4.4 },
      { id: 'w-cad', currency: 'CAD', label: 'Toronto Vendor CAD', ibanOrAccount: 'CA41 •••• 1903', balanceMinor: 18500000, yieldApr: 3.75 },
      { id: 'w-jpy', currency: 'JPY', label: 'Tokyo Supplier JPY', ibanOrAccount: 'JP18 •••• 5509', balanceMinor: 28400000, yieldApr: 0.45 },
    ],
    journals: [
      {
        id: 'jrn-1001',
        idempotencyKey: 'seed-jrn-1001',
        reference: 'JRN-2026-1001',
        description: 'US 90-Day T-Bill Yield Accrual Sweep',
        category: 'treasury' as unknown as 'transfer',
        createdBy: 'Treasury Sweep Engine',
        approvedBy: 'Elena Rostova',
        createdAt: '2026-11-17T06:00:00.000Z',
        legs: [
          { accountCode: '1010', accountName: 'Operating Treasury USD', side: 'debit', amountMinor: 2145000, currency: 'USD' },
          { accountCode: '4120', accountName: 'Treasury Yield Income', side: 'credit', amountMinor: 2145000, currency: 'USD' },
        ],
      },
      {
        id: 'jrn-1002',
        idempotencyKey: 'seed-jrn-1002',
        reference: 'JRN-2026-1002',
        description: 'Frankfurt Supplier FX Settlement (EUR)',
        category: 'fx',
        createdBy: 'Marcus Chen',
        approvedBy: 'Clara Lindqvist',
        createdAt: '2026-11-17T05:15:00.000Z',
        legs: [
          { accountCode: '2110', accountName: 'Accounts Payable EUR', side: 'debit', amountMinor: 1480000, currency: 'EUR' },
          { accountCode: '1020', accountName: 'Frankfurt Clearing EUR', side: 'credit', amountMinor: 1480000, currency: 'EUR' },
        ],
      },
    ],
    approvals: [
      {
        id: 'apr-01',
        orgSlug: 'vanguard-robotics',
        actionType: 'wire_payout',
        summary: 'Keyence Precision KK — Q4 Optical Sensor Settlement',
        amountMinor: 1224700,
        currency: 'USD',
        makerName: 'Marcus Chen',
        makerRole: 'maker',
        checkerName: null,
        status: 'Pending Checker',
        createdAt: '2026-11-17T07:45:00.000Z',
        decidedAt: null,
      },
      {
        id: 'apr-02',
        orgSlug: 'vanguard-robotics',
        actionType: 'fx_transfer',
        summary: 'Rebalance USD to Frankfurt EUR Clearing Reserve',
        amountMinor: 5000000,
        currency: 'USD',
        makerName: 'Devon Brooks',
        makerRole: 'controller',
        checkerName: null,
        status: 'Pending Checker',
        createdAt: '2026-11-17T08:10:00.000Z',
        decidedAt: null,
      },
    ],
    auditLogs: [
      {
        id: 'aud-seed-1',
        auditRef: 'AUD-2026-4910',
        orgSlug: 'vanguard-robotics',
        actor: 'Elena Rostova',
        action: 'Verified Hardware WebAuthn Session',
        target: 'Vanguard Robotics Corp.',
        amountMinor: null,
        currency: null,
        status: 'Verified',
        timestamp: '2026-11-17T08:15:00.000Z',
      },
      {
        id: 'aud-seed-2',
        auditRef: 'AUD-2026-4909',
        orgSlug: 'vanguard-robotics',
        actor: 'Marcus Chen',
        action: 'Submitted Maker Wire Request',
        target: 'Keyence Precision KK',
        amountMinor: 1224700,
        currency: 'USD',
        status: 'Pending Checker',
        timestamp: '2026-11-17T07:45:00.000Z',
      },
    ],
    jobs: [
      {
        id: 'job-101',
        type: 'reconciliation',
        status: 'Completed',
        summary: 'NetSuite SuiteTalk Multi-Currency Close (18 entries matched)',
        createdAt: '2026-11-17T06:20:00.000Z',
        completedAt: '2026-11-17T06:24:12.000Z',
      },
      {
        id: 'job-102',
        type: 'monthly_statement',
        status: 'Queued',
        summary: 'November 2026 FDIC Custody & T-Bill Yield Statement PDF',
        createdAt: '2026-11-17T08:00:00.000Z',
        completedAt: null,
      },
    ],
    plans: [
      {
        id: 'starter_smb',
        name: 'Starter SMB',
        audience: 'For seed startups & lean finance teams',
        monthlyPriceMinor: 0,
        annualPriceMinor: 0,
        currency: 'USD',
        apiRequestsIncluded: 25000,
        seatsIncluded: 5,
        virtualCardsIncluded: 25,
        fxSpreadBps: 35,
        slaLabel: '99.9% Standard SLA',
        highlights: [
          'Multi-currency USD & EUR operating wallets',
          '25 programmable virtual corporate cards',
          '25,000 REST & MCP API calls / month',
          'QuickBooks Online automated ledger sync',
        ],
      },
      {
        id: 'growth_treasury',
        name: 'Growth Treasury',
        audience: 'For scaling Series A–C finance operations',
        monthlyPriceMinor: 29900,
        annualPriceMinor: 24900,
        currency: 'USD',
        apiRequestsIncluded: 500000,
        seatsIncluded: 25,
        virtualCardsIncluded: 250,
        fxSpreadBps: 12,
        slaLabel: '99.95% Priority SLA',
        highlights: [
          'All 5 global currency wallets + 5.12% T-Bill sweep',
          'Maker/Checker dual approvals & FIDO2 enforcement',
          '500,000 REST & MCP API calls / month',
          'NetSuite SuiteTalk & SAP OData bi-directional sync',
        ],
      },
      {
        id: 'enterprise_capital',
        name: 'Enterprise Capital',
        audience: 'For multi-entity global treasury teams',
        monthlyPriceMinor: 99900,
        annualPriceMinor: 84900,
        currency: 'USD',
        apiRequestsIncluded: 5000000,
        seatsIncluded: 100,
        virtualCardsIncluded: 2500,
        fxSpreadBps: 4,
        slaLabel: '99.99% Dedicated SLA',
        highlights: [
          'Custom revolving credit underwriting up to $10M',
          'Dedicated custody accounts & custom webhook queues',
          '5,000,000 REST & MCP API calls / month',
          '24/7 treasury desk & custom ERP schema mapping',
        ],
      },
    ],
    subscription: {
      orgSlug: 'vanguard-robotics',
      planId: 'growth_treasury',
      cadence: 'annual',
      status: 'Active',
      apiCallsThisCycle: 148920,
      apiCallsLimit: 500000,
      seatsUsed: 4,
      seatsLimit: 25,
      nextRenewalAt: '2026-12-01',
    },
    invoices: [
      {
        id: 'inv-2026-11',
        invoiceNumber: 'INV-2026-0041',
        orgSlug: 'vanguard-robotics',
        planName: 'Growth Treasury (Annual)',
        amountMinor: 24900,
        currency: 'USD',
        status: 'Paid',
        issuedAt: '2026-11-01',
      },
      {
        id: 'inv-2026-10',
        invoiceNumber: 'INV-2026-0032',
        orgSlug: 'vanguard-robotics',
        planName: 'Growth Treasury (Annual)',
        amountMinor: 24900,
        currency: 'USD',
        status: 'Paid',
        issuedAt: '2026-10-01',
      },
    ],
    products: [
      {
        id: 'prod-fido-key',
        slug: 'ravfina-fido2-key',
        name: 'Ravfina FIDO2 Hardware Key',
        collection: 'Hardware Security',
        summary: 'Machined anodized aluminum and brushed brass WebAuthn key required for high-value wire dual approvals.',
        specs: 'USB-C + NFC · FIDO2 / U2F · IP68 Sealed',
        imageUrl: '/src/assets/images/store_hardware_key_1794943499511.jpg',
        badge: 'Best Seller',
        currency: 'USD',
        variants: [
          { id: 'var-fido-usbc', label: 'USB-C Single Key', sku: 'RVF-KEY-USBC-01', priceMinor: 7900, inStock: true },
          { id: 'var-fido-quorum', label: 'Dual-Checker Quorum Pack (2×)', sku: 'RVF-KEY-DUO-02', priceMinor: 14500, inStock: true },
          { id: 'var-fido-team5', label: 'Finance Team Pack (5×)', sku: 'RVF-KEY-TEAM-05', priceMinor: 34900, inStock: true },
        ],
      },
      {
        id: 'prod-titanium-card',
        slug: 'titanium-holo-card',
        name: 'Ravfina Titanium Holographic Card',
        collection: 'Payment Instruments',
        summary: 'Laser-etched 18g obsidian titanium corporate card with prismatic security emblem and custom department embossing.',
        specs: '18g Grade-5 Titanium · EMV + Dual-Interface NFC',
        imageUrl: '/src/assets/images/store_titanium_card_1794943500121.jpg',
        badge: 'Holographic Foil',
        currency: 'USD',
        variants: [
          { id: 'var-card-obsidian', label: 'Obsidian + Gold Foil', sku: 'RVF-CRD-OBS-01', priceMinor: 12000, inStock: true },
          { id: 'var-card-kit', label: 'Executive 3-Card Issuance Kit', sku: 'RVF-CRD-KIT-03', priceMinor: 31000, inStock: true },
        ],
      },
      {
        id: 'prod-ledger-folio',
        slug: 'archival-ledger-folio',
        name: 'Archival Leather Ledger Folio & Brass Pen',
        collection: 'Executive Goods',
        summary: 'Full-grain Italian calfskin boardroom folio paired with a lathe-turned solid brass pen and numbered audit sheets.',
        specs: 'Full-Grain Leather · C36000 Solid Brass · A5',
        imageUrl: '/src/assets/images/store_ledger_folio_1794943500066.jpg',
        badge: 'Limited Batch',
        currency: 'USD',
        variants: [
          { id: 'var-folio-std', label: 'Folio + Brass Pen Set', sku: 'RVF-FOL-SET-01', priceMinor: 19500, inStock: true },
          { id: 'var-folio-refill', label: 'Folio + 3× Archival Refills', sku: 'RVF-FOL-DLX-02', priceMinor: 24000, inStock: true },
        ],
      },
      {
        id: 'prod-monograph-book',
        slug: 'sound-ledger-monograph',
        name: 'The Sound Ledger Monograph (Hardcover)',
        collection: 'Executive Goods',
        summary: '240-page linen-bound print edition of Ravfina Journal Books I–III covering double-entry treasury systems and risk.',
        specs: '240pp Linen Hardcover · Gold Foil Embossed',
        imageUrl: '/src/assets/images/journal_book_cover_1794943501621.jpg',
        currency: 'USD',
        variants: [
          { id: 'var-book-single', label: 'First Edition Hardcover', sku: 'RVF-BOK-001', priceMinor: 6800, inStock: true },
          { id: 'var-book-signed', label: 'Numbered Studio Edition', sku: 'RVF-BOK-NUM', priceMinor: 11000, inStock: true },
        ],
      },
    ],
    orders: [
      {
        id: 'ord-1041',
        orderNumber: 'ORD-1041',
        orgSlug: 'vanguard-robotics',
        customerEmail: 'elena@vanguardrobotics.com',
        shippingName: 'Elena Rostova',
        totalMinor: 29000,
        currency: 'USD',
        status: 'Preparing Shipment',
        createdAt: '2026-11-16T14:22:00.000Z',
        lines: [
          {
            productName: 'Ravfina FIDO2 Hardware Key',
            variantLabel: 'Dual-Checker Quorum Pack (2×)',
            sku: 'RVF-KEY-DUO-02',
            quantity: 2,
            lineTotalMinor: 29000,
          },
        ],
      },
    ],
    newsletterSubscribers: [
      {
        email: 'cfo-digest@vanguardrobotics.com',
        source: 'blog',
        topic: 'Treasury Engineering',
        subscribedAt: '2026-11-15T12:00:00.000Z',
      },
    ],
    idempotencyCache: {},
  };
}

export function loadStore(): PlatformStoreState {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as PlatformStoreState;
      if (parsed && parsed.orgs && parsed.wallets && parsed.plans) {
        return parsed;
      }
    }
  } catch {
    // Fall back to clean seed state if file is unreadable
  }
  const initial = buildInitialState();
  saveStore(initial);
  return initial;
}

export function saveStore(state: PlatformStoreState): void {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Ignore write failure in read-only edge conditions
  }
}
