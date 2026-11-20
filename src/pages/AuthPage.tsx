import { CheckCircle2, KeyRound, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { HoloCard, HoloCardLayer } from '../components/HoloCard';
import { PageReveal } from '../components/MotionPrimitives';
import { SiteFooter, SiteHeader, navigateTo } from '../components/SiteChrome';
import { TeamOrbitalIcon } from '../components/icons/RavfinaIcons';

const PRESET_ORGS = [
  { slug: 'vanguard-robotics', name: 'Vanguard Robotics Inc.', sector: 'Autonomous Hardware' },
  { slug: 'northstar-cloud', name: 'Northstar Cloud Systems', sector: 'Enterprise SaaS' },
  { slug: 'helion-bio', name: 'Helion BioLabs', sector: 'Cross-Border Biotech' },
];

export function AuthPage({ currentPath }: { currentPath: string }) {
  const [email, setEmail] = useState('elena@vanguardrobotics.com');
  const [name, setName] = useState('Elena Vance');
  const [orgSlug, setOrgSlug] = useState('vanguard-robotics');
  const [role, setRole] = useState<'Owner' | 'Controller' | 'Maker' | 'Checker'>('Controller');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = new URLSearchParams(window.location.search).get('invite');
    if (token) {
      void (async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/v1/invitations/${encodeURIComponent(token)}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
          });
          const data = await res.json();
          if (res.ok && data.member) {
            setMessage(
              `Invitation accepted! Joined ${data.invitation.orgSlug} as ${data.member.role}. Redirecting...`,
            );
            setTimeout(() => navigateTo(`/app/${data.invitation.orgSlug}`), 900);
          } else {
            setMessage(data.error || 'Invitation token invalid or expired.');
          }
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'Unable to accept invitation.');
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          orgSlug,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessage(`Signed in to /app/${data.org.slug} as ${data.member.role}.`);
      navigateTo(`/app/${data.org.slug}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      <SiteHeader currentPath={currentPath} />

      <main className="mx-auto max-w-5xl px-6 py-14">
        <PageReveal>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                <TeamOrbitalIcon className="h-4 w-4" />
                <span>Team-First Treasury Auth</span>
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                Sign in or switch organization workspaces.
              </h1>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-[#a1a1aa]">
                Authentication in Ravfina is built natively around multi-org team roles
                (Owner, Controller, Maker, Checker) with hardware WebAuthn posture and one-click
                Resend invitation acceptance.
              </p>

              <div className="space-y-3">
                <div className="font-mono text-xs font-bold uppercase text-zinc-500">
                  Quick-Switch Organizations
                </div>
                {PRESET_ORGS.map((o) => (
                  <HoloCard
                    key={o.slug}
                    as="button"
                    type="button"
                    variant="dashboard"
                    intensity="subtle"
                    onClick={() => setOrgSlug(o.slug)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
                      orgSlug === o.slug
                        ? 'border-amber-500 bg-white dark:border-[#facc15]/60 dark:bg-[#141416]'
                        : 'border-zinc-300 bg-white dark:border-[#1d1d1f] dark:bg-[#111112]'
                    }`}
                  >
                    <div>
                      <div className="font-display text-sm font-bold">{o.name}</div>
                      <div className="font-mono text-xs text-zinc-500">
                        /app/{o.slug} · {o.sector}
                      </div>
                    </div>
                    {orgSlug === o.slug && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </HoloCard>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <HoloCard
                variant="product"
                intensity="subtle"
                className="rounded-2xl border border-zinc-300 bg-white p-8 dark:border-[#1d1d1f] dark:bg-[#111112]"
              >
                <HoloCardLayer depth={12}>
                  <div className="flex items-center gap-2 font-display text-lg font-bold">
                    <KeyRound className="h-4 w-4 text-amber-800 dark:text-[#facc15]" />
                    <span>Enter Organization Workspace</span>
                  </div>
                </HoloCardLayer>

                <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="auth-name" className="block text-xs font-medium">
                        Full Name
                      </label>
                      <input
                        id="auth-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-400 bg-white px-3.5 py-2.5 text-sm text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="auth-email" className="block text-xs font-medium">
                        Work Email
                      </label>
                      <input
                        id="auth-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-400 bg-white px-3.5 py-2.5 text-sm text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="auth-org" className="block text-xs font-medium">
                        Organization Slug (`/app/[org]`)
                      </label>
                      <input
                        id="auth-org"
                        type="text"
                        required
                        value={orgSlug}
                        onChange={(e) =>
                          setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-400 bg-white px-3.5 py-2.5 font-mono text-sm text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="auth-role" className="block text-xs font-medium">
                        Session Role (RBAC)
                      </label>
                      <select
                        id="auth-role"
                        value={role}
                        onChange={(e) =>
                          setRole(e.target.value as 'Owner' | 'Controller' | 'Maker' | 'Checker')
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-400 bg-white px-3.5 py-2.5 text-sm text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
                      >
                        <option value="Owner">Owner (Full Admin)</option>
                        <option value="Controller">Controller (Checker + Ledger)</option>
                        <option value="Maker">Maker (Propose Wires)</option>
                        <option value="Checker">Checker (Dual-Sign Wires)</option>
                      </select>
                    </div>
                  </div>

                  {message && (
                    <div
                      role="status"
                      className="rounded-xl border border-emerald-400 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                    >
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="ravfina-cta-tactile inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-amber-500/70 bg-[#facc15] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#fde047] dark:border-transparent"
                  >
                    <Users className="h-4 w-4" />
                    {loading ? 'Provisioning Session...' : `Open /app/${orgSlug || 'vanguard-robotics'}`}
                  </button>
                </form>
              </HoloCard>
            </div>
          </div>
        </PageReveal>
      </main>

      <SiteFooter />
    </div>
  );
}
