import type { ReactNode } from 'react';
import { parseMdxDocument, type MdxBlock } from '../domain/platform';
import { HoloCard } from './HoloCard';

function renderInlineFormatting(text: string): ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.86em] text-zinc-900 dark:border-[#2e2e32] dark:bg-[#1a1a1d] dark:text-[#fde047]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-zinc-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function renderBlock(block: MdxBlock, index: number) {
  switch (block.type) {
    case 'h1':
      return (
        <h1
          key={index}
          className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white"
        >
          {block.text}
        </h1>
      );
    case 'h2':
      return (
        <h2
          key={index}
          className="mt-7 font-display text-xl font-semibold tracking-tight text-zinc-950 dark:text-white"
        >
          {block.text}
        </h2>
      );
    case 'h3':
      return (
        <h3
          key={index}
          className="mt-5 font-display text-base font-semibold text-zinc-950 dark:text-white"
        >
          {block.text}
        </h3>
      );
    case 'p':
      return (
        <p key={index} className="text-sm sm:text-base leading-relaxed text-zinc-700 dark:text-[#d4d4d8]">
          {renderInlineFormatting(block.text)}
        </p>
      );
    case 'ul':
      return (
        <ul key={index} className="list-disc space-y-2 pl-5 text-sm sm:text-base text-zinc-700 dark:text-[#d4d4d8]">
          {block.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol key={index} className="list-decimal space-y-2 pl-5 text-sm sm:text-base text-zinc-700 dark:text-[#d4d4d8]">
          {block.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ol>
      );
    case 'code':
      return (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-zinc-300 bg-zinc-950 text-zinc-100 dark:border-[#1d1d1f] dark:bg-[#09090a]"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            <span>{block.lang || 'code'}</span>
            <span>MDX Snippet</span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-amber-200">
            <code>{block.code}</code>
          </pre>
        </div>
      );
    case 'callout': {
      const toneClass =
        block.tone === 'emerald'
          ? 'border-emerald-400 bg-emerald-50/70 dark:border-emerald-500/40 dark:bg-emerald-950/25'
          : 'border-amber-400 bg-amber-50/80 dark:border-[#facc15]/35 dark:bg-[#1a1a12]';
      const titleClass =
        block.tone === 'emerald'
          ? 'text-emerald-900 dark:text-emerald-300'
          : 'text-amber-900 dark:text-[#facc15]';
      return (
        <HoloCard
          key={index}
          variant="editorial"
          intensity="subtle"
          className={`rounded-xl border p-5 ${toneClass}`}
        >
          <div className={`font-display text-xs font-bold uppercase tracking-wider ${titleClass}`}>
            {block.title}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-800 dark:text-[#e4e4e7]">
            {renderInlineFormatting(block.body)}
          </p>
        </HoloCard>
      );
    }
    default:
      return null;
  }
}

export function MdxRenderer({ source }: { source: string }) {
  const parsed = parseMdxDocument(source);
  return <div className="space-y-4">{parsed.blocks.map((block, i) => renderBlock(block, i))}</div>;
}
