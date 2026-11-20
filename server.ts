import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  API_OPERATIONS,
  BillingCheckoutInputSchema,
  CreateInviteInputSchema,
  CreateTransferInputSchema,
  DecideApprovalInputSchema,
  NewsletterSubscribeInputSchema,
  SignInInputSchema,
  StoreCheckoutInputSchema,
  UpdateMemberRoleInputSchema,
  generateMcpTools,
  generateOpenApiSpec,
} from './packages/contracts/src/index.ts';
import { streamTreasuryAgentChat } from './server/gemini.ts';
import { dispatchResendInviteEmail } from './server/resend.ts';
import { FX_RATES_TO_USD, loadStore, saveStore } from './server/store.ts';
import { AiChatRequestSchema } from './packages/contracts/src/schemas.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json({ limit: '1mb' }));

// Track API usage for Billing metering
app.use('/api/v1', (_req, _res, next) => {
  const state = loadStore();
  state.subscription.apiCallsThisCycle += 1;
  saveStore(state);
  next();
});

function getAppUrl(req: express.Request): string {
  return process.env.APP_URL?.trim() || `${req.protocol}://${req.get('host')}`;
}

app.get('/api/v1/health', (_req, res) => {
  const state = loadStore();
  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
  );
  const hasResendKey = Boolean(process.env.RESEND_API_KEY);

  res.json({
    ok: true,
    service: 'ravfina-platform-api',
    version: '1.0.0',
    operationsCount: API_OPERATIONS.length,
    queuedJobs: state.jobs.filter((j) => j.status === 'Queued').length,
    capabilities: {
      geminiStreaming: hasGeminiKey,
      resendEmail: hasResendKey,
    },
    timestamp: new Date().toISOString(),
  });
});

// Unified OpenAPI 3.1 + MCP Endpoints generated from single API_OPERATIONS registry
app.get('/api/v1/openapi.json', (req, res) => {
  res.json(generateOpenApiSpec(getAppUrl(req)));
});

app.get('/api/v1/mcp/tools', (_req, res) => {
  res.json({ tools: generateMcpTools() });
});

