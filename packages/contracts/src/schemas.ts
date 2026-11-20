import { z } from 'zod';

export const CurrencyCodeSchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'JPY']);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

export const MoneyMinorUnitsSchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: CurrencyCodeSchema,
});
export type MoneyMinorUnits = z.infer<typeof MoneyMinorUnitsSchema>;

export const OrgRoleSchema = z.enum([
  'owner',
  'admin',
  'controller',
  'maker',
  'checker',
  'viewer',
]);
export type OrgRole = z.infer<typeof OrgRoleSchema>;

export const SignInInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  orgSlug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/, 'Organization slug must use lowercase letters, numbers, or hyphens'),
  role: OrgRoleSchema.default('owner'),
  authMethod: z.enum(['WebAuthn Passkey', 'SAML SSO', 'Magic Link']).default('WebAuthn Passkey'),
});
export type SignInInput = z.infer<typeof SignInInputSchema>;

export const AuthSessionSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  email: z.string().email(),
  name: z.string(),
  orgSlug: z.string(),
  orgName: z.string(),
  role: OrgRoleSchema,
  authMethod: z.string(),
  signedInAt: z.string(),
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const TeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: OrgRoleSchema,
  department: z.string(),
  mfaVerified: z.boolean(),
  status: z.enum(['Active', 'Invited', 'Suspended']),
  joinedAt: z.string(),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const CreateInviteInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  role: OrgRoleSchema,
  department: z.string().min(2).max(60).default('Finance'),
  personalNote: z.string().max(240).optional(),
});
export type CreateInviteInput = z.infer<typeof CreateInviteInputSchema>;

export const TeamInvitationSchema = z.object({
  id: z.string(),
  token: z.string(),
  orgSlug: z.string(),
  orgName: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: OrgRoleSchema,
  department: z.string(),
  invitedBy: z.string(),
  status: z.enum(['Pending', 'Accepted', 'Revoked']),
  emailDeliveryStatus: z.enum(['Delivered via Resend', 'Preview Queued (Resend Key Optional)', 'Failed']),
  emailId: z.string().nullable(),
  htmlPreview: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type TeamInvitation = z.infer<typeof TeamInvitationSchema>;

export const UpdateMemberRoleInputSchema = z.object({
  role: OrgRoleSchema,
});

export const LedgerLegSchema = z.object({
  accountCode: z.string(),
  accountName: z.string(),
  side: z.enum(['debit', 'credit']),
  amountMinor: z.number().int().positive(),
  currency: CurrencyCodeSchema,
});
export type LedgerLeg = z.infer<typeof LedgerLegSchema>;

export const DoubleEntryJournalSchema = z.object({
  id: z.string(),
  idempotencyKey: z.string().nullable(),
  reference: z.string(),
  description: z.string(),
  category: z.enum(['transfer', 'fx', 'card', 'loan', 'billing', 'store']),
  createdBy: z.string(),
  approvedBy: z.string().nullable(),
  createdAt: z.string(),
  legs: z.array(LedgerLegSchema).min(2),
});
export type DoubleEntryJournal = z.infer<typeof DoubleEntryJournalSchema>;

export const CreateTransferInputSchema = z.object({
  fromCurrency: CurrencyCodeSchema,
  toCurrency: CurrencyCodeSchema,
  amountMinor: z.number().int().positive(),
  memo: z.string().min(2).max(120).default('Treasury wallet rebalance'),
  requireDualApproval: z.boolean().default(false),
});
export type CreateTransferInput = z.infer<typeof CreateTransferInputSchema>;

export const ApprovalRequestSchema = z.object({
  id: z.string(),
  orgSlug: z.string(),
  actionType: z.enum(['fx_transfer', 'wire_payout', 'loan_drawdown', 'card_limit_override']),
  summary: z.string(),
  amountMinor: z.number().int().positive(),
  currency: CurrencyCodeSchema,
  makerName: z.string(),
  makerRole: OrgRoleSchema,
  checkerName: z.string().nullable(),
  status: z.enum(['Pending Checker', 'Approved', 'Rejected']),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

export const DecideApprovalInputSchema = z.object({
  decision: z.enum(['Approved', 'Rejected']),
  checkerName: z.string().min(2).max(80).default('Elena Rostova'),
  checkerRole: OrgRoleSchema.default('checker'),
  reason: z.string().max(200).optional(),
});

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  auditRef: z.string(),
  orgSlug: z.string(),
  actor: z.string(),
  action: z.string(),
  target: z.string(),
  amountMinor: z.number().int().nullable(),
  currency: CurrencyCodeSchema.nullable(),
  status: z.string(),
  timestamp: z.string(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export const BackgroundJobSchema = z.object({
  id: z.string(),
  type: z.enum(['reconciliation', 'monthly_statement', 'webhook_delivery', 'invitation_email']),
  status: z.enum(['Queued', 'Running', 'Completed', 'Failed']),
  summary: z.string(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});
export type BackgroundJob = z.infer<typeof BackgroundJobSchema>;

export const BillingPlanIdSchema = z.enum(['starter_smb', 'growth_treasury', 'enterprise_capital']);
export type BillingPlanId = z.infer<typeof BillingPlanIdSchema>;

export const BillingPlanSchema = z.object({
  id: BillingPlanIdSchema,
  name: z.string(),
  audience: z.string(),
  monthlyPriceMinor: z.number().int().nonnegative(),
  annualPriceMinor: z.number().int().nonnegative(),
  currency: CurrencyCodeSchema,
  apiRequestsIncluded: z.number().int().positive(),
  seatsIncluded: z.number().int().positive(),
  virtualCardsIncluded: z.number().int().positive(),
  fxSpreadBps: z.number().int().nonnegative(),
  slaLabel: z.string(),
  highlights: z.array(z.string()),
});
export type BillingPlan = z.infer<typeof BillingPlanSchema>;

export const BillingSubscriptionSchema = z.object({
  orgSlug: z.string(),
  planId: BillingPlanIdSchema,
  cadence: z.enum(['monthly', 'annual']),
  status: z.enum(['Active', 'Trialing', 'Past Due']),
  apiCallsThisCycle: z.number().int().nonnegative(),
  apiCallsLimit: z.number().int().positive(),
  seatsUsed: z.number().int().positive(),
  seatsLimit: z.number().int().positive(),
  nextRenewalAt: z.string(),
});
export type BillingSubscription = z.infer<typeof BillingSubscriptionSchema>;

export const BillingCheckoutInputSchema = z.object({
  orgSlug: z.string().min(2).default('vanguard-robotics'),
  planId: BillingPlanIdSchema,
  cadence: z.enum(['monthly', 'annual']),
});

export const BillingInvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  orgSlug: z.string(),
  planName: z.string(),
  amountMinor: z.number().int().nonnegative(),
  currency: CurrencyCodeSchema,
  status: z.enum(['Paid', 'Open']),
  issuedAt: z.string(),
});
export type BillingInvoice = z.infer<typeof BillingInvoiceSchema>;

export const StoreVariantSchema = z.object({
  id: z.string(),
  label: z.string(),
  sku: z.string(),
  priceMinor: z.number().int().positive(),
  inStock: z.boolean(),
});
export type StoreVariant = z.infer<typeof StoreVariantSchema>;

export const StoreProductSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  collection: z.enum(['Hardware Security', 'Payment Instruments', 'Executive Goods']),
  summary: z.string(),
  specs: z.string(),
  imageUrl: z.string(),
  badge: z.string().optional(),
  currency: CurrencyCodeSchema,
  variants: z.array(StoreVariantSchema).min(1),
});
export type StoreProduct = z.infer<typeof StoreProductSchema>;

export const StoreCheckoutInputSchema = z.object({
  orgSlug: z.string().default('vanguard-robotics'),
  customerEmail: z.string().email(),
  shippingName: z.string().min(2).max(100),
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1),
});

export const StoreOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  orgSlug: z.string(),
  customerEmail: z.string().email(),
  shippingName: z.string(),
  totalMinor: z.number().int().positive(),
  currency: CurrencyCodeSchema,
  status: z.enum(['Confirmed', 'Preparing Shipment']),
  createdAt: z.string(),
  lines: z.array(
    z.object({
      productName: z.string(),
      variantLabel: z.string(),
      sku: z.string(),
      quantity: z.number().int().positive(),
      lineTotalMinor: z.number().int().positive(),
    }),
  ),
});
export type StoreOrder = z.infer<typeof StoreOrderSchema>;

