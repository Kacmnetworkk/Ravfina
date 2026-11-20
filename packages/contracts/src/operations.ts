import { z } from 'zod';
import {
  BillingCheckoutInputSchema,
  CreateInviteInputSchema,
  CreateTransferInputSchema,
  DecideApprovalInputSchema,
  NewsletterSubscribeInputSchema,
  SignInInputSchema,
  StoreCheckoutInputSchema,
} from './schemas.ts';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface ApiOperationDef {
  operationId: string;
  mcpName: string;
  method: HttpMethod;
  path: string;
  tag: 'Auth' | 'Treasury' | 'Teams' | 'Billing' | 'Store' | 'Growth' | 'System';
  summary: string;
  description: string;
  requiresAuth: boolean;
  idempotent: boolean;
  inputSchema?: z.ZodTypeAny;
  exampleBody?: Record<string, unknown>;
}

export const API_OPERATIONS: ApiOperationDef[] = [
  {
    operationId: 'getSystemHealth',
    mcpName: 'ravfina_system_health',
    method: 'GET',
    path: '/api/v1/health',
    tag: 'System',
    summary: 'Check platform & ledger service status',
    description: 'Returns service uptime, API version, AI capability status, and queued job count.',
    requiresAuth: false,
    idempotent: true,
  },
  {
    operationId: 'signInWorkspace',
    mcpName: 'ravfina_auth_signin',
    method: 'POST',
    path: '/api/v1/auth/signin',
    tag: 'Auth',
    summary: 'Sign into a team workspace under /app/[org]',
    description: 'Creates or switches an organization team session with role-based permissions.',
    requiresAuth: false,
    idempotent: false,
    inputSchema: SignInInputSchema,
    exampleBody: {
      email: 'elena@vanguardrobotics.com',
      name: 'Elena Rostova',
      orgSlug: 'vanguard-robotics',
      role: 'owner',
      authMethod: 'WebAuthn Passkey',
    },
  },
  {
    operationId: 'getOrgOverview',
    mcpName: 'ravfina_org_overview',
    method: 'GET',
    path: '/api/v1/orgs/vanguard-robotics/overview',
    tag: 'Treasury',
    summary: 'Fetch workspace ledger, approvals, and team state',
    description: 'Returns double-entry ledger journals, maker/checker approvals, team roster, and audit entries.',
    requiresAuth: true,
    idempotent: true,
  },
  {
    operationId: 'createTreasuryTransfer',
    mcpName: 'ravfina_create_transfer',
    method: 'POST',
    path: '/api/v1/orgs/vanguard-robotics/transfers',
    tag: 'Treasury',
    summary: 'Execute idempotent multi-currency FX transfer',
    description: 'Posts balanced debit/credit ledger legs in integer minor units or routes to checker approval.',
    requiresAuth: true,
    idempotent: true,
    inputSchema: CreateTransferInputSchema,
    exampleBody: {
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      amountMinor: 2500000,
      memo: 'Frankfurt supplier settlement',
      requireDualApproval: false,
    },
  },
  {
    operationId: 'decideApprovalRequest',
    mcpName: 'ravfina_decide_approval',
    method: 'POST',
    path: '/api/v1/orgs/vanguard-robotics/approvals/apr-01/decide',
    tag: 'Treasury',
    summary: 'Approve or reject a maker/checker request',
    description: 'Enforces segregation of duties between maker and checker before releasing funds.',
    requiresAuth: true,
    idempotent: true,
    inputSchema: DecideApprovalInputSchema,
    exampleBody: {
      decision: 'Approved',
      checkerName: 'Elena Rostova',
      checkerRole: 'checker',
      reason: 'Verified against NetSuite PO #4812',
    },
  },
  {
    operationId: 'inviteTeamMember',
    mcpName: 'ravfina_invite_team_member',
    method: 'POST',
    path: '/api/v1/orgs/vanguard-robotics/invitations',
    tag: 'Teams',
    summary: 'Invite a teammate and send Resend invitation email',
    description: 'Generates a single-use team invitation token and dispatches an HTML invitation email via Resend.',
    requiresAuth: true,
    idempotent: false,
    inputSchema: CreateInviteInputSchema,
    exampleBody: {
      email: 'controller@vanguardrobotics.com',
      name: 'Hannah Alvarez',
      role: 'checker',
      department: 'Finance & Controllership',
      personalNote: 'Joining as dual-approval checker for EMEA wires.',
    },
  },
  {
    operationId: 'listBillingPlans',
    mcpName: 'ravfina_list_billing_plans',
    method: 'GET',
    path: '/api/v1/billing/plans',
    tag: 'Billing',
    summary: 'List API & workspace billing plans',
    description: 'Returns pricing tiers in integer minor units with API call and seat quotas.',
    requiresAuth: false,
    idempotent: true,
  },
  {
    operationId: 'checkoutBillingPlan',
    mcpName: 'ravfina_billing_checkout',
    method: 'POST',
    path: '/api/v1/billing/checkout',
    tag: 'Billing',
    summary: 'Upgrade or switch API billing subscription',
    description: 'Idempotently activates a billing plan, creates an invoice, and records a double-entry billing journal.',
    requiresAuth: true,
    idempotent: true,
    inputSchema: BillingCheckoutInputSchema,
    exampleBody: {
      orgSlug: 'vanguard-robotics',
      planId: 'growth_treasury',
      cadence: 'annual',
    },
  },
  {
    operationId: 'listStoreProducts',
    mcpName: 'ravfina_list_store_products',
    method: 'GET',
    path: '/api/v1/store/products',
    tag: 'Store',
    summary: 'List hardware security & executive store catalog',
    description: 'Returns hardware keys, metal cards, and ledger goods with variant SKUs and minor-unit pricing.',
    requiresAuth: false,
    idempotent: true,
  },
  {
    operationId: 'checkoutStoreOrder',
    mcpName: 'ravfina_store_checkout',
    method: 'POST',
    path: '/api/v1/store/orders',
    tag: 'Store',
    summary: 'Place an idempotent Ravfina Store order',
    description: 'Validates variants and stock, calculates minor-unit totals, and creates a confirmed order.',
    requiresAuth: false,
    idempotent: true,
    inputSchema: StoreCheckoutInputSchema,
    exampleBody: {
      orgSlug: 'vanguard-robotics',
      customerEmail: 'ops@vanguardrobotics.com',
      shippingName: 'Marcus Chen',
      items: [
        { productId: 'prod-fido-key', variantId: 'var-fido-usbc', quantity: 2 },
      ],
    },
  },
  {
    operationId: 'subscribeNewsletter',
    mcpName: 'ravfina_subscribe_newsletter',
    method: 'POST',
    path: '/api/v1/newsletter/subscribe',
    tag: 'Growth',
    summary: 'Subscribe to Blog & Spotlight dispatch',
    description: 'Adds a subscriber email from Blog or Spotlight into the newsletter audience.',
    requiresAuth: false,
    idempotent: true,
    inputSchema: NewsletterSubscribeInputSchema,
    exampleBody: {
      email: 'finance-brief@company.com',
      source: 'blog',
      topic: 'Treasury Engineering',
    },
  },
];

