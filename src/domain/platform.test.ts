import test from 'node:test';
import assert from 'node:assert/strict';
import {
  API_OPERATIONS,
  generateMcpTools,
  generateOpenApiSpec,
} from '../../packages/contracts/src/operations';
import { formatMinorUnits, toMinorUnits } from './formatters';
import {
  calculateCartTotals,
  createDoubleEntryJournal,
  decideMakerCheckerApproval,
  evaluateTimelineAtTime,
  parseMdxDocument,
  verifyLedgerBalanced,
} from './platform';

test('double-entry ledger enforces balanced debits and credits in integer minor units', () => {
  assert.equal(
    verifyLedgerBalanced([
      { accountCode: '1010', accountName: 'Operating USD', side: 'debit', amountMinor: 250000, currency: 'USD' },
      { accountCode: '2010', accountName: 'FX Clearing', side: 'credit', amountMinor: 250000, currency: 'USD' },
    ]),
    true,
  );

  assert.throws(() =>
    createDoubleEntryJournal({
      id: 'j-bad',
      reference: 'JRN-BAD',
      description: 'Imbalanced entry',
      category: 'transfer',
      createdBy: 'System',
      legs: [
        { accountCode: '1010', accountName: 'Operating USD', side: 'debit', amountMinor: 250000, currency: 'USD' },
        { accountCode: '2010', accountName: 'FX Clearing', side: 'credit', amountMinor: 249999, currency: 'USD' },
      ],
    }),
  );
});

test('maker/checker approval enforces segregation of duties', () => {
  const pending = {
    id: 'apr-1',
    orgSlug: 'vanguard-robotics',
    actionType: 'wire_payout' as const,
    summary: 'EMEA supplier wire',
    amountMinor: 5000000,
    currency: 'USD' as const,
    makerName: 'Marcus Chen',
    makerRole: 'maker' as const,
    checkerName: null,
    status: 'Pending Checker' as const,
    createdAt: '2026-11-17T08:00:00Z',
    decidedAt: null,
  };

  const selfApprove = decideMakerCheckerApproval(pending, 'Approved', 'Marcus Chen', 'checker');
  assert.equal(selfApprove.ok, false);

  const lowRole = decideMakerCheckerApproval(pending, 'Approved', 'Viewer User', 'viewer');
  assert.equal(lowRole.ok, false);

  const valid = decideMakerCheckerApproval(pending, 'Approved', 'Elena Rostova', 'checker');
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.updated.status, 'Approved');
    assert.equal(valid.updated.checkerName, 'Elena Rostova');
  }
});

test('single API_OPERATIONS list generates matching OpenAPI 3.1 paths and MCP tools', () => {
  const spec = generateOpenApiSpec('https://ravfina.test');
  const mcpTools = generateMcpTools();

  assert.equal(spec.openapi, '3.1.0');
  assert.equal(mcpTools.length, API_OPERATIONS.length);
  for (const op of API_OPERATIONS) {
    assert.ok(spec.paths[op.path], `Missing OpenAPI path ${op.path}`);
    assert.ok(
      spec.paths[op.path][op.method.toLowerCase()],
      `Missing OpenAPI method ${op.method} on ${op.path}`,
    );
    const matchingTool = mcpTools.find((t) => t.name === op.mcpName);
    assert.ok(matchingTool, `Missing MCP tool ${op.mcpName}`);
  }
});

test('MDX parser extracts frontmatter, headings, callouts, lists, and fenced code blocks', () => {
  const sampleMdx = `---
title: Double-Entry Ledger Architecture
slug: ledger-architecture
date: 2026-11-12
topic: Engineering
author: Elena Rostova
readTime: 5 min read
summary: How Ravfina stores money in integer minor units.
---

# Ledger Foundations

Ravfina tracks every cent as an integer.

<Callout tone="amber" title="Invariant">
Debits always equal credits per currency.
</Callout>

\`\`\`ts
const cents = 250000;
\`\`\`

- Append-only postings
- Idempotent keys
`;

  const parsed = parseMdxDocument(sampleMdx);
  assert.equal(parsed.frontmatter.title, 'Double-Entry Ledger Architecture');
  assert.equal(parsed.frontmatter.topic, 'Engineering');
  assert.equal(parsed.blocks[0].type, 'heading');
  assert.equal(parsed.blocks[1].type, 'paragraph');
  assert.equal(parsed.blocks[2].type, 'callout');
  assert.equal(parsed.blocks[3].type, 'code');
  assert.equal(parsed.blocks[4].type, 'list');
});

test('minor-unit formatter, store cart math, and timeline evaluation compute exact values', () => {
  assert.equal(toMinorUnits(149.95, 'USD'), 14995);
  assert.equal(formatMinorUnits(14995, 'USD'), '$149.95');
  assert.equal(formatMinorUnits(1850000, 'JPY'), '¥1,850,000');

  const cartSmall = calculateCartTotals([
    { productId: 'p1', variantId: 'v1', priceMinor: 9900, quantity: 1 },
  ]);
  assert.equal(cartSmall.shippingMinor, 1800);
  assert.equal(cartSmall.totalMinor, 11700);

  const cartFreeShip = calculateCartTotals([
    { productId: 'p1', variantId: 'v1', priceMinor: 14900, quantity: 2 },
  ]);
  assert.equal(cartFreeShip.shippingMinor, 0);
  assert.equal(cartFreeShip.totalMinor, 29800);

  const evalMid = evaluateTimelineAtTime(
    [
      {
        id: 'c1',
        trackId: 't1',
        label: 'Foil Sweep',
        startSec: 1,
        durationSec: 2,
        tiltDeg: 12,
        hueShiftDeg: 180,
        glareStrength: 0.9,
        easing: 'linear',
      },
    ],
    2,
  );
  assert.equal(evalMid.tiltDeg, 6);
  assert.equal(evalMid.hueShiftDeg, 90);
  assert.deepEqual(evalMid.activeLabels, ['Foil Sweep']);
});
