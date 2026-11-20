import { AlertTriangle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { HoloCard } from '../components/HoloCard';
import { PageReveal } from '../components/MotionPrimitives';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';
import { AgentSparkIcon } from '../components/icons/RavfinaIcons';

interface ChatWidget {
  kind: 'treasury_snapshot' | 'fx_quote' | 'card_policy_check';
  title: string;
  metrics: { label: string; value: string }[];
}

interface ChatStep {
  id: string;
  label: string;
  status: 'running' | 'complete';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  steps?: ChatStep[];
  widgets?: ChatWidget[];
  error?: string;
}

const SUGGESTED_PROMPTS = [
  'Summarize USD & EUR liquidity and recommend our 90-day T-Bill cash floor.',
  'Check which pending maker-checker wires or FX variances need Controller approval.',
  'Quote a $150,000 USD to EUR spot rebalance and check card velocity exposure.',
];

export function AiChatPage({ currentPath }: { currentPath: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Connected to Vanguard Robotics live treasury context. Ask about wallet liquidity, maker/checker approvals, FX quotes, or card guardrails.',
      widgets: [
        {
          kind: 'treasury_snapshot',
          title: 'Active Context · Vanguard Robotics',
          metrics: [
            { label: 'Model', value: 'gemini-4-hydrogen' },
            { label: 'Wallets', value: 'USD · EUR · GBP' },
            { label: 'MCP Grounding', value: 'Live Store' },
          ],
        },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);

  const sendPrompt = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || streaming) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: clean,
    };
    const assistantId = `a-${Date.now()}`;
    const placeholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      text: '',
      steps: [],
      widgets: [],
    };

    setMessages((prev) => [...prev, userMsg, placeholder]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/v1/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgSlug: 'vanguard-robotics', prompt: clean }),
      });

      if (!res.body) throw new Error('Streaming response body unavailable.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const rawEvent of events) {
          const dataLine = rawEvent
            .split('\n')
            .find((line) => line.startsWith('data: '));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(6));

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              if (payload.type === 'step') {
                const existing = m.steps ?? [];
                const found = existing.some((s) => s.id === payload.step.id);
                const nextSteps = found
                  ? existing.map((s) => (s.id === payload.step.id ? payload.step : s))
                  : [...existing, payload.step];
                return { ...m, steps: nextSteps };
              }
              if (payload.type === 'widget') {
                return { ...m, widgets: [...(m.widgets ?? []), payload.widget] };
              }
              if (payload.type === 'delta') {
                return { ...m, text: m.text + payload.text };
              }
              if (payload.type === 'error') {
                return { ...m, error: payload.message };
              }
              return m;
            }),
          );
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                error: err instanceof Error ? err.message : 'Streaming connection failed.',
              }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendPrompt(input);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-zinc-950 dark:bg-[#0b0b0c] dark:text-white">
      <SiteHeader currentPath={currentPath} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <PageReveal>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-[#facc15]">
                <AgentSparkIcon className="h-4 w-4" />
                <span>Ravfina AI Treasury Copilot · Streamed Steps &amp; Widgets</span>
              </div>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Real-Time Treasury Agent
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={streaming}
                  onClick={() => void sendPrompt(p)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-left text-xs font-medium text-zinc-800 hover:border-amber-500 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#d4d4d8]"
                >
                  Prompt {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </PageReveal>

        <div className="mt-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <HoloCard
                variant="dashboard"
                intensity="subtle"
                className={`w-full max-w-3xl rounded-2xl border p-5 ${
                  msg.role === 'user'
                    ? 'border-amber-500/60 bg-amber-50/70 dark:border-[#facc15]/40 dark:bg-[#1a1a12]'
                    : 'border-zinc-300 bg-white dark:border-[#1d1d1f] dark:bg-[#111112]'
                }`}
              >
                <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                  {msg.role === 'user' ? 'Treasury Controller' : 'Ravfina Copilot'}
                </div>

                {msg.steps && msg.steps.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-l-2 border-amber-400 pl-3 dark:border-[#facc15]/40">
                    {msg.steps.map((step) => (
                      <div key={step.id} className="flex items-center gap-2 font-mono text-xs">
                        {step.status === 'complete' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600 dark:text-[#facc15]" />
                        )}
                        <span className="text-zinc-700 dark:text-[#d4d4d8]">{step.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.widgets && msg.widgets.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {msg.widgets.map((widget, idx) => (
                      <HoloCard
                        key={idx}
                        variant="product"
                        intensity="subtle"
                        className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]"
                      >
                        <div className="font-mono text-[11px] font-bold uppercase text-amber-800 dark:text-[#facc15]">
                          {widget.title}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {widget.metrics.map((met) => (
                            <div key={met.label}>
                              <div className="text-[11px] text-zinc-500">{met.label}</div>
                              <div className="font-mono text-xs font-semibold tabular-nums">
                                {met.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </HoloCard>
                    ))}
                  </div>
                )}

                {msg.text && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-900 dark:text-[#e4e4e7]">
                    {msg.text}
                  </p>
                )}

                {msg.error && (
                  <div
                    role="alert"
                    className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{msg.error}</span>
                  </div>
                )}
              </HoloCard>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Ravfina Copilot about wallets, FX quotes, card controls, or pending approvals..."
            aria-label="Ask Ravfina AI Treasury Copilot"
            className="min-h-[46px] flex-1 rounded-xl border border-zinc-400 bg-white px-4 py-2.5 text-sm text-zinc-950 focus:border-amber-700 focus:outline-none dark:border-[#2e2e32] dark:bg-[#111112] dark:text-white"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="ravfina-cta-tactile inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-amber-500/70 bg-[#facc15] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#fde047] disabled:opacity-50 dark:border-transparent"
          >
            <Send className="h-4 w-4" />
            <span>{streaming ? 'Streaming...' : 'Send'}</span>
          </button>
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