function zodToJsonSchema(schema: z.ZodTypeAny | undefined): Record<string, unknown> {
  if (!schema) {
    return { type: 'object', properties: {} };
  }
  // Inspect Zod v4/v3 internals safely
  const def = (schema as unknown as { _def?: Record<string, unknown>; def?: Record<string, unknown> })._def ??
    (schema as unknown as { def?: Record<string, unknown> }).def ?? {};
  const typeName = String(def.typeName ?? def.type ?? '');

  if (typeName === 'ZodDefault' || typeName === 'default' || typeName === 'ZodOptional' || typeName === 'optional') {
    const inner = (def.innerType ?? def.schema) as z.ZodTypeAny | undefined;
    return zodToJsonSchema(inner);
  }
  if (typeName === 'ZodNullable' || typeName === 'nullable') {
    const inner = def.innerType as z.ZodTypeAny | undefined;
    return zodToJsonSchema(inner);
  }
  if (typeName === 'ZodString' || typeName === 'string') {
    return { type: 'string' };
  }
  if (typeName === 'ZodNumber' || typeName === 'number') {
    return { type: 'number' };
  }
  if (typeName === 'ZodBoolean' || typeName === 'boolean') {
    return { type: 'boolean' };
  }
  if (typeName === 'ZodEnum' || typeName === 'enum') {
    const values = (def.values ?? (def.entries ? Object.values(def.entries as Record<string, string>) : [])) as string[];
    return { type: 'string', enum: values };
  }
  if (typeName === 'ZodArray' || typeName === 'array') {
    const itemSchema = (def.type && typeof def.type === 'object' ? def.type : def.element) as z.ZodTypeAny | undefined;
    return { type: 'array', items: zodToJsonSchema(itemSchema) };
  }
  if (typeName === 'ZodObject' || typeName === 'object') {
    const rawShape = typeof def.shape === 'function' ? (def.shape as () => Record<string, z.ZodTypeAny>)() : (def.shape as Record<string, z.ZodTypeAny> | undefined) ?? {};
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, field] of Object.entries(rawShape)) {
      properties[key] = zodToJsonSchema(field);
      const fDef = (field as unknown as { _def?: Record<string, unknown>; def?: Record<string, unknown> })._def ??
        (field as unknown as { def?: Record<string, unknown> }).def ?? {};
      const fType = String(fDef.typeName ?? fDef.type ?? '');
      if (fType !== 'ZodOptional' && fType !== 'optional' && fType !== 'ZodDefault' && fType !== 'default') {
        required.push(key);
      }
    }
    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }
  return { type: 'object' };
}

