import { ShieldCheck } from 'lucide-react';
import { HoloCard } from '../components/HoloCard';
import { PageReveal } from '../components/MotionPrimitives';
import { SiteFooter, SiteHeader, navigateTo } from '../components/SiteChrome';

type LegalDocKey = 'privacy' | 'terms' | 'security';

const LEGAL_DOCS: Record<
  LegalDocKey,
  {
    title: string;
    effectiveDate: string;
    summary: string;
    sections: { heading: string; body: string }[];
  }
> = {
  privacy: {
    title: 'Privacy Policy & Open Banking Data Handling',
    effectiveDate: 'November 15, 2026',
    summary:
      'How Ravfina collects, encrypts, and limits access to Plaid bank telemetry, ERP general ledger records, and corporate identity metadata.',
    sections: [
      {
        heading: '1. Data Minimization & Financial Telemetry',
        body: 'Ravfina accesses read-only bank balances and ERP accounts payable/receivable journals strictly as authorized by an organization Owner or Controller. Credentials are never stored in plaintext.',
      },
      {
        heading: '2. Sub-Processors & Audit Retention',
        body: 'Append-only ledger journals and maker-checker wire audit logs are retained for 7 years to satisfy financial regulatory and external audit standards.',
      },
      {
        heading: '3. Cross-Border Transfers & Deletion Rights',
        body: 'Data subjects and enterprise administrators may export journal records or revoke OAuth/Plaid tokens at any time from /app/[org] Security Controls.',
      },
    ],
  },
  terms: {
    title: 'Master Treasury & Credit Platform Terms',
    effectiveDate: 'November 15, 2026',
    summary:
      'Governing terms for Ravfina multi-currency accounts, automated credit facilities, corporate HoloCard issuance, and metered API subscriptions.',
    sections: [
      {
        heading: '1. Authorized Organization Signers',
        body: 'Organizations designate Owner, Controller, Maker, and Checker roles. Transfers exceeding threshold guardrails require independent Checker authorization.',
      },
      {
        heading: '2. Credit Facilities & Auto-Drawdown Guardrails',
        body: 'Automated drawdowns execute exclusively when projected USD operating balances breach controller-defined cash floors and available facility capacity permits.',
      },
      {
        heading: '3. API Rate Quotas & Idempotency Guarantees',
        body: 'Money-moving REST and MCP endpoints enforce mandatory Idempotency-Key deduplication to protect customers against network retry duplication.',
      },
    ],
  },
  security: {
    title: 'SOC 2 Type II & Hardware Cryptography Disclosure',
    effectiveDate: 'November 15, 2026',
    summary:
      'Architectural security overview covering WebAuthn hardware keys, integer minor-unit ledgers, PCI-DSS Level 1 card rails, and HMAC webhooks.',
    sections: [
      {
        heading: '1. Hardware-Enforced Authentication',
        body: 'Privileged treasury operations support FIDO2 WebAuthn hardware keys and scoped bearer API tokens with instant revocation.',
      },
      {
        heading: '2. Cryptographic Ledger Invariants',
        body: 'Every settlement entry requires balanced debit and credit legs verified prior to commit, paired with tamper-evident audit reference IDs.',
      },
      {
        heading: '3. Responsible Disclosure',
        body: 'Security researchers can report findings directly to security@ravfina.com for 24-hour triage.',
      },
    ],
  },
};

export function LegalPage({ currentPath }: { currentPath: string }) {
  const segment = currentPath.split('/legal/')[1]?.split('/')[0] ?? 'privacy';
  const activeKey: LegalDocKey =
    segment === 'terms' || segment === 'security' ? segment : 'privacy';
  const doc = LEGAL_DOCS[activeKey];

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      <SiteHeader currentPath={currentPath} />

      <main className="mx-auto max-w-5xl px-6 py-14">
        <PageReveal>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                <ShieldCheck className="h-4 w-4" />
                <span>Ravfina Legal &amp; Regulatory Governance</span>
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
                {doc.title}
              </h1>
              <p className="mt-1 font-mono text-xs text-zinc-600 dark:text-[#88888b]">
                Effective Date: {doc.effectiveDate}
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-zinc-300 bg-white p-1 dark:border-[#1d1d1f] dark:bg-[#111112]">
              {(['privacy', 'terms', 'security'] as LegalDocKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => navigateTo(`/legal/${key}`)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                    activeKey === key
                      ? 'bg-zinc-950 text-white dark:bg-[#1d1d1f] dark:text-[#facc15]'
                      : 'text-zinc-600 hover:text-zinc-950 dark:text-[#88888b] dark:hover:text-white'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </PageReveal>

        <HoloCard
          variant="editorial"
          intensity="subtle"
          className="mt-8 rounded-2xl border border-zinc-300 bg-white p-8 dark:border-[#1d1d1f] dark:bg-[#111112]"
        >
          <p className="text-base leading-relaxed text-zinc-700 dark:text-[#d4d4d8]">
            {doc.summary}
          </p>

          <div className="mt-8 space-y-6 border-t border-zinc-200 pt-6 dark:border-[#1d1d1f]">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-lg font-semibold text-zinc-950 dark:text-white">
                  {section.heading}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-[#a1a1aa]">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </HoloCard>
      </main>

      <SiteFooter />
    </div>
  );
}
