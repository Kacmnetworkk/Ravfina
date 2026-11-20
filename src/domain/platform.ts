import type {
  ApprovalRequest,
  CurrencyCode,
  DoubleEntryJournal,
  LedgerLeg,
  OrgRole,
} from '../../packages/contracts/src/schemas';

export function verifyLedgerBalanced(legs: LedgerLeg[]): boolean {
  if (legs.length < 2) return false;
  const byCurrency = new Map<CurrencyCode, { debits: number; credits: number }>();
  for (const leg of legs) {
    if (!Number.isInteger(leg.amountMinor) || leg.amountMinor <= 0) {
      return false;
    }
    const bucket = byCurrency.get(leg.currency) ?? { debits: 0, credits: 0 };
    if (leg.side === 'debit') bucket.debits += leg.amountMinor;
    else bucket.credits += leg.amountMinor;
    byCurrency.set(leg.currency, bucket);
  }
  for (const { debits, credits } of byCurrency.values()) {
    if (debits !== credits) return false;
  }
  return true;
}

export function createDoubleEntryJournal(params: {
  id: string;
  idempotencyKey?: string | null;
  reference: string;
  description: string;
  category: DoubleEntryJournal['category'];
  createdBy: string;
  approvedBy?: string | null;
  createdAt?: string;
  legs: LedgerLeg[];
}): DoubleEntryJournal {
  if (!verifyLedgerBalanced(params.legs)) {
    throw new Error(
      `Double-entry invariant violation for ${params.reference}: debits must equal credits per currency in positive integer minor units.`,
    );
  }
  return {
    id: params.id,
    idempotencyKey: params.idempotencyKey ?? null,
    reference: params.reference,
    description: params.description,
    category: params.category,
    createdBy: params.createdBy,
    approvedBy: params.approvedBy ?? null,
    createdAt: params.createdAt ?? new Date().toISOString(),
    legs: params.legs,
  };
}

export function canRoleApprove(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'controller' || role === 'checker';
}

export function decideMakerCheckerApproval(
  request: ApprovalRequest,
  decision: 'Approved' | 'Rejected',
  checkerName: string,
  checkerRole: OrgRole,
): { ok: true; updated: ApprovalRequest } | { ok: false; error: string } {
  if (request.status !== 'Pending Checker') {
    return { ok: false, error: `Request ${request.id} is already ${request.status}.` };
  }
  if (!canRoleApprove(checkerRole)) {
    return { ok: false, error: `Role "${checkerRole}" does not have checker approval authority.` };
  }
  if (checkerName.trim().toLowerCase() === request.makerName.trim().toLowerCase()) {
    return {
      ok: false,
      error: 'Maker and Checker must be distinct principals (segregation of duties).',
    };
  }
  return {
    ok: true,
    updated: {
      ...request,
      status: decision,
      checkerName,
      decidedAt: new Date().toISOString(),
    },
  };
}

export interface MdxFrontmatter {
  title: string;
  slug: string;
  date: string;
  topic: string;
  author: string;
  readTime: string;
  summary: string;
  version?: string;
  badge?: string;
}

export type MdxBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'callout'; tone: 'info' | 'amber' | 'emerald'; title: string; body: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string };

export interface ParsedMdxDocument {
  frontmatter: MdxFrontmatter;
  blocks: MdxBlock[];
}