export function generateOpenApiSpec(serverUrl = 'http://localhost:3000') {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const op of API_OPERATIONS) {
    if (!paths[op.path]) {
      paths[op.path] = {};
    }
    const methodKey = op.method.toLowerCase();
    const parameters: Array<Record<string, unknown>> = [];
    if (op.idempotent && op.method !== 'GET') {
      parameters.push({
        name: 'Idempotency-Key',
        in: 'header',
        required: false,
        description: 'Unique client token guaranteeing safe retries without duplicate ledger postings.',
        schema: { type: 'string' },
      });
    }

    paths[op.path][methodKey] = {
      operationId: op.operationId,
      tags: [op.tag],
      summary: op.summary,
      description: op.description,
      'x-mcp-tool': op.mcpName,
      ...(parameters.length > 0 ? { parameters } : {}),
      ...(op.inputSchema
        ? {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: zodToJsonSchema(op.inputSchema),
                  ...(op.exampleBody ? { example: op.exampleBody } : {}),
                },
              },
            },
          }
        : {}),
      responses: {
        '200': {
          description: 'Successful operation response',
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        '400': {
          description: 'Validation error from shared Zod contract',
        },
      },
    };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Ravfina Platform API',
      version: '1.0.0',
      description:
        'Unified REST, MCP, and OpenAPI specification generated from a single source-of-truth operations list backed by shared Zod contracts.',
    },
    servers: [{ url: serverUrl }],
    paths,
  };
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    httpMethod: HttpMethod;
    httpPath: string;
    operationId: string;
    idempotent: boolean;
  };
}

export function generateMcpTools(): McpToolDefinition[] {
  return API_OPERATIONS.map((op) => ({
    name: op.mcpName,
    description: `${op.summary} — ${op.description}`,
    inputSchema: zodToJsonSchema(op.inputSchema),
    annotations: {
      httpMethod: op.method,
      httpPath: op.path,
      operationId: op.operationId,
      idempotent: op.idempotent,
    },
  }));
}