app.post('/api/v1/mcp', async (req, res) => {
  const { id = null, method, params } = (req.body ?? {}) as {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: Record<string, unknown>;
  };

  if (method === 'initialize') {
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'ravfina-mcp-server', version: '1.0.0' },
        capabilities: { tools: {} },
      },
    });
    return;
  }

  if (method === 'tools/list') {
    res.json({
      jsonrpc: '2.0',
      id,
      result: { tools: generateMcpTools() },
    });
    return;
  }

  if (method === 'tools/call') {
    const toolName = String(params?.name ?? '');
    const args = (params?.arguments as Record<string, unknown> | undefined) ?? {};
    const op = API_OPERATIONS.find((o) => o.mcpName === toolName);
    if (!op) {
      res.status(404).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unknown MCP tool: ${toolName}` },
      });
      return;
    }

    try {
      const localUrl = `http://127.0.0.1:${PORT}${op.path}`;
      const fetchRes = await fetch(localUrl, {
        method: op.method,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `mcp-${crypto.randomUUID()}`,
        },
        ...(op.method !== 'GET' ? { body: JSON.stringify(args) } : {}),
      });
      const data = await fetchRes.json();
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          isError: !fetchRes.ok,
        },
      });
    } catch (err) {
      res.status(500).json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : 'MCP execution failed',
        },
      });
    }
    return;
  }

  res.status(400).json({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Unsupported MCP method: ${method}` },
  });
});

// Auth & Team Workspace Session
app.get('/api/v1/auth/session', (_req, res) => {
  const state = loadStore();
  res.json({
    session: state.sessions.default ?? null,
    orgs: Object.values(state.orgs),
  });
});

app.post('/api/v1/auth/signin', (req, res) => {
  const parsed = SignInInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid sign-in payload' });
    return;
  }

  const state = loadStore();
  const { email, name, orgSlug, role, authMethod } = parsed.data;
  if (!state.orgs[orgSlug]) {
    const prettyName = orgSlug
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
    state.orgs[orgSlug] = {
      slug: orgSlug,
      name: prettyName,
      industry: 'Technology & Treasury',
      baseCurrency: 'USD',
    };
    state.membersByOrg[orgSlug] = [
      {
        id: `mem-${crypto.randomUUID().slice(0, 8)}`,
        name,
        email,
        role,
        department: 'Executive & Finance',
        mfaVerified: true,
        status: 'Active',
        joinedAt: new Date().toISOString().slice(0, 10),
      },
    ];
  } else {
    const members = state.membersByOrg[orgSlug] ?? [];
    if (!members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      members.push({
        id: `mem-${crypto.randomUUID().slice(0, 8)}`,
        name,
        email,
        role,
        department: 'Finance',
        mfaVerified: true,
        status: 'Active',
        joinedAt: new Date().toISOString().slice(0, 10),
      });
      state.membersByOrg[orgSlug] = members;
    }
  }

  const org = state.orgs[orgSlug];
  const session = {
    sessionId: `sess-${crypto.randomUUID().slice(0, 10)}`,
    userId: `usr-${crypto.randomUUID().slice(0, 8)}`,
    email,
    name,
    orgSlug: org.slug,
    orgName: org.name,
    role,
    authMethod,
    signedInAt: new Date().toISOString(),
  };
  state.sessions.default = session;

  state.auditLogs.unshift({
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    auditRef: `AUD-2026-${Math.floor(5000 + Math.random() * 4000)}`,
    orgSlug: org.slug,
    actor: name,
    action: `Signed in via ${authMethod}`,
    target: org.name,
    amountMinor: null,
    currency: null,
    status: 'Authenticated',
    timestamp: new Date().toISOString(),
  });

  saveStore(state);
  res.json({ session, org });
});

app.post('/api/v1/auth/signout', (_req, res) => {
  const state = loadStore();
  delete state.sessions.default;
  saveStore(state);
  res.json({ ok: true });
});

// Organization Overview (Ledger, Approvals, Teams, Audit, Jobs)
app.get('/api/v1/orgs/:org/overview', (req, res) => {
  const state = loadStore();
  const orgSlug = req.params.org;
  const org = state.orgs[orgSlug] ?? {
    slug: orgSlug,
    name: orgSlug
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' '),
    industry: 'Corporate Treasury',
    baseCurrency: 'USD' as const,
  };
  if (!state.orgs[orgSlug]) {
    state.orgs[orgSlug] = org;
    state.membersByOrg[orgSlug] = state.membersByOrg[orgSlug] ?? [];
    saveStore(state);
  }

  res.json({
    org,
    wallets: state.wallets,
    journals: state.journals,
    approvals: state.approvals.filter((a) => a.orgSlug === orgSlug || orgSlug === 'vanguard-robotics'),
    members: state.membersByOrg[orgSlug] ?? [],
    invitations: state.invitations.filter((inv) => inv.orgSlug === orgSlug),
    auditLogs: state.auditLogs.slice(0, 25),
    jobs: state.jobs.slice(0, 12),
    subscription: state.subscription,
  });
});

// Idempotent Double-Entry Money Transfer
app.post('/api/v1/orgs/:org/transfers', (req, res) => {
  const state = loadStore();
  const idempKey = req.header('Idempotency-Key')?.trim();
  if (idempKey && state.idempotencyCache[`transfer:${idempKey}`]) {
    const cached = state.idempotencyCache[`transfer:${idempKey}`];
    res.status(cached.status).json({ ...(cached.body as Record<string, unknown>), idempotentReplay: true });
    return;
  }

  const parsed = CreateTransferInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid transfer request' });
    return;
  }

  const { fromCurrency, toCurrency, amountMinor, memo, requireDualApproval } = parsed.data;
  if (fromCurrency === toCurrency) {
    res.status(400).json({ error: 'Source and destination currency must differ.' });
    return;
  }

  const srcWallet = state.wallets.find((w) => w.currency === fromCurrency);
  const dstWallet = state.wallets.find((w) => w.currency === toCurrency);
  if (!srcWallet || !dstWallet) {
    res.status(404).json({ error: 'Requested wallet currency not found.' });
    return;
  }
  if (srcWallet.balanceMinor < amountMinor) {
    res.status(400).json({ error: `Insufficient ${fromCurrency} balance for transfer.` });
    return;
  }

  const actor = state.sessions.default?.name ?? 'Marcus Chen';
  const orgSlug = req.params.org;

  if (requireDualApproval) {
    const approval: ApprovalRequest = {
      id: `apr-${crypto.randomUUID().slice(0, 6)}`,
      orgSlug,
      actionType: 'fx_transfer',
      summary: `${memo} (${fromCurrency} → ${toCurrency})`,
      amountMinor,
      currency: fromCurrency,
      makerName: actor,
      makerRole: state.sessions.default?.role ?? 'maker',
      checkerName: null,
      status: 'Pending Checker',
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };
    state.approvals.unshift(approval);
    state.auditLogs.unshift({
      id: `aud-${crypto.randomUUID().slice(0, 8)}`,
      auditRef: `AUD-2026-${Math.floor(5000 + Math.random() * 4000)}`,
      orgSlug,
      actor,
      action: 'Queued Maker/Checker FX Transfer',
      target: `${fromCurrency} → ${toCurrency}`,
      amountMinor,
      currency: fromCurrency,
      status: 'Pending Checker',
      timestamp: new Date().toISOString(),
    });
    const body = { mode: 'queued_approval', approval };
    if (idempKey) state.idempotencyCache[`transfer:${idempKey}`] = { status: 200, body };
    saveStore(state);
    res.json(body);
    return;
  }

  const srcMajor = fromCurrency === 'JPY' ? amountMinor : amountMinor / 100;
  const usdMajor = srcMajor * FX_RATES_TO_USD[fromCurrency];
  const dstMajor = usdMajor / FX_RATES_TO_USD[toCurrency];
  const creditedMinor = toCurrency === 'JPY' ? Math.round(dstMajor) : Math.round(dstMajor * 100);

  srcWallet.balanceMinor -= amountMinor;
  dstWallet.balanceMinor += creditedMinor;

  const journal = {
    id: `jrn-${crypto.randomUUID().slice(0, 8)}`,
    idempotencyKey: idempKey ?? null,
    reference: `JRN-2026-${Math.floor(1100 + Math.random() * 8800)}`,
    description: `${memo} (${fromCurrency} → ${toCurrency})`,
    category: 'fx' as const,
    createdBy: actor,
    approvedBy: actor,
    createdAt: new Date().toISOString(),
    legs: [
      {
        accountCode: `1010-${fromCurrency}`,
        accountName: `${fromCurrency} FX Clearing`,
        side: 'debit' as const,
        amountMinor,
        currency: fromCurrency,
      },
      {
        accountCode: `1000-${fromCurrency}`,
        accountName: srcWallet.label,
        side: 'credit' as const,
        amountMinor,
        currency: fromCurrency,
      },
      {
        accountCode: `1000-${toCurrency}`,
        accountName: dstWallet.label,
        side: 'debit' as const,
        amountMinor: creditedMinor,
        currency: toCurrency,
      },
      {
        accountCode: `1010-${toCurrency}`,
        accountName: `${toCurrency} FX Clearing`,
        side: 'credit' as const,
        amountMinor: creditedMinor,
        currency: toCurrency,
      },
    ],
  };
  state.journals.unshift(journal);
  state.auditLogs.unshift({
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    auditRef: `AUD-2026-${Math.floor(5000 + Math.random() * 4000)}`,
    orgSlug,
    actor,
    action: `Settled FX Transfer ${fromCurrency} → ${toCurrency}`,
    target: memo,
    amountMinor,
    currency: fromCurrency,
    status: 'Settled',
    timestamp: new Date().toISOString(),
  });

  const body = { mode: 'settled', journal, wallets: state.wallets, creditedMinor };
  if (idempKey) state.idempotencyCache[`transfer:${idempKey}`] = { status: 200, body };
  saveStore(state);
  res.json(body);
});

// Maker / Checker Approval Decision
app.post('/api/v1/orgs/:org/approvals/:id/decide', (req, res) => {
  const parsed = DecideApprovalInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid approval payload' });
    return;
  }

  const state = loadStore();
  const target = state.approvals.find((a) => a.id === req.params.id);
  if (!target) {
    res.status(404).json({ error: 'Approval request not found.' });
    return;
  }
  if (target.status !== 'Pending Checker') {
    res.status(409).json({ error: `Request is already ${target.status}.` });
    return;
  }

  const { decision, checkerName, checkerRole } = parsed.data;
  if (!['owner', 'admin', 'controller', 'checker'].includes(checkerRole)) {
    res.status(403).json({ error: `Role "${checkerRole}" lacks checker approval permissions.` });
    return;
  }
  if (checkerName.trim().toLowerCase() === target.makerName.trim().toLowerCase()) {
    res.status(403).json({ error: 'Segregation of duties: maker cannot self-approve.' });
    return;
  }

  target.status = decision;
  target.checkerName = checkerName;
  target.decidedAt = new Date().toISOString();

  if (decision === 'Approved') {
    state.journals.unshift({
      id: `jrn-${crypto.randomUUID().slice(0, 8)}`,
      idempotencyKey: `apr-${target.id}`,
      reference: `JRN-2026-${Math.floor(1100 + Math.random() * 8800)}`,
      description: `Checker Released: ${target.summary}`,
      category: 'transfer',
      createdBy: target.makerName,
      approvedBy: checkerName,
      createdAt: new Date().toISOString(),
      legs: [
        {
          accountCode: '2110',
          accountName: 'Approved Disbursement Clearing',
          side: 'debit',
          amountMinor: target.amountMinor,
          currency: target.currency,
        },
        {
          accountCode: '1010',
          accountName: `Operating Treasury ${target.currency}`,
          side: 'credit',
          amountMinor: target.amountMinor,
          currency: target.currency,
        },
      ],
    });
  }

  state.auditLogs.unshift({
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    auditRef: `AUD-2026-${Math.floor(5000 + Math.random() * 4000)}`,
    orgSlug: req.params.org,
    actor: checkerName,
    action: `${decision} Maker Request (${target.makerName})`,
    target: target.summary,
    amountMinor: target.amountMinor,
    currency: target.currency,
    status: decision,
    timestamp: new Date().toISOString(),
  });

  saveStore(state);
  res.json({ approval: target, journals: state.journals });
});

// Teams & Resend Invitation Email
app.get('/api/v1/orgs/:org/teams', (req, res) => {
  const state = loadStore();
  res.json({
    members: state.membersByOrg[req.params.org] ?? [],
    invitations: state.invitations.filter((inv) => inv.orgSlug === req.params.org),
  });
});

app.patch('/api/v1/orgs/:org/members/:memberId', (req, res) => {
  const parsed = UpdateMemberRoleInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid role' });
    return;
  }
  const state = loadStore();
  const members = state.membersByOrg[req.params.org] ?? [];
  const member = members.find((m) => m.id === req.params.memberId);
  if (!member) {
    res.status(404).json({ error: 'Team member not found.' });
    return;
  }
  member.role = parsed.data.role;
  saveStore(state);
  res.json({ member });
});

app.post('/api/v1/orgs/:org/invitations', async (req, res) => {
  const parsed = CreateInviteInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid invitation payload' });
    return;
  }

  const state = loadStore();
  const orgSlug = req.params.org;
  const org = state.orgs[orgSlug] ?? {
    slug: orgSlug,
    name: orgSlug,
    industry: 'Corporate Treasury',
    baseCurrency: 'USD' as const,
  };
  const inviterName = state.sessions.default?.name ?? 'Elena Rostova';
  const token = `inv_${crypto.randomBytes(8).toString('hex')}`;
  const acceptUrl = `${getAppUrl(req)}/auth?invite=${token}`;

  const emailResult = await dispatchResendInviteEmail({
    orgName: org.name,
    orgSlug: org.slug,
    recipientName: parsed.data.name,
    recipientEmail: parsed.data.email,
    inviterName,
    role: parsed.data.role,
    department: parsed.data.department,
    acceptUrl,
    personalNote: parsed.data.personalNote,
  });

  const invitation: TeamInvitation = {
    id: `tinv-${crypto.randomUUID().slice(0, 8)}`,
    token,
    orgSlug: org.slug,
    orgName: org.name,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
    department: parsed.data.department,
    invitedBy: inviterName,
    status: 'Pending',
    emailDeliveryStatus: emailResult.deliveryStatus,
    emailId: emailResult.emailId,
    htmlPreview: emailResult.htmlPreview,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
  };

  state.invitations.unshift(invitation);
  state.jobs.unshift({
    id: `job-${crypto.randomUUID().slice(0, 6)}`,
    type: 'invitation_email',
    status: emailResult.deliveryStatus === 'Failed' ? 'Failed' : 'Completed',
    summary: `Resend team invite → ${parsed.data.email} (${emailResult.deliveryStatus})`,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });
  state.auditLogs.unshift({
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    auditRef: `AUD-2026-${Math.floor(5000 + Math.random() * 4000)}`,
    orgSlug: org.slug,
    actor: inviterName,
    action: `Invited ${parsed.data.email} as ${parsed.data.role}`,
    target: 'Resend Invitation Dispatch',
    amountMinor: null,
    currency: null,
    status: emailResult.deliveryStatus,
    timestamp: new Date().toISOString(),
  });

  saveStore(state);
  res.json({ invitation, acceptUrl });
});

app.post('/api/v1/invitations/:token/accept', (req, res) => {
  const state = loadStore();
  const inv = state.invitations.find((i) => i.token === req.params.token);
  if (!inv) {
    res.status(404).json({ error: 'Invitation token not found or expired.' });
    return;
  }
  inv.status = 'Accepted';
  const members = state.membersByOrg[inv.orgSlug] ?? [];
  if (!members.some((m) => m.email.toLowerCase() === inv.email.toLowerCase())) {
    members.push({
      id: `mem-${crypto.randomUUID().slice(0, 8)}`,
      name: inv.name,
      email: inv.email,
      role: inv.role,
      department: inv.department,
      mfaVerified: true,
      status: 'Active',
      joinedAt: new Date().toISOString().slice(0, 10),
    });
    state.membersByOrg[inv.orgSlug] = members;
  }

  const session: AuthSession = {
    sessionId: `sess-${crypto.randomUUID().slice(0, 10)}`,
    userId: `usr-${crypto.randomUUID().slice(0, 8)}`,
    email: inv.email,
    name: inv.name,
    orgSlug: inv.orgSlug,
    orgName: inv.orgName,
    role: inv.role,
    authMethod: 'Team Invitation Token',
    signedInAt: new Date().toISOString(),
  };
  state.sessions.default = session;
  saveStore(state);
  res.json({ session, invitation: inv });
});

// Billing (built into the API)
app.get('/api/v1/billing/plans', (_req, res) => {
  const state = loadStore();
  res.json({
    plans: state.plans,
    subscription: state.subscription,
    invoices: state.invoices,
  });
});

app.get('/api/v1/billing/subscription', (_req, res) => {
  const state = loadStore();
  res.json({ subscription: state.subscription, invoices: state.invoices });
});

app.post('/api/v1/billing/checkout', (req, res) => {
  const state = loadStore();
  const idempKey = req.header('Idempotency-Key')?.trim();
  if (idempKey && state.idempotencyCache[`billing:${idempKey}`]) {
    const cached = state.idempotencyCache[`billing:${idempKey}`];
    res.status(cached.status).json({ ...(cached.body as Record<string, unknown>), idempotentReplay: true });
    return;
  }

  const parsed = BillingCheckoutInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid billing checkout payload' });
    return;
  }

  const plan = state.plans.find((p) => p.id === parsed.data.planId);
  if (!plan) {
    res.status(404).json({ error: 'Billing plan not found.' });
    return;
  }

  const amountMinor =
    parsed.data.cadence === 'annual' ? plan.annualPriceMinor : plan.monthlyPriceMinor;
  state.subscription = {
    ...state.subscription,
    orgSlug: parsed.data.orgSlug,
    planId: plan.id,
    cadence: parsed.data.cadence,
    status: 'Active',
    apiCallsLimit: plan.apiRequestsIncluded,
    seatsLimit: plan.seatsIncluded,
    nextRenewalAt: '2026-12-17',
  };

  const invoice: BillingInvoice = {
    id: `inv-${crypto.randomUUID().slice(0, 8)}`,
    invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 8900)}`,
    orgSlug: parsed.data.orgSlug,
    planName: `${plan.name} (${parsed.data.cadence === 'annual' ? 'Annual' : 'Monthly'})`,
    amountMinor,
    currency: 'USD',
    status: 'Paid',
    issuedAt: new Date().toISOString().slice(0, 10),
  };
  state.invoices.unshift(invoice);

  if (amountMinor > 0) {
    state.journals.unshift({
      id: `jrn-${crypto.randomUUID().slice(0, 8)}`,
      idempotencyKey: idempKey ?? null,
      reference: `JRN-BILL-${Math.floor(100 + Math.random() * 899)}`,
      description: `API Subscription Settlement — ${invoice.planName}`,
      category: 'billing',
      createdBy: state.sessions.default?.name ?? 'Billing API',
      approvedBy: 'Billing Engine',
      createdAt: new Date().toISOString(),
      legs: [
        { accountCode: '6410', accountName: 'Platform API Subscription Expense', side: 'debit', amountMinor, currency: 'USD' },
        { accountCode: '1010', accountName: 'Operating Treasury USD', side: 'credit', amountMinor, currency: 'USD' },
      ],
    });
  }

  const body = { subscription: state.subscription, invoice };
  if (idempKey) state.idempotencyCache[`billing:${idempKey}`] = { status: 200, body };
  saveStore(state);
  res.json(body);
});