export function parseMdxDocument(raw: string): ParsedMdxDocument {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  const frontmatter: MdxFrontmatter = {
    title: 'Untitled',
    slug: 'untitled',
    date: '2026-11-01',
    topic: 'General',
    author: 'Ravfina Editorial',
    readTime: '4 min read',
    summary: '',
  };

  let body = normalized;
  if (normalized.startsWith('---')) {
    const endIdx = normalized.indexOf('\n---', 3);
    if (endIdx !== -1) {
      const fmRaw = normalized.slice(3, endIdx).trim();
      body = normalized.slice(endIdx + 4).trim();
      for (const line of fmRaw.split('\n')) {
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        const key = line.slice(0, colon).trim() as keyof MdxFrontmatter;
        const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
        if (key in frontmatter || key === 'version' || key === 'badge') {
          frontmatter[key] = val;
        }
      }
    }
  }

  const lines = body.split('\n');
  const blocks: MdxBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim() || 'ts';
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', language, code: codeLines.join('\n') });
      continue;
    }

    if (trimmed.startsWith('<Callout')) {
      const toneMatch = trimmed.match(/tone=["']?(info|amber|emerald)["']?/);
      const titleMatch = trimmed.match(/title=["']([^"']+)["']/);
      const tone = (toneMatch?.[1] as 'info' | 'amber' | 'emerald') ?? 'amber';
      const title = titleMatch?.[1] ?? 'Architecture Note';
      const innerLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('</Callout>')) {
        innerLines.push(lines[i].trim());
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'callout', tone, title, body: innerLines.join(' ') });
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'heading', level: 3, text: trimmed.slice(4).trim() });
      i += 1;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading', level: 2, text: trimmed.slice(3).trim() });
      i += 1;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'heading', level: 1, text: trimmed.slice(2).trim() });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      blocks.push({ type: 'quote', text: trimmed.slice(2).trim() });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2).trim());
        i += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    const paraLines: string[] = [trimmed];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('- ') &&
      !lines[i].trim().startsWith('> ') &&
      !lines[i].trim().startsWith('<Callout')
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  return { frontmatter, blocks };
}

export interface CartItemInput {
  productId: string;
  variantId: string;
  priceMinor: number;
  quantity: number;
}

export function calculateCartTotals(items: CartItemInput[]): {
  itemCount: number;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
} {
  const itemCount = items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
  const subtotalMinor = items.reduce(
    (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.priceMinor),
    0,
  );
  // Free shipping on corporate orders >= $250 (25,000 cents)
  const shippingMinor = subtotalMinor === 0 || subtotalMinor >= 25000 ? 0 : 1800;
  return {
    itemCount,
    subtotalMinor,
    shippingMinor,
    totalMinor: subtotalMinor + shippingMinor,
  };
}

export interface EditorClip {
  id: string;
  trackId: string;
  label: string;
  startSec: number;
  durationSec: number;
  tiltDeg: number;
  hueShiftDeg: number;
  glareStrength: number;
  easing: 'ease-out' | 'spring' | 'linear';
}

export function evaluateTimelineAtTime(
  clips: EditorClip[],
  playheadSec: number,
): {
  tiltDeg: number;
  hueShiftDeg: number;
  glareStrength: number;
  activeLabels: string[];
} {
  let tiltDeg = 0;
  let hueShiftDeg = 0;
  let glareStrength = 0.25;
  const activeLabels: string[] = [];

  for (const clip of clips) {
    const endSec = clip.startSec + clip.durationSec;
    if (playheadSec >= clip.startSec && playheadSec <= endSec) {
      const progress =
        clip.durationSec > 0 ? (playheadSec - clip.startSec) / clip.durationSec : 1;
      const eased =
        clip.easing === 'linear'
          ? progress
          : clip.easing === 'spring'
            ? Math.sin(progress * Math.PI)
            : 1 - Math.pow(1 - progress, 2);
      tiltDeg += clip.tiltDeg * eased;
      hueShiftDeg += clip.hueShiftDeg * progress;
      glareStrength = Math.max(glareStrength, clip.glareStrength * (0.5 + 0.5 * eased));
      activeLabels.push(clip.label);
    }
  }

  return {
    tiltDeg: Math.round(tiltDeg * 10) / 10,
    hueShiftDeg: Math.round(hueShiftDeg),
    glareStrength: Math.min(1, Math.round(glareStrength * 100) / 100),
    activeLabels,
  };
}
