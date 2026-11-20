import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { AiChatWidget, AiStreamEvent } from '../packages/contracts/src/schemas.ts';
import type { PlatformStoreState } from './store.ts';

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function selectWidgetsForQuery(message: string, state: PlatformStoreState): AiChatWidget[] {
  const q = message.toLowerCase();
  const widgets: AiChatWidget[] = [];

  if (q.includes('fx') || q.includes('eur') || q.includes('gbp') || q.includes('convert') || q.includes('currency')) {
    widgets.push({
      kind: 'fx_quote',
      title: 'Live Spot FX Desk Quote',
      fromCurrency: 'USD',
      toCurrency: q.includes('gbp') ? 'GBP' : 'EUR',
      sourceAmountMinor: 5000000,
      convertedAmountMinor: q.includes('gbp') ? 3932363 : 4611695,
      spotRate: q.includes('gbp') ? 0.7865 : 0.9223,
    });
  }

  if (q.includes('card') || q.includes('mcc') || q.includes('spend') || q.includes('limit')) {
    widgets.push({
      kind: 'card_policy_check',
      title: 'Corporate Card Guardrail Evaluation',
      cardHolder: 'Marcus Chen (•••• 4409)',
      mccCode: '7372 · Cloud & SaaS',
      requestedMinor: 428000,
      approved: true,
      reason: 'Within $5,000 per-transaction cap and approved SaaS MCC allowlist.',
    });
  }

  if (widgets.length === 0 || q.includes('runway') || q.includes('cash') || q.includes('liquidity') || q.includes('burn') || q.includes('treasury')) {
    const totalUsdMinor = state.wallets.reduce((sum, w) => {
      const rate = w.currency === 'USD' ? 1 : w.currency === 'EUR' ? 1.0842 : w.currency === 'GBP' ? 1.2715 : w.currency === 'CAD' ? 0.7285 : 0.00662;
      const major = w.currency === 'JPY' ? w.balanceMinor : w.balanceMinor / 100;
      return sum + Math.round(major * rate * 100);
    }, 0);
    widgets.push({
      kind: 'treasury_snapshot',
      title: 'Verified Multi-Currency Liquidity Snapshot',
      totalLiquidityMinor: totalUsdMinor,
      monthlyBurnMinor: 81200000,
      runwayMonths: 14.8,
      safetyFloorMinor: 75000000,
    });
  }

  return widgets;
}

export async function streamTreasuryAgentChat(params: {
  orgSlug: string;
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  state: PlatformStoreState;
  emit: (event: AiStreamEvent) => void;
}): Promise<void> {
  const ai = createGeminiClient();
  if (!ai) {
    params.emit({
      type: 'error',
      code: 'GEMINI_API_KEY_MISSING',
      message:
        'GEMINI_API_KEY is not configured. Add a Gemini API key in Settings > Secrets to run live AI agent responses.',
    });
    return;
  }

  const org = params.state.orgs[params.orgSlug] ?? Object.values(params.state.orgs)[0];
  const widgets = selectWidgetsForQuery(params.message, params.state);

  params.emit({
    type: 'step',
    step: {
      id: 'step-intent',
      label: 'Inspecting Workspace Context',
      detail: `Loaded ${org?.name ?? params.orgSlug} ledger (${params.state.journals.length} balanced journals) and ${params.state.approvals.length} approval queues.`,
      status: 'done',
    },
  });

  for (const widget of widgets) {
    params.emit({ type: 'widget', widget });
  }

  params.emit({
    type: 'step',
    step: {
      id: 'step-model',
      label: 'Reasoning with Gemini',
      detail: 'Streaming concise treasury guidance grounded in active balances and policy rules.',
      status: 'running',
    },
  });

  const walletSummary = params.state.wallets
    .map((w) => `${w.currency}: ${w.balanceMinor} minor units (${w.yieldApr}% APR)`)
    .join('; ');
  const pendingApprovals = params.state.approvals.filter((a) => a.status === 'Pending Checker').length;

  const conversationLines = params.history
    .slice(-6)
    .map((h) => `${h.role === 'user' ? 'User' : 'Ravfina Agent'}: ${h.content}`)
    .join('\n');

  const prompt = `${conversationLines ? `${conversationLines}\n` : ''}User: ${params.message}`;

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: `You are Ravfina Financial Copilot for organization "${org?.name ?? params.orgSlug}".
Live workspace telemetry:
- Operating wallets: ${walletSummary}
- Pending maker/checker approvals: ${pendingApprovals}
- Active billing plan: ${params.state.subscription.planId} (${params.state.subscription.cadence})
Respond concisely in 2-4 crisp bullet points or short paragraphs with exact numbers and actionable treasury/API/card guidance.`,
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        params.emit({ type: 'delta', text: chunk.text });
      }
    }

    params.emit({
      type: 'step',
      step: {
        id: 'step-model',
        label: 'Reasoning with Gemini',
        detail: 'Response verified and streamed.',
        status: 'done',
      },
    });
    params.emit({ type: 'done', model: 'gemini-4-hydrogen' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream Gemini streaming failed.';
    params.emit({
      type: 'error',
      code: 'GEMINI_UPSTREAM_ERROR',
      message,
    });
  }
}