// Store Catalog & Orders
app.get('/api/v1/store/products', (_req, res) => {
  const state = loadStore();
  res.json({ products: state.products, orders: state.orders.slice(0, 10) });
});

app.post('/api/v1/store/orders', (req, res) => {
  const state = loadStore();
  const idempKey = req.header('Idempotency-Key')?.trim();
  if (idempKey && state.idempotencyCache[`store:${idempKey}`]) {
    const cached = state.idempotencyCache[`store:${idempKey}`];
    res.status(cached.status).json({ ...(cached.body as Record<string, unknown>), idempotentReplay: true });
    return;
  }

  const parsed = StoreCheckoutInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid order payload' });
    return;
  }

  const lines: StoreOrder['lines'] = [];
  let subtotalMinor = 0;

  for (const item of parsed.data.items) {
    const product = state.products.find((p) => p.id === item.productId);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant) {
      res.status(400).json({ error: `Invalid product or variant: ${item.productId}/${item.variantId}` });
      return;
    }
    const lineTotalMinor = variant.priceMinor * item.quantity;
    subtotalMinor += lineTotalMinor;
    lines.push({
      productName: product.name,
      variantLabel: variant.label,
      sku: variant.sku,
      quantity: item.quantity,
      lineTotalMinor,
    });
  }

  const shippingMinor = subtotalMinor >= 25000 ? 0 : 1800;
  const totalMinor = subtotalMinor + shippingMinor;

  const order: StoreOrder = {
    id: `ord-${crypto.randomUUID().slice(0, 8)}`,
    orderNumber: `ORD-${Math.floor(1050 + Math.random() * 8900)}`,
    orgSlug: parsed.data.orgSlug,
    customerEmail: parsed.data.customerEmail,
    shippingName: parsed.data.shippingName,
    totalMinor,
    currency: 'USD',
    status: 'Confirmed',
    createdAt: new Date().toISOString(),
    lines,
  };
  state.orders.unshift(order);

  const body = { order, shippingMinor };
  if (idempKey) state.idempotencyCache[`store:${idempKey}`] = { status: 200, body };
  saveStore(state);
  res.json(body);
});

