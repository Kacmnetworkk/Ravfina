import { CheckCircle2, Eye, Mail, Send, ShieldCheck, Users, X, XCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { formatMinorUnits } from '../../domain/formatters';
import { HoloCard, HoloCardLayer } from '../HoloCard';
import { ViewStateShell } from '../MotionPrimitives';
import { TeamOrbitalIcon } from '../icons/RavfinaIcons';

interface TeamMemberDto {
  id: string;
  orgSlug: string;
  name: string;
  email: string;
  role: 'Owner' | 'FinanceAdmin' | 'Controller' | 'Maker' | 'Checker' | 'Viewer';
  mfaEnforced: boolean;
  status: string;
  joinedAt: string;
}

interface InvitationDto {
  id: string;
  orgSlug: string;
  email: string;
  role: string;
  token: string;
  status: string;
  provider: string;
  resendMessageId?: string;
  htmlPreview: string;
  createdAt: string;
}

interface LedgerJournalDto {
  id: string;
  idempotencyKey: string;
  memo: string;
  createdAt: string;
  legs: {
    accountId: string;
    accountLabel: string;
    direction: 'DEBIT' | 'CREDIT';
    amountMinor: number;
    currency: string;
  }[];
}

interface ApprovalDto {
  id: string;
  action: string;
  amountMinor: number;
  currency: string;
  toAccount: string;
  memo: string;
  makerId: string;
  makerName: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  checkerName?: string;
  createdAt: string;
}

export function TeamsLedgerView({ orgSlug }: { orgSlug: string }) {
  const [members, setMembers] = useState<TeamMemberDto[]>([]);
  const [invitations, setInvitations] = useState<InvitationDto[]>([]);
  const [journals, setJournals] = useState<LedgerJournalDto[]>([]);
  const [approvals, setApprovals] = useState<ApprovalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMemberDto['role']>('Checker');
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<{ subject: string; html: string } | null>(null);

  const [transferTo, setTransferTo] = useState('vendor:aws-reserved-compute');
  const [transferUsd, setTransferUsd] = useState('65000');
  const [transferMemo, setTransferMemo] = useState('Q4 Cloud Settlement');
  const [transferMsg, setTransferMsg] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamsRes, overviewRes] = await Promise.all([
        fetch(`/api/v1/orgs/${encodeURIComponent(orgSlug)}/teams`),
        fetch(`/api/v1/orgs/${encodeURIComponent(orgSlug)}/overview`),
      ]);
      if (!teamsRes.ok || !overviewRes.ok) {
        throw new Error('Unable to load organization teams & ledger state.');
      }
      const teamsJson = await teamsRes.json();
      const overviewJson = await overviewRes.json();
      setMembers(teamsJson.members ?? []);
      setInvitations(teamsJson.invitations ?? []);
      setJournals(overviewJson.journals ?? []);
      setApprovals(overviewJson.approvals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug]);

  const handleInviteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteFeedback(null);
    try {
      const res = await fetch(`/api/v1/orgs/${encodeURIComponent(orgSlug)}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          inviterName: 'Elena Vance',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setInviteFeedback(
        `Invitation queued via ${data.deliveryStatus}. Accept token: ${data.invitation?.token}`,
      );
      setInviteEmail('');
      await loadAll();
    } catch (err) {
      setInviteFeedback(err instanceof Error ? err.message : 'Invitation failed.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: TeamMemberDto['role']) => {
    await fetch(
      `/api/v1/orgs/${encodeURIComponent(orgSlug)}/members/${encodeURIComponent(memberId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      },
    );
    await loadAll();
  };

  const handleCreateTransfer = async (e: FormEvent) => {
    e.preventDefault();
    setTransferMsg(null);
    const amountMinor = Math.round((Number(transferUsd) || 0) * 100);
    const res = await fetch(`/api/v1/orgs/${encodeURIComponent(orgSlug)}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `idem-ui-${Date.now()}`,
      },
      body: JSON.stringify({
        fromWalletId: 'wal-usd-01',
        toAccount: transferTo,
        amountMinor,
        currency: 'USD',
        memo: transferMemo,
        idempotencyKey: `idem-ui-${Date.now()}`,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setTransferMsg(data.error || 'Transfer failed.');
      return;
    }
    setTransferMsg(
      data.status === 'pending_approval'
        ? `Transfer > $50k routed to Maker/Checker Queue (${data.approval?.id}).`
        : `Settled balanced double-entry journal ${data.journal?.id}.`,
    );
    await loadAll();
  };

  const decideApproval = async (approvalId: string, decision: 'Approved' | 'Rejected') => {
    const checker = members.find((m) => m.role === 'Checker' || m.role === 'Controller') ?? members[0];
    await fetch(
      `/api/v1/orgs/${encodeURIComponent(orgSlug)}/approvals/${encodeURIComponent(approvalId)}/decide`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          checkerId: checker?.id ?? 'mem-2',
          checkerName: checker?.name ?? 'Marcus Chen',
        }),
      },
    );
    await loadAll();
  };

  return (
    <ViewStateShell loading={loading} error={error} onRetry={loadAll}>
      <div className="space-y-6">
        {/* Teams Header & Resend Invitation Composer */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <HoloCard
            variant="dashboard"
            intensity="subtle"
            className="rounded-2xl border border-zinc-300 bg-white p-6 lg:col-span-7 dark:border-[#1d1d1f] dark:bg-[#111112]"
          >
            <HoloCardLayer depth={10}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TeamOrbitalIcon className="h-4 w-4 text-amber-800 dark:text-[#facc15]" />
                  <h2 className="font-display text-base font-semibold">
                    Organization Team &amp; RBAC ({members.length})
                  </h2>
                </div>
                <span className="font-mono text-xs text-zinc-500">/app/{orgSlug}</span>
              </div>
            </HoloCardLayer>

            <div className="mt-4 divide-y divide-zinc-200 dark:divide-[#1d1d1f]">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-zinc-950 dark:text-white">{m.name}</div>
                    <div className="font-mono text-zinc-500">
                      {m.email} · {m.mfaEnforced ? 'WebAuthn Enforced' : 'TOTP'}
                    </div>
                  </div>
                  <select
                    aria-label={`Role for ${m.name}`}
                    value={m.role}
                    onChange={(e) =>
                      void handleRoleChange(m.id, e.target.value as TeamMemberDto['role'])
                    }
                    className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 font-mono text-xs text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
                  >
                    <option value="Owner">Owner</option>
                    <option value="FinanceAdmin">FinanceAdmin</option>
                    <option value="Controller">Controller</option>
                    <option value="Maker">Maker</option>
                    <option value="Checker">Checker</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
              ))}
            </div>
          </HoloCard>

          {/* Resend Invitation Form */}
          <HoloCard
            variant="product"
            intensity="subtle"
            className="rounded-2xl border border-amber-400 bg-gradient-to-br from-amber-50/70 to-white p-6 lg:col-span-5 dark:border-[#facc15]/30 dark:from-[#1a1a12] dark:to-[#111112]"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-[#facc15]">
              <Mail className="h-4 w-4" />
              <span>Invite Member via Resend Email</span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-700 dark:text-[#a1a1aa]">
              Sends an HTML invitation via Resend API when configured, or records a live inspectable
              email template in the outbox below.
            </p>

            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor="invite-email" className="block text-xs font-medium">
                  Teammate Email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="auditor@vanguardrobotics.com"
                  className="mt-1 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2 text-xs text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="invite-role" className="block text-xs font-medium">
                  Assigned Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamMemberDto['role'])}
                  className="mt-1 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2 text-xs text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
                >
                  <option value="Checker">Checker (Dual-Wire Approval)</option>
                  <option value="Maker">Maker (Propose Transfers)</option>
                  <option value="Controller">Controller</option>
                  <option value="Viewer">Viewer (Read-Only)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={inviting}
                className="ravfina-cta-tactile inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent"
              >
                <Send className="h-3.5 w-3.5" />
                {inviting ? 'Dispatching Resend Email...' : 'Send Team Invitation'}
              </button>
            </form>

            {inviteFeedback && (
              <div
                role="status"
                className="mt-3 rounded-lg border border-emerald-400 bg-emerald-50 p-2.5 text-xs text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200"
              >
                {inviteFeedback}
              </div>
            )}
          </HoloCard>
        </div>

        {/* Invitation Outbox with Resend HTML Preview */}
        <HoloCard
          variant="dashboard"
          intensity="subtle"
          className="rounded-2xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]"
        >
          <div className="flex items-center gap-2 font-display text-base font-semibold">
            <Users className="h-4 w-4 text-amber-800 dark:text-[#facc15]" />
            <span>Resend Invitation Outbox ({invitations.length})</span>
          </div>
          <div className="mt-3 divide-y divide-zinc-200 dark:divide-[#1d1d1f]">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-zinc-950 dark:text-white">
                    {inv.email} · Role: {inv.role}
                  </div>
                  <div className="font-mono text-zinc-500">
                    {inv.status} · Token: {inv.token} · /auth?invite={inv.token}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewHtml({
                      subject: `You're invited to join ${orgSlug} on Ravfina`,
                      html: inv.htmlPreview,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-semibold hover:border-amber-500 dark:border-[#2e2e32] dark:bg-[#0b0b0c]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview Resend HTML Email
                </button>
              </div>
            ))}
          </div>
        </HoloCard>

        {/* Double-Entry Ledger Transfer & Maker/Checker Queue */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <HoloCard
            variant="dashboard"
            intensity="subtle"
            className="rounded-2xl border border-zinc-300 bg-white p-6 lg:col-span-5 dark:border-[#1d1d1f] dark:bg-[#111112]"
          >
            <h3 className="font-display text-base font-semibold">
              Propose Double-Entry Wire Transfer
            </h3>
            <p className="mt-1 text-xs text-zinc-600 dark:text-[#88888b]">
              Transfers above $50,000 automatically enter the Maker/Checker dual-approval queue.
            </p>
            <form onSubmit={handleCreateTransfer} className="mt-4 space-y-3">
              <div>
                <label htmlFor="tx-to" className="block text-xs font-medium">
                  Counterparty Account
                </label>
                <input
                  id="tx-to"
                  type="text"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2 font-mono text-xs text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="tx-amt" className="block text-xs font-medium">
                  Amount (USD)
                </label>
                <input
                  id="tx-amt"
                  type="number"
                  min={1}
                  value={transferUsd}
                  onChange={(e) => setTransferUsd(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2 font-mono text-xs tabular-nums text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="tx-memo" className="block text-xs font-medium">
                  Journal Memo
                </label>
                <input
                  id="tx-memo"
                  type="text"
                  value={transferMemo}
                  onChange={(e) => setTransferMemo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-400 bg-white px-3 py-2 text-xs text-zinc-950 dark:border-[#2e2e32] dark:bg-[#0b0b0c] dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="ravfina-cta-tactile w-full rounded-xl border border-amber-500/70 bg-[#facc15] px-4 py-2 text-xs font-bold text-black hover:bg-[#fde047] dark:border-transparent"
              >
                Post Idempotent Transfer
              </button>
              {transferMsg && (
                <div className="rounded-lg border border-amber-400 bg-amber-50 p-2.5 text-xs text-amber-950 dark:border-[#facc15]/40 dark:bg-[#1a1a12] dark:text-[#fde047]">
                  {transferMsg}
                </div>
              )}
            </form>
          </HoloCard>

          <HoloCard
            variant="dashboard"
            intensity="subtle"
            className="rounded-2xl border border-zinc-300 bg-white p-6 lg:col-span-7 dark:border-[#1d1d1f] dark:bg-[#111112]"
          >
            <div className="flex items-center gap-2 font-display text-base font-semibold">
              <ShieldCheck className="h-4 w-4 text-amber-800 dark:text-[#facc15]" />
              <span>Maker / Checker Approvals ({approvals.length})</span>
            </div>

            <div className="mt-4 space-y-3">
              {approvals.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs dark:border-[#1d1d1f] dark:bg-[#0b0b0c]"
                >
                  <div>
                    <div className="font-semibold text-zinc-950 dark:text-white">
                      {app.memo} · {formatMinorUnits(app.amountMinor, app.currency)}
                    </div>
                    <div className="mt-0.5 font-mono text-zinc-500">
                      Maker: {app.makerName} → {app.toAccount} · Status: {app.status}
                    </div>
                  </div>
                  {app.status === 'Pending' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void decideApproval(app.id, 'Approved')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void decideApproval(app.id, 'Rejected')}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-400 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {app.status} {app.checkerName ? `by ${app.checkerName}` : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-[#1d1d1f]">
              <div className="font-mono text-xs font-bold uppercase text-zinc-500">
                Recent Balanced Double-Entry Journals ({journals.length})
              </div>
              <div className="mt-2 space-y-2">
                {journals.slice(0, 3).map((j) => (
                  <div
                    key={j.id}
                    className="rounded-lg border border-zinc-200 p-3 font-mono text-[11px] dark:border-[#1d1d1f]"
                  >
                    <div className="flex justify-between font-bold text-zinc-950 dark:text-white">
                      <span>{j.memo}</span>
                      <span className="text-amber-800 dark:text-[#facc15]">{j.id}</span>
                    </div>
                    <div className="mt-1 text-zinc-600 dark:text-[#88888b]">
                      {j.legs
                        .map(
                          (l) =>
                            `${l.direction} ${l.accountLabel} (${formatMinorUnits(l.amountMinor, l.currency)})`,
                        )
                        .join(' | ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </HoloCard>
        </div>
      </div>

      {previewHtml && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Resend HTML Invitation Preview"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewHtml(null);
          }}
          className="animate-ravfina-backdrop-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="animate-ravfina-panel-enter w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-2xl dark:border-[#1d1d1f] dark:bg-[#111112]">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5 dark:border-[#1d1d1f]">
              <div className="font-mono text-xs font-bold text-amber-800 dark:text-[#facc15]">
                RESEND EMAIL TEMPLATE PREVIEW · {previewHtml.subject}
              </div>
              <button
                type="button"
                onClick={() => setPreviewHtml(null)}
                className="rounded-lg p-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe
              title="Resend Email HTML Preview"
              srcDoc={previewHtml.html}
              className="h-[440px] w-full bg-zinc-100"
            />
          </div>
        </div>
      )}
    </ViewStateShell>
  );
}