export const NewsletterSubscribeInputSchema = z.object({
  email: z.string().email(),
  source: z.enum(['blog', 'spotlight', 'footer']).default('blog'),
  topic: z.string().max(60).optional(),
});

export const AiChatHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const AiChatRequestSchema = z.object({
  orgSlug: z.string().default('vanguard-robotics'),
  message: z.string().min(1).max(2000),
  history: z.array(AiChatHistoryItemSchema).max(20).default([]),
});

export const AiAgentStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  status: z.enum(['running', 'done']),
});
export type AiAgentStep = z.infer<typeof AiAgentStepSchema>;

export const AiChatWidgetSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('treasury_snapshot'),
    title: z.string(),
    totalLiquidityMinor: z.number().int(),
    monthlyBurnMinor: z.number().int(),
    runwayMonths: z.number(),
    safetyFloorMinor: z.number().int(),
  }),
  z.object({
    kind: z.literal('fx_quote'),
    title: z.string(),
    fromCurrency: CurrencyCodeSchema,
    toCurrency: CurrencyCodeSchema,
    sourceAmountMinor: z.number().int(),
    convertedAmountMinor: z.number().int(),
    spotRate: z.number(),
  }),
  z.object({
    kind: z.literal('card_policy_check'),
    title: z.string(),
    cardHolder: z.string(),
    mccCode: z.string(),
    requestedMinor: z.number().int(),
    approved: z.boolean(),
    reason: z.string(),
  }),
]);
export type AiChatWidget = z.infer<typeof AiChatWidgetSchema>;

export const AiStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('step'), step: AiAgentStepSchema }),
  z.object({ type: z.literal('widget'), widget: AiChatWidgetSchema }),
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({ type: z.literal('done'), model: z.string() }),
  z.object({ type: z.literal('error'), message: z.string(), code: z.string().optional() }),
]);
export type AiStreamEvent = z.infer<typeof AiStreamEventSchema>;