// Newsletter (Blog & Spotlight)
app.post('/api/v1/newsletter/subscribe', (req, res) => {
  const parsed = NewsletterSubscribeInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Enter a valid email address' });
    return;
  }
  const state = loadStore();
  const exists = state.newsletterSubscribers.some(
    (s) => s.email.toLowerCase() === parsed.data.email.toLowerCase(),
  );
  if (!exists) {
    state.newsletterSubscribers.unshift({
      email: parsed.data.email,
      source: parsed.data.source,
      topic: parsed.data.topic,
      subscribedAt: new Date().toISOString(),
    });
    saveStore(state);
  }
  res.json({
    ok: true,
    alreadySubscribed: exists,
    subscriberCount: state.newsletterSubscribers.length,
  });
});

// AI Agent Chat (Real Server-Side @google/genai Streaming via SSE)
app.post('/api/v1/ai/chat/stream', async (req, res) => {
  const parsed = AiChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid chat payload' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const state = loadStore();
  await streamTreasuryAgentChat({
    orgSlug: parsed.data.orgSlug,
    message: parsed.data.message,
    history: parsed.data.history,
    state,
    emit: (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
  });

  res.end();
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // Ensure server listens cleanly even in test mode
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ravfina server listening on http://localhost:${PORT}`);
  });
}

if (fs.existsSync(path.resolve(process.cwd(), 'package.json'))) {
  startServer().catch((err) => {
    console.error('Failed to start Ravfina server:', err);
    process.exit(1);
  });
}
